// Regras da agenda por negócio: horários, pausas, bloqueios, profissionais,
// duração somada, descontos, conflitos e textos para o WhatsApp.
const { Op } = require("sequelize");
const { Servico, Agendamento, Cupom, Profissional, ProfissionalServico, Bloqueio } = require("../models");

const FUSO = "America/Sao_Paulo";
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const paraMin = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
};
const paraHora = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const arred = (n) => Math.round(Number(n || 0) * 100) / 100;
const dinheiro = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const somenteDigitos = (v) => String(v ?? "").replace(/\D/g, "");
const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const sobrepoe = (a, b) => a[0] < b[1] && b[0] < a[1];

function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}
function agoraMin() {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return paraMin(p);
}
function diaSemana(dataISO) {
  return new Date(`${dataISO}T12:00:00-03:00`).getUTCDay();
}
function somarDias(dataISO, n) {
  const d = new Date(`${dataISO}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const dataBR = (dataISO) => String(dataISO).split("-").reverse().join("/");
const dataExtenso = (dataISO) => `${DIAS[diaSemana(dataISO)]}, ${dataBR(dataISO)}`;

// Aceita AAAA-MM-DD, DD/MM/AAAA ou DD/MM
function normalizarData(v) {
  const s = String(v || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    let ano = m[3] ? Number(m[3]) : Number(hojeISO().slice(0, 4));
    if (ano < 100) ano += 2000;
    return `${ano}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  return null;
}
function normalizarHora(v) {
  const m = String(v || "").trim().match(/^(\d{1,2})(?:[:hH](\d{2}))?/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2] || 0);
  if (h > 23 || mi > 59) return null;
  return paraHora(h * 60 + mi);
}

// ------------------------------- Horários -------------------------------

// Normaliza um dia do JSON de horários. Aceita o formato antigo ["09:00","19:00"].
function lerDia(horarios, dia) {
  const h = (horarios || {})[String(dia)];
  if (!h) return null;
  if (Array.isArray(h)) return h[0] && h[1] ? { abre: h[0], fecha: h[1], pausas: [] } : null;
  if (!h.abre || !h.fecha) return null;
  return { abre: h.abre, fecha: h.fecha, pausas: (h.pausas || []).filter((p) => p && p.inicio && p.fim) };
}

// Texto dos horários de funcionamento (para o agente e telas)
function textoHorarios(horarios) {
  return DIAS.map((nome, i) => {
    const d = lerDia(horarios, i);
    if (!d) return `${nome}: fechado`;
    const pausas = d.pausas.length ? ` (pausa ${d.pausas.map((p) => `${p.inicio}–${p.fim}`).join(", ")})` : "";
    return `${nome}: ${d.abre} às ${d.fecha}${pausas}`;
  });
}

// Bloqueios que valem para uma data (do negócio todo ou do profissional)
async function bloqueiosDoDia(negocioId, dataISO) {
  return Bloqueio.findAll({
    where: { negocioId, dataInicio: { [Op.lte]: dataISO }, dataFim: { [Op.gte]: dataISO } },
  });
}

// Janela de trabalho de um profissional numa data:
// { abre, fecha, ocupado: [[ini,fim],...] } (pausas + bloqueios) ou null se não trabalha.
function janelaProfissional(negocio, prof, dataISO, bloqueios) {
  const dia = diaSemana(dataISO);
  const doNegocio = lerDia(negocio.horarios, dia);
  if (!doNegocio) return null;
  const proprio = prof.horarios ? lerDia(prof.horarios, dia) : doNegocio;
  if (!proprio) return null;

  const abre = Math.max(paraMin(doNegocio.abre), paraMin(proprio.abre));
  const fecha = Math.min(paraMin(doNegocio.fecha), paraMin(proprio.fecha));
  if (fecha <= abre) return null;

  const ocupado = [...doNegocio.pausas, ...(prof.horarios ? proprio.pausas : [])].map((p) => [paraMin(p.inicio), paraMin(p.fim)]);
  for (const b of bloqueios || []) {
    if (b.profissionalId && Number(b.profissionalId) !== Number(prof.id)) continue;
    if (!b.inicio || !b.fim) return null; // dia inteiro bloqueado
    ocupado.push([paraMin(b.inicio), paraMin(b.fim)]);
  }
  return { abre, fecha, ocupado };
}

// ------------------------------ Serviços ------------------------------

// Resolve serviços por id ou nome dentro do negócio. Devolve { itens, erros }.
async function resolverServicos(negocioId, lista) {
  const itens = [];
  const erros = [];
  const todos = await Servico.findAll({ where: { negocioId, ativo: true } });
  for (const v of lista || []) {
    let s = null;
    if (/^\d+$/.test(String(v).trim())) s = todos.find((x) => x.id === Number(v));
    if (!s) {
      const alvo = semAcento(v);
      const exatos = todos.filter((x) => semAcento(x.nome) === alvo);
      const parecidos = exatos.length ? exatos : todos.filter((x) => semAcento(x.nome).includes(alvo) || alvo.includes(semAcento(x.nome)));
      if (parecidos.length === 1) s = parecidos[0];
      else if (parecidos.length > 1) {
        erros.push(`"${v}" pode ser: ${parecidos.map((x) => x.nome).join(", ")}. Qual deles?`);
        continue;
      }
    }
    if (!s) erros.push(`Serviço "${v}" não encontrado.`);
    else itens.push({ servicoId: s.id, nome: s.nome, preco: Number(s.preco), duracaoMin: s.duracaoMin });
  }
  return { itens, erros };
}

// ---------------------------- Profissionais ----------------------------

// Profissionais ativos com a lista de serviços que fazem (e tempos próprios)
async function profissionaisDoNegocio(negocioId) {
  const profs = await Profissional.findAll({
    where: { negocioId, ativo: true },
    include: [{ model: ProfissionalServico }],
    order: [["ordem", "ASC"], ["nome", "ASC"]],
  });
  return profs.map((p) => {
    const tempos = {};
    (p.ProfissionalServicos || []).forEach((ps) => {
      tempos[ps.servicoId] = ps.duracaoMin;
    });
    return { id: p.id, nome: p.nome, apelido: p.apelido, cor: p.cor, horarios: p.horarios, tempos };
  });
}

// Duração dos itens para um profissional (tempo próprio ou padrão); null se ele não faz algum
function duracaoPara(prof, itens) {
  let total = 0;
  for (const it of itens) {
    if (!(it.servicoId in prof.tempos)) return null;
    total += Number(prof.tempos[it.servicoId] || it.duracaoMin);
  }
  return total;
}

// Encontra um profissional pelo id ou pelo nome/apelido
function acharProfissional(profs, v) {
  if (v === undefined || v === null || v === "") return null;
  if (/^\d+$/.test(String(v).trim())) return profs.find((p) => p.id === Number(v)) || null;
  const alvo = semAcento(v);
  return (
    profs.find((p) => semAcento(p.nome) === alvo || semAcento(p.apelido) === alvo) ||
    profs.find((p) => semAcento(p.nome).split(" ")[0] === alvo) ||
    profs.find((p) => semAcento(p.nome).includes(alvo) || (p.apelido && semAcento(p.apelido).includes(alvo))) ||
    null
  );
}

// Intervalos já ocupados por agendamentos de cada profissional na data
async function ocupacaoDoDia(negocioId, dataISO, ignorarId) {
  const where = { negocioId, data: dataISO, status: { [Op.notIn]: ["cancelado"] } };
  if (ignorarId) where.id = { [Op.ne]: Number(ignorarId) };
  const ags = await Agendamento.findAll({ where });
  const mapa = {};
  ags.forEach((a) => {
    (mapa[a.profissionalId] = mapa[a.profissionalId] || []).push([paraMin(a.inicio), paraMin(a.fim)]);
  });
  return mapa;
}

// Horários livres de um profissional (lista de "HH:MM")
function livresDoProfissional(negocio, prof, dataISO, duracao, bloqueios, ocupacao) {
  const j = janelaProfissional(negocio, prof, dataISO, bloqueios);
  if (!j || !duracao) return [];
  const ocupados = [...j.ocupado, ...(ocupacao[prof.id] || [])];
  const hoje = hojeISO();
  if (dataISO < hoje) return [];
  const minimo = dataISO === hoje ? agoraMin() : 0;
  const passo = negocio.passoMin || 15;
  const livres = [];
  for (let t = j.abre; t + duracao <= j.fecha; t += passo) {
    if (t < minimo) continue;
    if (!ocupados.some((o) => sobrepoe([t, t + duracao], o))) livres.push(paraHora(t));
  }
  return livres;
}

// Disponibilidade numa data. Se profissional for informado, só dele;
// senão, de todos os aptos. Devolve:
//   { aptos: [{id,nome}], porProfissional: [{id,nome,duracao,horarios}],
//     horarios: [{ hora, profissionais: [{id,nome}] }] }
async function disponibilidade(negocio, itens, dataISO, { profissional, ignorarId } = {}) {
  const profs = await profissionaisDoNegocio(negocio.id);
  let candidatos = profs.filter((p) => duracaoPara(p, itens) !== null);
  if (profissional) {
    const p = acharProfissional(profs, profissional);
    if (!p) return { erro: `Profissional "${profissional}" não encontrado.`, aptos: candidatos.map(resumoProf) };
    if (duracaoPara(p, itens) === null) {
      return { erro: `${p.nome} não faz ${itens.map((i) => i.nome).join(" + ")}.`, aptos: candidatos.map(resumoProf) };
    }
    candidatos = [p];
  }
  const bloqueios = await bloqueiosDoDia(negocio.id, dataISO);
  const ocupacao = await ocupacaoDoDia(negocio.id, dataISO, ignorarId);
  const porProfissional = candidatos.map((p) => {
    const duracao = duracaoPara(p, itens);
    return { id: p.id, nome: p.nome, apelido: p.apelido, cor: p.cor, duracao, horarios: livresDoProfissional(negocio, p, dataISO, duracao, bloqueios, ocupacao) };
  });
  const mapa = {};
  porProfissional.forEach((p) => p.horarios.forEach((h) => (mapa[h] = mapa[h] || []).push({ id: p.id, nome: p.nome })));
  const horarios = Object.keys(mapa)
    .sort()
    .map((hora) => ({ hora, profissionais: mapa[hora] }));
  return { aptos: profs.filter((p) => duracaoPara(p, itens) !== null).map(resumoProf), porProfissional, horarios };
}
const resumoProf = (p) => ({ id: p.id, nome: p.nome, apelido: p.apelido });

// Escolhe automaticamente o profissional livre no horário, equilibrando a carga do dia
async function escolherProfissional(negocio, itens, dataISO, inicio, ignorarId) {
  const disp = await disponibilidade(negocio, itens, dataISO, { ignorarId });
  const livres = disp.porProfissional.filter((p) => p.horarios.includes(inicio));
  if (!livres.length) return null;
  const ocupacao = await ocupacaoDoDia(negocio.id, dataISO, ignorarId);
  const carga = (id) => (ocupacao[id] || []).reduce((t, o) => t + (o[1] - o[0]), 0);
  livres.sort((a, b) => carga(a.id) - carga(b.id));
  return livres[0];
}

// Confere se o horário cabe para o profissional. Devolve mensagem de erro ou null.
async function validarHorario(negocio, prof, itens, dataISO, inicio, ignorarId) {
  const duracao = duracaoPara(prof, itens);
  if (duracao === null) return `${prof.nome} não faz ${itens.map((i) => i.nome).join(" + ")}.`;
  if (dataISO < hojeISO()) return "Essa data já passou.";
  const bloqueios = await bloqueiosDoDia(negocio.id, dataISO);
  const j = janelaProfissional(negocio, prof, dataISO, bloqueios);
  if (!j) return `${prof.nome} não atende ${DIAS[diaSemana(dataISO)]} (${dataBR(dataISO)}).`;
  const ini = paraMin(inicio);
  const fim = ini + duracao;
  if (ini < j.abre || fim > j.fecha) return `Fora do horário de ${prof.nome} (${paraHora(j.abre)} às ${paraHora(j.fecha)}).`;
  if (dataISO === hojeISO() && ini < agoraMin()) return "Esse horário de hoje já passou.";
  if (j.ocupado.some((o) => sobrepoe([ini, fim], o))) return "Cai numa pausa ou bloqueio da agenda.";
  const ocupacao = await ocupacaoDoDia(negocio.id, dataISO, ignorarId);
  if ((ocupacao[prof.id] || []).some((o) => sobrepoe([ini, fim], o))) return `${prof.nome} já tem atendimento nesse horário.`;
  return null;
}

// ------------------------------ Orçamento ------------------------------

async function calcularOrcamento(negocio, itens, { cupom, descontoExtraPercentual, descontoManualPercentual, duracaoTotal } = {}) {
  const subtotal = arred(itens.reduce((t, s) => t + Number(s.preco), 0));
  const duracao = duracaoTotal || itens.reduce((t, s) => t + Number(s.duracaoMin), 0);
  const motivos = [];
  let percentual = 0;

  const faixa = [...(negocio.descontosQuantidade || [])]
    .filter((f) => itens.length >= Number(f.minServicos))
    .sort((a, b) => Number(b.percentual) - Number(a.percentual))[0];
  if (faixa) {
    percentual += Number(faixa.percentual);
    motivos.push(`${faixa.percentual}% por ${itens.length} serviços`);
  }

  let cupomAplicado = null;
  let erroCupom = null;
  if (cupom) {
    const cp = await Cupom.findOne({ where: { negocioId: negocio.id, codigo: String(cupom).trim().toUpperCase(), ativo: true } });
    if (!cp || (cp.validoAte && cp.validoAte < hojeISO())) erroCupom = `Cupom "${cupom}" inválido ou vencido.`;
    else {
      percentual += Number(cp.percentual);
      cupomAplicado = cp.codigo;
      motivos.push(`${Number(cp.percentual)}% cupom ${cp.codigo}`);
    }
  }

  const extra = Math.min(Number(descontoExtraPercentual || 0), Number(negocio.descontoMaxAgente || 0));
  if (extra > 0) {
    percentual += extra;
    motivos.push(`${extra}% cortesia`);
  }

  if (descontoManualPercentual !== undefined && descontoManualPercentual !== null && descontoManualPercentual !== "") {
    percentual = Number(descontoManualPercentual) || 0;
    motivos.length = 0;
    if (percentual > 0) motivos.push(`${percentual}% manual`);
  }

  percentual = Math.min(Math.max(percentual, 0), 100);
  const descontoValor = arred((subtotal * percentual) / 100);
  return {
    itens,
    quantidade: itens.length,
    duracaoTotal: duracao,
    subtotal,
    descontoPercentual: arred(percentual),
    descontoValor,
    descontoMotivo: motivos.join(" + ") || null,
    cupom: cupomAplicado,
    erroCupom,
    total: arred(subtotal - descontoValor),
  };
}

// ------------------------------- Textos -------------------------------

async function textoAgendaDoDia(negocio, dataISO, titulo) {
  const ags = await Agendamento.findAll({
    where: { negocioId: negocio.id, data: dataISO, status: { [Op.notIn]: ["cancelado"] } },
    order: [["profissionalNome", "ASC"], ["inicio", "ASC"]],
  });
  const total = arred(ags.reduce((t, a) => t + Number(a.total), 0));
  const porProf = {};
  ags.forEach((a) => (porProf[a.profissionalNome || "Sem profissional"] = porProf[a.profissionalNome || "Sem profissional"] || []).push(a));
  const blocos = Object.entries(porProf).map(([nome, lista]) => {
    const linhas = lista.map(
      (a) => `• ${a.inicio}–${a.fim} *${a.clienteNome}*\n   ${a.servicos.map((s) => s.nome).join(" + ")} · ${dinheiro(a.total)}${a.status === "confirmado" ? " (confirmado)" : ""}`
    );
    return `*${nome}* (${lista.length})\n${linhas.join("\n")}`;
  });
  return [
    `${titulo || "Agenda do dia"} · *${negocio.nome}*`,
    dataExtenso(dataISO),
    "",
    ags.length ? blocos.join("\n\n") : "Nenhum agendamento.",
    "",
    `Total: ${ags.length} atendimento(s) · previsto ${dinheiro(total)}`,
  ].join("\n");
}

// Mensagem para o CLIENTE quando a mudança foi feita pelo sistema (não pelo agente).
function mensagemParaCliente(negocio, ag, evento) {
  const primeiroNome = String(ag.clienteNome || "").split(" ")[0];
  const quando = `${dataExtenso(ag.data)} às ${ag.inicio}`;
  const servs = (ag.servicos || []).map((s) => s.nome).join(" + ");
  if (evento === "criado") {
    return `Olá, ${primeiroNome}! Seu horário no *${negocio.nome}* está marcado: ${quando} com ${ag.profissionalNome} · ${servs} · ${dinheiro(ag.total)}.\nSe precisar cancelar ou remarcar, é só responder esta mensagem.`;
  }
  if (evento === "cancelado" || evento === "removido") {
    return `Olá, ${primeiroNome}. Seu horário no *${negocio.nome}* de ${quando} (${servs}) foi *cancelado*.${ag.motivoCancelamento ? ` Motivo: ${ag.motivoCancelamento}.` : ""}\nQuer marcar um novo horário? É só responder aqui.`;
  }
  if (evento === "alterado") {
    return `Olá, ${primeiroNome}! Seu horário no *${negocio.nome}* foi atualizado: ${quando} com ${ag.profissionalNome} · ${servs} · ${dinheiro(ag.total)}.\nQualquer dúvida, é só responder.`;
  }
  return null;
}

// Avisa o n8n que a agenda mudou. O n8n manda a agenda atualizada para o dono e,
// quando avisarCliente=true (mudança feita pelo sistema), manda a mensagem ao cliente.
async function avisarAgendaAtualizada(negocio, agendamento, evento, { avisarCliente = false } = {}) {
  const url = process.env.N8N_WEBHOOK_AGENDA;
  if (!url || !negocio) return;
  const mensagemCliente = avisarCliente && negocio.avisarClienteMudancas !== false && agendamento.telefone ? mensagemParaCliente(negocio, agendamento, evento) : null;
  if (!negocio.telefoneDono && !mensagemCliente) return;
  try {
    const rotulo = { criado: "Novo agendamento", alterado: "Agendamento alterado", cancelado: "Agendamento cancelado", removido: "Agendamento removido" }[evento] || "Agenda atualizada";
    const resumo = `${rotulo}: ${agendamento.clienteNome} com ${agendamento.profissionalNome} · ${dataBR(agendamento.data)} ${agendamento.inicio} · ${(agendamento.servicos || []).map((s) => s.nome).join(" + ")} · ${dinheiro(agendamento.total)}`;
    const texto = negocio.telefoneDono ? `${resumo}\n\n${await textoAgendaDoDia(negocio, agendamento.data, "Agenda atualizada")}` : null;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.N8N_API_KEY || "" },
      body: JSON.stringify({
        evento,
        negocioId: negocio.id,
        instancia: negocio.instanciaWhatsapp,
        telefoneDono: negocio.telefoneDono,
        data: agendamento.data,
        texto,
        telefoneCliente: mensagemCliente ? agendamento.telefone : null,
        mensagemCliente,
      }),
    });
  } catch (e) {
    console.error("[n8n] não foi possível avisar a atualização:", e.message);
  }
}

// Horários padrão de um negócio novo
const HORARIOS_PADRAO = {
  0: null,
  1: null,
  2: { abre: "09:00", fecha: "19:00", pausas: [{ inicio: "12:00", fim: "13:00" }] },
  3: { abre: "09:00", fecha: "19:00", pausas: [{ inicio: "12:00", fim: "13:00" }] },
  4: { abre: "09:00", fecha: "19:00", pausas: [{ inicio: "12:00", fim: "13:00" }] },
  5: { abre: "09:00", fecha: "20:00", pausas: [{ inicio: "12:00", fim: "13:00" }] },
  6: { abre: "08:00", fecha: "16:00", pausas: [] },
};

module.exports = {
  FUSO, DIAS, HORARIOS_PADRAO, paraMin, paraHora, arred, dinheiro, somenteDigitos, semAcento, hojeISO, agoraMin,
  diaSemana, somarDias, dataBR, dataExtenso, normalizarData, normalizarHora, lerDia, textoHorarios, bloqueiosDoDia,
  janelaProfissional, resolverServicos, profissionaisDoNegocio, duracaoPara, acharProfissional, ocupacaoDoDia,
  disponibilidade, escolherProfissional, validarHorario, calcularOrcamento, textoAgendaDoDia, avisarAgendaAtualizada, mensagemParaCliente,
};
