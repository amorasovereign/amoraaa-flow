// Área do administrador (você): negócios e acessos de todos os clientes.
const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { Negocio, Usuario, Profissional, Servico, Agendamento } = require("../models");
const A = require("../utils/agenda");

const router = Router();

const tratar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError") {
      const campo = e.errors?.[0]?.path;
      return res.status(400).json({ error: campo === "email" ? "Já existe um acesso com este e-mail." : campo === "instanciaWhatsapp" ? "Esta instância do WhatsApp já está ligada a outro negócio." : "Registro duplicado." });
    }
    return next(e);
  }
};

// ------------------------------ Negócios ------------------------------
router.get("/negocios", tratar(async (req, res) => {
  const lista = await Negocio.findAll({ order: [["nome", "ASC"]] });
  const hoje = A.hojeISO();
  const resumo = await Promise.all(
    lista.map(async (n) => ({
      ...n.toJSON(),
      profissionais: await Profissional.count({ where: { negocioId: n.id, ativo: true } }),
      servicos: await Servico.count({ where: { negocioId: n.id, ativo: true } }),
      usuarios: await Usuario.count({ where: { negocioId: n.id } }),
      agendamentosHoje: await Agendamento.count({ where: { negocioId: n.id, data: hoje, status: { [Op.ne]: "cancelado" } } }),
    }))
  );
  res.json(resumo);
}));

const camposNegocio = (b) => {
  const d = {};
  ["nome", "tipo", "ativo", "nomeAtendente", "observacoesAgente", "clienteEscolheProfissional", "passoMin", "antecedenciaCancelamentoHoras", "descontoMaxAgente"].forEach((k) => {
    if (b[k] !== undefined) d[k] = b[k];
  });
  if (b.telefoneDono !== undefined) d.telefoneDono = A.somenteDigitos(b.telefoneDono) || null;
  if (b.instanciaWhatsapp !== undefined) d.instanciaWhatsapp = String(b.instanciaWhatsapp || "").trim() || null;
  return d;
};

router.post("/negocios", tratar(async (req, res) => {
  const d = camposNegocio(req.body || {});
  if (!d.nome) return res.status(400).json({ error: "Informe o nome do negócio." });
  const n = await Negocio.create({ ...d, horarios: A.HORARIOS_PADRAO, descontosQuantidade: [] });
  res.status(201).json(n);
}));

router.put("/negocios/:id", tratar(async (req, res) => {
  const n = await Negocio.findByPk(req.params.id);
  if (!n) return res.status(404).json({ error: "Negócio não encontrado." });
  await n.update(camposNegocio(req.body || {}));
  res.json(n);
}));

router.delete("/negocios/:id", tratar(async (req, res) => {
  const n = await Negocio.findByPk(req.params.id);
  if (!n) return res.status(404).json({ error: "Negócio não encontrado." });
  const ags = await Agendamento.count({ where: { negocioId: n.id } });
  if (ags > 0) return res.status(400).json({ error: "Este negócio tem agendamentos. Desative-o em vez de excluir." });
  await Usuario.destroy({ where: { negocioId: n.id } });
  await n.destroy();
  res.json({ ok: true });
}));

// ------------------------------ Acessos ------------------------------
router.get("/usuarios", tratar(async (req, res) => {
  const where = {};
  if (req.query.negocioId) where.negocioId = Number(req.query.negocioId);
  res.json(
    await Usuario.findAll({
      where,
      include: [{ model: Negocio, attributes: ["id", "nome"] }, { model: Profissional, attributes: ["id", "nome"] }],
      order: [["nome", "ASC"]],
    })
  );
}));

async function validarUsuario(d, atual) {
  const papel = d.papel ?? atual?.papel;
  if (!["admin", "gestor", "atendente", "profissional"].includes(papel)) return "Papel inválido.";
  const negocioId = d.negocioId !== undefined ? d.negocioId : atual?.negocioId;
  if (papel !== "admin" && !negocioId) return "Escolha o negócio deste acesso.";
  if (papel === "profissional") {
    const profId = d.profissionalId !== undefined ? d.profissionalId : atual?.profissionalId;
    if (!profId) return "Escolha qual profissional este acesso representa.";
    const p = await Profissional.findByPk(profId);
    if (!p || Number(p.negocioId) !== Number(negocioId)) return "O profissional não pertence a este negócio.";
  }
  return null;
}

router.post("/usuarios", tratar(async (req, res) => {
  const b = req.body || {};
  const d = {
    nome: String(b.nome || "").trim(),
    email: String(b.email || "").trim().toLowerCase(),
    papel: b.papel || "gestor",
    negocioId: b.papel === "admin" ? null : Number(b.negocioId) || null,
    profissionalId: b.papel === "profissional" ? Number(b.profissionalId) || null : null,
    ativo: b.ativo !== false,
  };
  if (!d.nome || !d.email || !b.senha) return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
  if (String(b.senha).length < 6) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
  const erro = await validarUsuario(d);
  if (erro) return res.status(400).json({ error: erro });
  const u = await Usuario.create({ ...d, senhaHash: await bcrypt.hash(String(b.senha), 10) });
  res.status(201).json(await Usuario.findByPk(u.id));
}));

router.put("/usuarios/:id", tratar(async (req, res) => {
  const u = await Usuario.findByPk(req.params.id);
  if (!u) return res.status(404).json({ error: "Acesso não encontrado." });
  const b = req.body || {};
  const d = {};
  if (b.nome !== undefined) d.nome = String(b.nome).trim();
  if (b.email !== undefined) d.email = String(b.email).trim().toLowerCase();
  if (b.papel !== undefined) d.papel = b.papel;
  if (b.ativo !== undefined) d.ativo = !!b.ativo;
  if (b.negocioId !== undefined) d.negocioId = Number(b.negocioId) || null;
  if (b.profissionalId !== undefined) d.profissionalId = Number(b.profissionalId) || null;
  if ((d.papel ?? u.papel) === "admin") d.negocioId = null;
  if ((d.papel ?? u.papel) !== "profissional") d.profissionalId = null;
  if (Number(u.id) === Number(req.usuario.id) && (d.ativo === false || (d.papel && d.papel !== "admin"))) {
    return res.status(400).json({ error: "Você não pode desativar nem rebaixar o seu próprio acesso." });
  }
  const erro = await validarUsuario(d, u);
  if (erro) return res.status(400).json({ error: erro });
  if (b.senha) {
    if (String(b.senha).length < 6) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
    d.senhaHash = await bcrypt.hash(String(b.senha), 10);
  }
  await u.update(d);
  res.json(await Usuario.findByPk(u.id));
}));

router.delete("/usuarios/:id", tratar(async (req, res) => {
  if (Number(req.params.id) === Number(req.usuario.id)) return res.status(400).json({ error: "Você não pode excluir o seu próprio acesso." });
  await Usuario.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

module.exports = router;
