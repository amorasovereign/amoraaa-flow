// Criação e alteração de agendamentos (usado pela tela e pelo agente do WhatsApp).
// Sempre dentro de um negócio. Se o profissional não for informado, o sistema
// escolhe um que faça os serviços e esteja livre no horário.
const { Agendamento, Cliente } = require("../models");
const A = require("./agenda");

class ErroAgenda extends Error {
  constructor(mensagem, extra = {}) {
    super(mensagem);
    this.status = 400;
    this.extra = extra;
  }
}

async function garantirCliente(negocioId, nome, telefone) {
  const tel = A.somenteDigitos(telefone);
  if (!tel) return null;
  const [cliente] = await Cliente.findOrCreate({
    where: { negocioId, telefone: tel },
    defaults: { negocioId, nome: nome || "Cliente", telefone: tel },
  });
  if (nome && cliente.nome !== nome && (!cliente.nome || cliente.nome === "Cliente")) await cliente.update({ nome });
  return cliente;
}

// Monta (e valida) os dados de um agendamento.
async function montar(negocio, dados, existente) {
  const data = A.normalizarData(dados.data ?? existente?.data);
  const inicio = A.normalizarHora(dados.inicio ?? dados.hora ?? existente?.inicio);
  if (!data) throw new ErroAgenda("Informe a data (DD/MM ou AAAA-MM-DD).");
  if (!inicio) throw new ErroAgenda("Informe o horário (HH:MM).");

  const listaServicos = dados.servicos ?? existente?.servicos?.map((s) => s.servicoId);
  const { itens, erros } = await A.resolverServicos(
    negocio.id,
    (listaServicos || []).map((s) => (typeof s === "object" ? s.servicoId ?? s.id ?? s.nome : s))
  );
  if (erros.length) throw new ErroAgenda(erros.join(" "));
  if (!itens.length) throw new ErroAgenda("Escolha pelo menos um serviço.");

  const status = dados.status ?? existente?.status ?? "agendado";
  const profs = await A.profissionaisDoNegocio(negocio.id);
  if (!profs.length) throw new ErroAgenda("Nenhum profissional ativo cadastrado neste negócio.");

  // Profissional: informado, o mesmo do agendamento existente, ou escolhido automaticamente
  const pedido = dados.profissionalId ?? dados.profissional;
  let prof = null;
  let escolhidoPeloCliente = existente?.profissionalEscolhidoPeloCliente ?? false;
  if (pedido !== undefined && pedido !== null && pedido !== "" && pedido !== "qualquer") {
    prof = A.acharProfissional(profs, pedido);
    if (!prof) throw new ErroAgenda(`Profissional "${pedido}" não encontrado.`, { profissionais: profs.map((p) => p.nome) });
    escolhidoPeloCliente = dados.profissionalEscolhidoPeloCliente ?? true;
  } else if (existente?.profissionalId && pedido !== "qualquer") {
    prof = profs.find((p) => p.id === existente.profissionalId) || null;
  }

  if (status !== "cancelado") {
    if (prof) {
      const erro = await A.validarHorario(negocio, prof, itens, data, inicio, existente?.id);
      if (erro) {
        // Ao remarcar sem escolha do cliente, tenta outro profissional livre
        const podeTrocar = existente && !escolhidoPeloCliente && pedido === undefined;
        const alternativo = podeTrocar ? await A.escolherProfissional(negocio, itens, data, inicio, existente?.id) : null;
        if (alternativo) prof = profs.find((p) => p.id === alternativo.id);
        else {
          const disp = await A.disponibilidade(negocio, itens, data, { profissional: prof.id, ignorarId: existente?.id });
          throw new ErroAgenda(erro, { horariosLivres: (disp.porProfissional?.[0]?.horarios || []).slice(0, 10) });
        }
      }
    } else {
      const auto = await A.escolherProfissional(negocio, itens, data, inicio, existente?.id);
      if (!auto) {
        const disp = await A.disponibilidade(negocio, itens, data, { ignorarId: existente?.id });
        if (!disp.aptos.length) throw new ErroAgenda(`Nenhum profissional faz ${itens.map((i) => i.nome).join(" + ")}.`);
        throw new ErroAgenda("Nenhum profissional livre nesse horário.", {
          horariosLivres: disp.horarios.slice(0, 10).map((h) => h.hora),
        });
      }
      prof = profs.find((p) => p.id === auto.id);
      escolhidoPeloCliente = false;
    }
  } else if (!prof) {
    prof = profs.find((p) => p.id === existente?.profissionalId) || profs[0];
  }

  const duracaoTotal = A.duracaoPara(prof, itens) ?? itens.reduce((t, s) => t + s.duracaoMin, 0);
  const extra = dados.descontoExtraPercentual !== undefined ? dados.descontoExtraPercentual : existente?.descontoExtraPercentual;
  const manual = dados.descontoManualPercentual !== undefined ? dados.descontoManualPercentual : existente?.descontoManualPercentual;
  const orc = await A.calcularOrcamento(negocio, itens, {
    cupom: dados.cupom !== undefined ? dados.cupom : existente?.cupom,
    descontoExtraPercentual: extra,
    descontoManualPercentual: manual,
    duracaoTotal,
  });
  if (orc.erroCupom) throw new ErroAgenda(orc.erroCupom);

  const clienteNome = String(dados.clienteNome ?? dados.nome ?? existente?.clienteNome ?? "").trim();
  if (!clienteNome) throw new ErroAgenda("Informe o nome do cliente.");
  const telefone = A.somenteDigitos(dados.telefone ?? existente?.telefone) || null;
  const cliente = await garantirCliente(negocio.id, clienteNome, telefone);

  return {
    negocioId: negocio.id,
    profissionalId: prof.id,
    profissionalNome: prof.nome,
    profissionalEscolhidoPeloCliente: !!escolhidoPeloCliente,
    clienteId: cliente?.id ?? existente?.clienteId ?? null,
    clienteNome,
    telefone,
    data,
    inicio,
    fim: A.paraHora(A.paraMin(inicio) + duracaoTotal),
    duracaoTotal,
    servicos: orc.itens,
    subtotal: orc.subtotal,
    descontoPercentual: orc.descontoPercentual,
    descontoValor: orc.descontoValor,
    descontoMotivo: orc.descontoMotivo,
    descontoExtraPercentual: extra === undefined || extra === "" ? null : Number(extra) || 0,
    descontoManualPercentual: manual === undefined || manual === "" || manual === null ? null : Number(manual),
    cupom: orc.cupom,
    total: orc.total,
    status,
    origem: dados.origem ?? existente?.origem ?? "sistema",
    observacoes: dados.observacoes ?? existente?.observacoes ?? null,
  };
}

async function buscar(negocio, id) {
  const ag = await Agendamento.findOne({ where: { id, negocioId: negocio.id } });
  if (!ag) throw Object.assign(new ErroAgenda("Agendamento não encontrado."), { status: 404 });
  return ag;
}

// opcoes.avisarCliente: true quando a mudança vem do sistema (o cliente recebe no WhatsApp).
// Pelo agente não precisa: ele já responde ao cliente na própria conversa.
async function criar(negocio, dados, opcoes = {}) {
  const valores = await montar(negocio, dados);
  const ag = await Agendamento.create(valores);
  A.avisarAgendaAtualizada(negocio, ag, "criado", opcoes);
  return ag;
}

async function alterar(negocio, id, dados, opcoes = {}) {
  const ag = await buscar(negocio, id);
  const valores = await montar(negocio, dados, ag);
  if (valores.status === "cancelado" && ag.status !== "cancelado") {
    valores.canceladoEm = new Date();
    valores.motivoCancelamento = dados.motivoCancelamento ?? ag.motivoCancelamento;
  }
  const dataAntiga = ag.data;
  const inicioAntigo = ag.inicio;
  const profAntigo = ag.profissionalId;
  const statusAntigo = ag.status;
  await ag.update(valores);
  // Mudança só de status (confirmar, concluir, faltou) não gera mensagem ao cliente
  const mudouHorario = dataAntiga !== ag.data || inicioAntigo !== ag.inicio || profAntigo !== ag.profissionalId;
  const evento = valores.status === "cancelado" && statusAntigo !== "cancelado" ? "cancelado" : "alterado";
  A.avisarAgendaAtualizada(negocio, ag, evento, { avisarCliente: !!opcoes.avisarCliente && (evento === "cancelado" || mudouHorario) });
  if (dataAntiga !== ag.data) A.avisarAgendaAtualizada(negocio, { ...ag.toJSON(), data: dataAntiga }, "alterado");
  return ag;
}

async function cancelar(negocio, id, motivo, opcoes = {}) {
  const ag = await buscar(negocio, id);
  if (ag.status === "cancelado") throw new ErroAgenda("Este agendamento já está cancelado.");
  await ag.update({ status: "cancelado", canceladoEm: new Date(), motivoCancelamento: motivo || null });
  A.avisarAgendaAtualizada(negocio, ag, "cancelado", opcoes);
  return ag;
}

async function remover(negocio, id, opcoes = {}) {
  const ag = await buscar(negocio, id);
  const copia = ag.toJSON();
  await ag.destroy();
  // Remover um agendamento já cancelado/concluído não avisa o cliente de novo
  const ativo = copia.status === "agendado" || copia.status === "confirmado";
  A.avisarAgendaAtualizada(negocio, copia, "removido", { avisarCliente: !!opcoes.avisarCliente && ativo && copia.data >= A.hojeISO() });
}

module.exports = { ErroAgenda, montar, buscar, criar, alterar, cancelar, remover, garantirCliente };
