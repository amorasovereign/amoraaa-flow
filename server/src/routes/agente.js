// Rotas usadas pelo agente de WhatsApp no n8n.
// Exigem o header x-api-key = N8N_API_KEY e identificam o negócio pela
// instância da Evolution (header x-instancia, ou "instancia" na query/corpo).
const crypto = require("crypto");
const { Router } = require("express");
const { Op } = require("sequelize");
const { Servico, Agendamento, Cliente, Cupom, Negocio } = require("../models");
const A = require("../utils/agenda");
const AG = require("../utils/agendamentos");

const router = Router();

// O agente pode mandar os serviços como lista ou como texto "Corte, Escova".
const listaServicos = (v) => {
  if (Array.isArray(v)) return v;
  const t = String(v ?? "").trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    try {
      return JSON.parse(t);
    } catch {
      /* segue como texto */
    }
  }
  return t.split(/\s*[,;+]\s*|\s+e\s+/i).filter(Boolean);
};
const vazio = (v) => v === undefined || v === null || String(v).trim() === "" || /^(qualquer|tanto faz|indiferente|nenhum)$/i.test(String(v).trim());

router.use((req, res, next) => {
  const esperada = process.env.N8N_API_KEY;
  if (!esperada) return res.status(503).json({ ok: false, mensagem: "N8N_API_KEY não configurada no servidor." });
  const a = Buffer.from(String(req.get("x-api-key") || ""));
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ ok: false, mensagem: "Chave inválida." });
  return next();
});

// Lista de negócios ativos (para o envio da agenda das 3h). Não exige instância.
router.get("/negocios", async (req, res, next) => {
  try {
    const lista = await Negocio.findAll({ where: { ativo: true, instanciaWhatsapp: { [Op.ne]: null } }, order: [["id", "ASC"]] });
    res.json(lista.map((n) => ({ id: n.id, nome: n.nome, instancia: n.instanciaWhatsapp, telefoneDono: n.telefoneDono })));
  } catch (e) {
    next(e);
  }
});

// Identifica o negócio pela instância do WhatsApp
router.use(async (req, res, next) => {
  try {
    const instancia = String(req.get("x-instancia") || req.query.instancia || req.body?.instancia || "").trim();
    if (!instancia) return res.status(400).json({ ok: false, mensagem: "Informe a instância do WhatsApp (x-instancia)." });
    const negocio = await Negocio.findOne({ where: { instanciaWhatsapp: instancia } });
    if (!negocio) return res.status(404).json({ ok: false, mensagem: `Nenhum negócio ligado à instância "${instancia}".` });
    if (!negocio.ativo) return res.status(403).json({ ok: false, negocioInativo: true, mensagem: "Negócio desativado." });
    req.negocio = negocio;
    return next();
  } catch (e) {
    return next(e);
  }
});

// Erros de regra viram { ok:false, mensagem } com 200, para o agente explicar ao cliente.
const tratar = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e instanceof AG.ErroAgenda) return res.json({ ok: false, mensagem: e.message, ...e.extra });
    console.error(e);
    return res.status(500).json({ ok: false, mensagem: "Erro interno ao processar o pedido." });
  }
};

const resumoAgendamento = (a) =>
  `#${a.id} · ${A.dataExtenso(a.data)} às ${a.inicio} (até ${a.fim}) com ${a.profissionalNome} · ${a.servicos.map((s) => s.nome).join(" + ")} · ${A.dinheiro(a.total)}${
    Number(a.descontoValor) > 0 ? ` (desconto de ${A.dinheiro(a.descontoValor)}: ${a.descontoMotivo})` : ""
  } · ${a.status}`;

// Informações do negócio para o agente: serviços, profissionais, horários e regras.
router.get("/info", tratar(async (req, res) => {
  const n = req.negocio;
  const servicos = await Servico.findAll({ where: { negocioId: n.id, ativo: true }, order: [["categoria", "ASC"], ["nome", "ASC"]] });
  const profs = await A.profissionaisDoNegocio(n.id);
  const nomeServ = Object.fromEntries(servicos.map((s) => [s.id, s.nome]));
  res.json({
    ok: true,
    negocio: n.nome,
    atendente: n.nomeAtendente,
    hoje: `${A.dataExtenso(A.hojeISO())} (${A.hojeISO()})`,
    horarios: A.textoHorarios(n.horarios),
    descontosPorQuantidade: (n.descontosQuantidade || []).map((f) => `${f.minServicos}+ serviços: ${f.percentual}%`),
    descontoMaximoQueOAgentePodeDar: Number(n.descontoMaxAgente),
    antecedenciaCancelamentoHoras: n.antecedenciaCancelamentoHoras,
    clienteEscolheProfissional: n.clienteEscolheProfissional,
    observacoes: n.observacoesAgente || "",
    servicos: servicos.map((s) => ({
      id: s.id,
      nome: s.nome,
      categoria: s.categoria,
      preco: Number(s.preco),
      precoTexto: A.dinheiro(s.preco),
      duracaoMin: s.duracaoMin,
      descricao: s.descricao,
      profissionais: profs.filter((p) => s.id in p.tempos).map((p) => p.nome),
    })),
    profissionais: profs.map((p) => ({
      id: p.id,
      nome: p.nome,
      apelido: p.apelido,
      servicos: Object.keys(p.tempos).map((id) => nomeServ[id]).filter(Boolean),
    })),
  });
}));

// Orçamento: soma valor e tempo dos serviços e aplica os descontos.
router.post("/orcamento", tratar(async (req, res) => {
  const { itens, erros } = await A.resolverServicos(req.negocio.id, listaServicos(req.body?.servicos));
  if (erros.length) return res.json({ ok: false, mensagem: erros.join(" ") });
  if (!itens.length) return res.json({ ok: false, mensagem: "Informe os serviços." });
  let duracaoTotal;
  if (!vazio(req.body?.profissional)) {
    const p = A.acharProfissional(await A.profissionaisDoNegocio(req.negocio.id), req.body.profissional);
    if (p) duracaoTotal = A.duracaoPara(p, itens) || undefined;
  }
  const o = await A.calcularOrcamento(req.negocio, itens, { ...(req.body || {}), duracaoTotal });
  res.json({
    ok: !o.erroCupom,
    ...o,
    texto: [
      ...o.itens.map((s) => `• ${s.nome}: ${A.dinheiro(s.preco)} (${s.duracaoMin} min)`),
      `Tempo total: ${Math.floor(o.duracaoTotal / 60)}h${String(o.duracaoTotal % 60).padStart(2, "0")}`,
      `Subtotal: ${A.dinheiro(o.subtotal)}`,
      o.descontoValor > 0 ? `Desconto: -${A.dinheiro(o.descontoValor)} (${o.descontoMotivo})` : null,
      `Total: ${A.dinheiro(o.total)}`,
      o.erroCupom,
    ].filter(Boolean).join("\n"),
  });
}));

// Horários livres. Com profissional: só dele. Sem: de todos que fazem os serviços,
// dizendo quem está livre em cada horário. Sem data: próximos dias com vaga.
router.post("/disponibilidade", tratar(async (req, res) => {
  const { itens, erros } = await A.resolverServicos(req.negocio.id, listaServicos(req.body?.servicos));
  if (erros.length) return res.json({ ok: false, mensagem: erros.join(" ") });
  if (!itens.length) return res.json({ ok: false, mensagem: "Informe os serviços." });
  const profissional = vazio(req.body?.profissional) ? undefined : req.body.profissional;
  const dataPedida = A.normalizarData(req.body?.data);
  const inicio = dataPedida || A.hojeISO();
  const dias = [];
  let aptos = [];
  for (let i = 0; i < 21 && dias.length < (dataPedida ? 1 : 3); i++) {
    const data = A.somarDias(inicio, i);
    const disp = await A.disponibilidade(req.negocio, itens, data, { profissional });
    if (disp.erro) return res.json({ ok: false, mensagem: disp.erro, profissionaisQueFazem: disp.aptos.map((p) => p.nome) });
    aptos = disp.aptos;
    if (!aptos.length) return res.json({ ok: false, mensagem: `Nenhum profissional faz ${itens.map((x) => x.nome).join(" + ")}.` });
    if (disp.horarios.length || dataPedida) {
      dias.push({
        data,
        dia: A.dataExtenso(data),
        horarios: disp.horarios.map((h) => ({ hora: h.hora, profissionais: h.profissionais.map((p) => p.nome) })),
      });
    }
    if (dataPedida) break;
  }
  res.json({
    ok: true,
    profissionalPedido: profissional || null,
    profissionaisQueFazem: aptos.map((p) => p.nome),
    dias,
    dica: "Ofereça 3 a 5 horários. Se o cliente não escolheu profissional, pode citar quem está livre ou deixar o sistema escolher.",
  });
}));

// Cria o agendamento (o agente só chama depois de o cliente confirmar).
router.post("/agendar", tratar(async (req, res) => {
  const b = req.body || {};
  const ag = await AG.criar(req.negocio, {
    clienteNome: b.nome,
    telefone: b.telefone,
    data: b.data,
    inicio: b.inicio || b.hora,
    servicos: listaServicos(b.servicos),
    profissional: vazio(b.profissional) ? undefined : b.profissional,
    profissionalEscolhidoPeloCliente: !vazio(b.profissional),
    cupom: b.cupom || null,
    descontoExtraPercentual: b.descontoExtraPercentual || 0,
    observacoes: b.observacoes || null,
    origem: "whatsapp",
  });
  res.json({ ok: true, mensagem: "Agendamento confirmado.", agendamento: ag, texto: resumoAgendamento(ag) });
}));

// Próximos agendamentos do cliente (pelo telefone do WhatsApp).
router.get("/meus-agendamentos", tratar(async (req, res) => {
  const tel = A.somenteDigitos(req.query.telefone);
  const lista = await Agendamento.findAll({
    where: { negocioId: req.negocio.id, telefone: tel, data: { [Op.gte]: A.hojeISO() }, status: { [Op.in]: ["agendado", "confirmado"] } },
    order: [["data", "ASC"], ["inicio", "ASC"]],
  });
  const cliente = await Cliente.findOne({ where: { negocioId: req.negocio.id, telefone: tel } });
  res.json({ ok: true, cliente: cliente ? { nome: cliente.nome } : null, agendamentos: lista.map((a) => ({ id: a.id, texto: resumoAgendamento(a) })) });
}));

async function agendamentoDoCliente(negocio, telefone, id) {
  const ag = await Agendamento.findOne({ where: { id, negocioId: negocio.id } });
  if (!ag || A.somenteDigitos(ag.telefone) !== A.somenteDigitos(telefone)) throw new AG.ErroAgenda("Não encontrei esse agendamento no seu número.");
  if (["cancelado", "concluido", "faltou"].includes(ag.status)) throw new AG.ErroAgenda(`Esse agendamento já está ${ag.status}.`);
  return ag;
}
const dentroDaAntecedencia = (ag, horas) => new Date(`${ag.data}T${ag.inicio}:00-03:00`).getTime() - Date.now() < horas * 3600 * 1000;

router.post("/cancelar", tratar(async (req, res) => {
  const n = req.negocio;
  const ag = await agendamentoDoCliente(n, req.body?.telefone, req.body?.id);
  if (dentroDaAntecedencia(ag, n.antecedenciaCancelamentoHoras)) {
    return res.json({ ok: false, mensagem: `Cancelamentos pelo WhatsApp só até ${n.antecedenciaCancelamentoHoras}h antes. Fale com o estabelecimento.` });
  }
  await AG.cancelar(n, ag.id, req.body?.motivo || "Cancelado pelo cliente no WhatsApp");
  res.json({ ok: true, mensagem: "Agendamento cancelado.", texto: resumoAgendamento(await Agendamento.findByPk(ag.id)) });
}));

// Remarca. Se o cliente pedir outro profissional, troca; senão tenta manter o mesmo.
router.post("/remarcar", tratar(async (req, res) => {
  const n = req.negocio;
  const ag = await agendamentoDoCliente(n, req.body?.telefone, req.body?.id);
  if (dentroDaAntecedencia(ag, n.antecedenciaCancelamentoHoras)) {
    return res.json({ ok: false, mensagem: `Remarcações pelo WhatsApp só até ${n.antecedenciaCancelamentoHoras}h antes. Fale com o estabelecimento.` });
  }
  const dados = {
    data: req.body?.data || ag.data,
    inicio: req.body?.inicio || req.body?.hora || ag.inicio,
    servicos: listaServicos(req.body?.servicos).length ? listaServicos(req.body?.servicos) : undefined,
  };
  if (!vazio(req.body?.profissional)) dados.profissional = req.body.profissional;
  const novo = await AG.alterar(n, ag.id, dados);
  res.json({ ok: true, mensagem: "Agendamento remarcado.", texto: resumoAgendamento(novo) });
}));

// Texto da agenda de um dia (fluxo das 3h da manhã).
router.get("/agenda-dia", tratar(async (req, res) => {
  const data = A.normalizarData(req.query.data) || A.hojeISO();
  res.json({ ok: true, data, telefoneDono: req.negocio.telefoneDono, texto: await A.textoAgendaDoDia(req.negocio, data) });
}));

// Valida um cupom antes de agendar.
router.get("/cupom/:codigo", tratar(async (req, res) => {
  const cp = await Cupom.findOne({ where: { negocioId: req.negocio.id, codigo: String(req.params.codigo).trim().toUpperCase(), ativo: true } });
  if (!cp || (cp.validoAte && cp.validoAte < A.hojeISO())) return res.json({ ok: false, mensagem: "Cupom inválido ou vencido." });
  res.json({ ok: true, codigo: cp.codigo, percentual: Number(cp.percentual), descricao: cp.descricao });
}));

module.exports = router;
