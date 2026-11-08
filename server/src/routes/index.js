const { Router } = require("express");
const { Op } = require("sequelize");
const { Servico, Cliente, Agendamento, Cupom, Profissional, ProfissionalServico, Bloqueio } = require("../models");
const A = require("../utils/agenda");
const AG = require("../utils/agendamentos");
const { autenticar, somenteAdmin, escopoNegocio, permitir } = require("../middlewares/auth");
const authRoutes = require("./auth");
const adminRoutes = require("./admin");
const agenteRoutes = require("./agente");

const router = Router();

// Erros de regra de negócio viram 400 com a mensagem; o resto vai para o handler geral.
const tratar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    if (e instanceof AG.ErroAgenda) return res.status(e.status || 400).json({ error: e.message, ...e.extra });
    if (e.name === "SequelizeUniqueConstraintError") return res.status(400).json({ error: "Registro duplicado." });
    return next(e);
  }
};

// Rotas públicas / próprias
router.use("/auth", authRoutes);
router.use("/agente", agenteRoutes); // n8n (x-api-key)
router.use("/admin", autenticar, somenteAdmin, adminRoutes);

// Daqui para baixo: usuário logado, dentro de um negócio
router.use(autenticar, escopoNegocio);

const gestao = permitir("gestor");
const recepcao = permitir("gestor", "atendente");
const nid = (req) => req.negocio.id;
// Profissional logado só enxerga a própria agenda
const filtroProfissional = (req) => (req.usuario.papel === "profissional" ? { profissionalId: req.usuario.profissionalId } : {});

// ------------------------------ Negócio ------------------------------
router.get("/negocio", tratar(async (req, res) => res.json(req.negocio)));
router.put("/negocio", gestao, tratar(async (req, res) => {
  const b = req.body || {};
  const d = {};
  ["nome", "horarios", "passoMin", "descontosQuantidade", "descontoMaxAgente", "antecedenciaCancelamentoHoras", "nomeAtendente", "clienteEscolheProfissional", "observacoesAgente", "avisarClienteMudancas"].forEach((k) => {
    if (b[k] !== undefined) d[k] = b[k];
  });
  if (b.telefoneDono !== undefined) d.telefoneDono = A.somenteDigitos(b.telefoneDono) || null;
  // A instância do WhatsApp só o admin altera (ela liga o número ao negócio)
  if (b.instanciaWhatsapp !== undefined && req.usuario.papel === "admin") d.instanciaWhatsapp = String(b.instanciaWhatsapp || "").trim() || null;
  await req.negocio.update(d);
  res.json(req.negocio);
}));

// ---------------------------- Profissionais ----------------------------
const comServicos = { include: [{ model: ProfissionalServico, attributes: ["servicoId", "duracaoMin"] }] };

router.get("/profissionais", tratar(async (req, res) => {
  const where = { negocioId: nid(req) };
  if (req.query.ativos === "true") where.ativo = true;
  res.json(await Profissional.findAll({ where, ...comServicos, order: [["ordem", "ASC"], ["nome", "ASC"]] }));
}));

async function salvarServicosDoProfissional(req, prof, servicos) {
  if (!Array.isArray(servicos)) return;
  const validos = await Servico.findAll({ where: { negocioId: nid(req) }, attributes: ["id"] });
  const ids = new Set(validos.map((s) => s.id));
  await ProfissionalServico.destroy({ where: { profissionalId: prof.id } });
  const linhas = servicos
    .map((s) => (typeof s === "object" ? s : { servicoId: s }))
    .filter((s) => ids.has(Number(s.servicoId)))
    .map((s) => ({ profissionalId: prof.id, servicoId: Number(s.servicoId), duracaoMin: s.duracaoMin ? Number(s.duracaoMin) : null }));
  if (linhas.length) await ProfissionalServico.bulkCreate(linhas);
}

const camposProf = (b) => {
  const d = {};
  ["nome", "apelido", "cor", "ativo", "horarios", "ordem"].forEach((k) => {
    if (b[k] !== undefined) d[k] = b[k];
  });
  if (b.telefone !== undefined) d.telefone = A.somenteDigitos(b.telefone) || null;
  return d;
};

router.post("/profissionais", gestao, tratar(async (req, res) => {
  const d = camposProf(req.body || {});
  if (!d.nome) return res.status(400).json({ error: "Informe o nome do profissional." });
  const p = await Profissional.create({ ...d, negocioId: nid(req) });
  await salvarServicosDoProfissional(req, p, req.body?.servicos);
  res.status(201).json(await Profissional.findByPk(p.id, comServicos));
}));

router.put("/profissionais/:id", gestao, tratar(async (req, res) => {
  const p = await Profissional.findOne({ where: { id: req.params.id, negocioId: nid(req) } });
  if (!p) return res.status(404).json({ error: "Profissional não encontrado." });
  await p.update(camposProf(req.body || {}));
  await salvarServicosDoProfissional(req, p, req.body?.servicos);
  res.json(await Profissional.findByPk(p.id, comServicos));
}));

router.delete("/profissionais/:id", gestao, tratar(async (req, res) => {
  const p = await Profissional.findOne({ where: { id: req.params.id, negocioId: nid(req) } });
  if (!p) return res.status(404).json({ error: "Profissional não encontrado." });
  const futuros = await Agendamento.count({ where: { profissionalId: p.id, data: { [Op.gte]: A.hojeISO() }, status: { [Op.in]: ["agendado", "confirmado"] } } });
  if (futuros > 0) return res.status(400).json({ error: `${p.nome} tem ${futuros} agendamento(s) futuro(s). Remarque-os ou desative o profissional.` });
  const historico = await Agendamento.count({ where: { profissionalId: p.id } });
  if (historico > 0) {
    await p.update({ ativo: false });
    return res.json({ ok: true, desativado: true });
  }
  await ProfissionalServico.destroy({ where: { profissionalId: p.id } });
  await p.destroy();
  res.json({ ok: true });
}));

// ------------------------------ Serviços ------------------------------
router.get("/servicos", tratar(async (req, res) => {
  const where = { negocioId: nid(req) };
  if (req.query.ativos === "true") where.ativo = true;
  res.json(await Servico.findAll({ where, order: [["categoria", "ASC"], ["nome", "ASC"]] }));
}));
router.post("/servicos", gestao, tratar(async (req, res) => {
  const { nome, categoria, descricao, preco, duracaoMin, ativo, profissionais } = req.body || {};
  if (!nome || preco === undefined || !duracaoMin) return res.status(400).json({ error: "Nome, preço e duração são obrigatórios." });
  const s = await Servico.create({ negocioId: nid(req), nome, categoria, descricao, preco, duracaoMin, ativo: ativo !== false });
  // Opcional: já vincular a profissionais
  if (Array.isArray(profissionais) && profissionais.length) {
    const profs = await Profissional.findAll({ where: { negocioId: nid(req), id: profissionais.map(Number) } });
    await ProfissionalServico.bulkCreate(profs.map((p) => ({ profissionalId: p.id, servicoId: s.id })));
  }
  res.status(201).json(s);
}));
router.put("/servicos/:id", gestao, tratar(async (req, res) => {
  const s = await Servico.findOne({ where: { id: req.params.id, negocioId: nid(req) } });
  if (!s) return res.status(404).json({ error: "Serviço não encontrado." });
  const { negocioId, id, ...dados } = req.body || {};
  await s.update(dados);
  res.json(s);
}));
router.delete("/servicos/:id", gestao, tratar(async (req, res) => {
  const s = await Servico.findOne({ where: { id: req.params.id, negocioId: nid(req) } });
  if (!s) return res.status(404).json({ error: "Serviço não encontrado." });
  await ProfissionalServico.destroy({ where: { servicoId: s.id } });
  await s.destroy(); // agendamentos guardam uma cópia do serviço
  res.json({ ok: true });
}));

// ------------------------------ Cupons ------------------------------
router.get("/cupons", gestao, tratar(async (req, res) => res.json(await Cupom.findAll({ where: { negocioId: nid(req) }, order: [["codigo", "ASC"]] }))));
router.post("/cupons", gestao, tratar(async (req, res) => {
  const { codigo, descricao, percentual, ativo, validoAte } = req.body || {};
  if (!codigo || !percentual) return res.status(400).json({ error: "Código e percentual são obrigatórios." });
  res.status(201).json(await Cupom.create({ negocioId: nid(req), codigo: String(codigo).trim().toUpperCase(), descricao, percentual, ativo: ativo !== false, validoAte: validoAte || null }));
}));
router.put("/cupons/:id", gestao, tratar(async (req, res) => {
  const c = await Cupom.findOne({ where: { id: req.params.id, negocioId: nid(req) } });
  if (!c) return res.status(404).json({ error: "Cupom não encontrado." });
  const { negocioId, id, ...dados } = req.body || {};
  if (dados.codigo) dados.codigo = String(dados.codigo).trim().toUpperCase();
  if (dados.validoAte === "") dados.validoAte = null;
  await c.update(dados);
  res.json(c);
}));
router.delete("/cupons/:id", gestao, tratar(async (req, res) => {
  await Cupom.destroy({ where: { id: req.params.id, negocioId: nid(req) } });
  res.json({ ok: true });
}));

// -------------------- Bloqueios (feriados, folgas, férias) --------------------
router.get("/bloqueios", tratar(async (req, res) => {
  const where = { negocioId: nid(req) };
  if (req.query.futuros === "true") where.dataFim = { [Op.gte]: A.hojeISO() };
  res.json(await Bloqueio.findAll({ where, order: [["dataInicio", "ASC"]] }));
}));
router.post("/bloqueios", recepcao, tratar(async (req, res) => {
  const b = req.body || {};
  const dataInicio = A.normalizarData(b.dataInicio);
  const dataFim = A.normalizarData(b.dataFim) || dataInicio;
  if (!dataInicio) return res.status(400).json({ error: "Informe a data." });
  if (dataFim < dataInicio) return res.status(400).json({ error: "A data final é anterior à inicial." });
  const inicio = b.inicio ? A.normalizarHora(b.inicio) : null;
  const fim = b.fim ? A.normalizarHora(b.fim) : null;
  if ((inicio && !fim) || (!inicio && fim) || (inicio && fim && fim <= inicio)) return res.status(400).json({ error: "Informe início e fim válidos, ou deixe os dois vazios para o dia inteiro." });
  let profissionalId = b.profissionalId ? Number(b.profissionalId) : null;
  if (profissionalId && !(await Profissional.findOne({ where: { id: profissionalId, negocioId: nid(req) } }))) profissionalId = null;
  res.status(201).json(await Bloqueio.create({ negocioId: nid(req), profissionalId, dataInicio, dataFim, inicio, fim, motivo: b.motivo || null }));
}));
router.delete("/bloqueios/:id", recepcao, tratar(async (req, res) => {
  await Bloqueio.destroy({ where: { id: req.params.id, negocioId: nid(req) } });
  res.json({ ok: true });
}));

// ------------------------------ Clientes ----------------------------
router.get("/clientes", recepcao, tratar(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const where = { negocioId: nid(req) };
  if (q) where[Op.or] = [{ nome: { [Op.like]: `%${q}%` } }, { telefone: { [Op.like]: `%${A.somenteDigitos(q) || q}%` } }];
  res.json(await Cliente.findAll({ where, order: [["nome", "ASC"]], limit: 50 }));
}));

// ---------------------------- Agendamentos --------------------------
router.get("/agendamentos", tratar(async (req, res) => {
  const where = { negocioId: nid(req), ...filtroProfissional(req) };
  const de = A.normalizarData(req.query.de);
  const ate = A.normalizarData(req.query.ate);
  if (de && ate) where.data = { [Op.between]: [de, ate] };
  else if (de) where.data = { [Op.gte]: de };
  else if (ate) where.data = { [Op.lte]: ate };
  if (req.query.status) where.status = String(req.query.status).split(",");
  if (req.query.profissionalId && !where.profissionalId) where.profissionalId = Number(req.query.profissionalId);
  const q = String(req.query.q || "").trim();
  if (q) where[Op.or] = [{ clienteNome: { [Op.like]: `%${q}%` } }, { telefone: { [Op.like]: `%${A.somenteDigitos(q) || q}%` } }];
  res.json(await Agendamento.findAll({ where, order: [["data", "ASC"], ["inicio", "ASC"]] }));
}));
router.get("/agendamentos/:id", tratar(async (req, res) => {
  const ag = await Agendamento.findOne({ where: { id: req.params.id, negocioId: nid(req), ...filtroProfissional(req) } });
  if (!ag) return res.status(404).json({ error: "Agendamento não encontrado." });
  res.json(ag);
}));
router.post("/agendamentos", recepcao, tratar(async (req, res) => {
  // avisarCliente (padrão true): o cliente recebe a confirmação no WhatsApp
  const avisarCliente = req.body?.avisarCliente !== false;
  res.status(201).json(await AG.criar(req.negocio, { ...req.body, origem: "sistema", profissionalEscolhidoPeloCliente: !!req.body?.profissionalId }, { avisarCliente }));
}));
router.put("/agendamentos/:id", recepcao, tratar(async (req, res) => {
  res.json(await AG.alterar(req.negocio, req.params.id, req.body || {}, { avisarCliente: req.body?.avisarCliente !== false }));
}));
router.patch("/agendamentos/:id/status", tratar(async (req, res) => {
  const { status, motivoCancelamento } = req.body || {};
  const avisarCliente = req.body?.avisarCliente !== false;
  if (req.usuario.papel === "profissional") {
    const ag = await AG.buscar(req.negocio, req.params.id);
    if (ag.profissionalId !== req.usuario.profissionalId) return res.status(403).json({ error: "Este agendamento não é seu." });
    if (!["confirmado", "concluido", "faltou"].includes(status)) return res.status(403).json({ error: "Seu acesso não permite esta ação." });
  }
  if (status === "cancelado") return res.json(await AG.cancelar(req.negocio, req.params.id, motivoCancelamento, { avisarCliente }));
  res.json(await AG.alterar(req.negocio, req.params.id, { status }));
}));
router.delete("/agendamentos/:id", recepcao, tratar(async (req, res) => {
  await AG.remover(req.negocio, req.params.id, { avisarCliente: req.query.avisarCliente !== "false" });
  res.json({ ok: true });
}));

// ------------------------- Agenda / orçamento -----------------------
router.post("/agenda/orcamento", tratar(async (req, res) => {
  const { itens, erros } = await A.resolverServicos(nid(req), req.body?.servicos || []);
  if (erros.length) return res.status(400).json({ error: erros.join(" ") });
  let duracaoTotal;
  if (req.body?.profissionalId) {
    const p = A.acharProfissional(await A.profissionaisDoNegocio(nid(req)), req.body.profissionalId);
    duracaoTotal = p ? A.duracaoPara(p, itens) || undefined : undefined;
  }
  res.json(await A.calcularOrcamento(req.negocio, itens, { ...(req.body || {}), duracaoTotal }));
}));

// GET /agenda/disponibilidade?data=&servicos=1,2&profissionalId=&ignorarId=
router.get("/agenda/disponibilidade", tratar(async (req, res) => {
  const data = A.normalizarData(req.query.data) || A.hojeISO();
  const ids = String(req.query.servicos || "").split(",").filter(Boolean);
  const { itens, erros } = await A.resolverServicos(nid(req), ids);
  if (erros.length) return res.status(400).json({ error: erros.join(" ") });
  if (!itens.length) return res.json({ data, horarios: [], porProfissional: [], aptos: [] });
  const disp = await A.disponibilidade(req.negocio, itens, data, {
    profissional: req.query.profissionalId || undefined,
    ignorarId: req.query.ignorarId || undefined,
  });
  res.json({ data, ...disp });
}));

// Visão do dia por profissional: janelas de trabalho, pausas, bloqueios e agendamentos
router.get("/agenda/dia", tratar(async (req, res) => {
  const data = A.normalizarData(req.query.data) || A.hojeISO();
  const whereProf = { negocioId: nid(req), ativo: true };
  if (req.usuario.papel === "profissional") whereProf.id = req.usuario.profissionalId;
  const profs = await Profissional.findAll({ where: whereProf, order: [["ordem", "ASC"], ["nome", "ASC"]] });
  const bloqueios = await A.bloqueiosDoDia(nid(req), data);
  const ags = await Agendamento.findAll({ where: { negocioId: nid(req), data, ...filtroProfissional(req) }, order: [["inicio", "ASC"]] });
  const dia = A.lerDia(req.negocio.horarios, A.diaSemana(data));
  res.json({
    data,
    negocio: dia ? { abre: dia.abre, fecha: dia.fecha, pausas: dia.pausas } : null,
    profissionais: profs.map((p) => {
      const j = A.janelaProfissional(req.negocio, p, data, bloqueios);
      return {
        id: p.id,
        nome: p.nome,
        cor: p.cor,
        trabalha: !!j,
        abre: j ? A.paraHora(j.abre) : null,
        fecha: j ? A.paraHora(j.fecha) : null,
        indisponivel: j ? j.ocupado.map(([a, b]) => ({ inicio: A.paraHora(a), fim: A.paraHora(b) })) : [],
        agendamentos: ags.filter((a) => a.profissionalId === p.id),
      };
    }),
    bloqueios,
  });
}));

router.get("/agenda/dia-texto", recepcao, tratar(async (req, res) => {
  const data = A.normalizarData(req.query.data) || A.hojeISO();
  res.json({ data, texto: await A.textoAgendaDoDia(req.negocio, data) });
}));

// ----------------------------- Relatórios ---------------------------
router.get("/relatorios/resumo", recepcao, tratar(async (req, res) => {
  const hoje = A.hojeISO();
  const de = A.normalizarData(req.query.de) || `${hoje.slice(0, 8)}01`;
  const fimMes = new Date(Date.UTC(Number(de.slice(0, 4)), Number(de.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const ate = A.normalizarData(req.query.ate) || fimMes;
  const base = { negocioId: nid(req) };
  if (req.query.profissionalId) base.profissionalId = Number(req.query.profissionalId);
  const ags = await Agendamento.findAll({ where: { ...base, data: { [Op.between]: [de, ate] } } });

  const vazio = () => ({ quantidade: 0, previsto: 0, realizado: 0, cancelado: 0, descontos: 0, minutos: 0 });
  const somar = (alvo, a) => {
    const total = Number(a.total);
    if (a.status === "cancelado" || a.status === "faltou") {
      alvo.cancelado = A.arred(alvo.cancelado + total);
      return;
    }
    alvo.quantidade += 1;
    alvo.previsto = A.arred(alvo.previsto + total);
    alvo.descontos = A.arred(alvo.descontos + Number(a.descontoValor));
    alvo.minutos += a.duracaoTotal;
    if (a.status === "concluido") alvo.realizado = A.arred(alvo.realizado + total);
  };

  const porDia = {};
  const porProfissional = {};
  const servicos = {};
  const totais = vazio();
  ags.forEach((a) => {
    porDia[a.data] = porDia[a.data] || { data: a.data, ...vazio() };
    somar(porDia[a.data], a);
    const pn = a.profissionalNome || "—";
    porProfissional[pn] = porProfissional[pn] || { nome: pn, ...vazio() };
    somar(porProfissional[pn], a);
    somar(totais, a);
    if (a.status !== "cancelado" && a.status !== "faltou") {
      a.servicos.forEach((s) => {
        servicos[s.nome] = servicos[s.nome] || { nome: s.nome, quantidade: 0, valor: 0 };
        servicos[s.nome].quantidade += 1;
        servicos[s.nome].valor = A.arred(servicos[s.nome].valor + Number(s.preco));
      });
    }
  });

  const inicioSemana = (() => {
    const d = new Date(`${hoje}T12:00:00-03:00`);
    const dia = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - (dia - 1));
    return d.toISOString().slice(0, 10);
  })();
  const fimSemana = A.somarDias(inicioSemana, 6);
  const inicioMes = `${hoje.slice(0, 8)}01`;
  const fimMesAtual = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const periodo = async (d1, d2) => {
    const alvo = vazio();
    (await Agendamento.findAll({ where: { ...base, data: { [Op.between]: [d1, d2] } } })).forEach((a) => somar(alvo, a));
    return { de: d1, ate: d2, ...alvo };
  };

  res.json({
    de,
    ate,
    totais,
    ticketMedio: totais.quantidade ? A.arred(totais.previsto / totais.quantidade) : 0,
    porDia: Object.values(porDia).sort((a, b) => a.data.localeCompare(b.data)),
    porProfissional: Object.values(porProfissional).sort((a, b) => b.previsto - a.previsto),
    servicosMaisVendidos: Object.values(servicos).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10),
    hoje: await periodo(hoje, hoje),
    semana: await periodo(inicioSemana, fimSemana),
    mes: await periodo(inicioMes, fimMesAtual),
  });
}));

module.exports = router;