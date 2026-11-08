const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { Usuario, Negocio } = require("../models");
const { gerarToken, autenticar } = require("../middlewares/auth");

const router = Router();

const publico = async (u) => {
  const negocio = u.negocioId ? await Negocio.findByPk(u.negocioId, { attributes: ["id", "nome", "tipo", "ativo"] }) : null;
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    papel: u.papel,
    negocioId: u.negocioId,
    profissionalId: u.profissionalId,
    negocio,
  };
};

// POST /api/auth/login { email, senha }
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "");
    const u = await Usuario.scope("comSenha").findOne({ where: { email } });
    if (!u || !u.ativo || !(await bcrypt.compare(senha, u.senhaHash))) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }
    if (u.negocioId) {
      const n = await Negocio.findByPk(u.negocioId);
      if (!n || !n.ativo) return res.status(403).json({ error: "Este negócio está desativado. Fale com o suporte." });
    }
    await u.update({ ultimoAcesso: new Date() });
    return res.json({ token: gerarToken(u), usuario: await publico(u) });
  } catch (e) {
    return next(e);
  }
});

// GET /api/auth/me
router.get("/me", autenticar, async (req, res) => res.json(await publico(req.usuario)));

// PUT /api/auth/senha { atual, nova }
router.put("/senha", autenticar, async (req, res, next) => {
  try {
    const { atual, nova } = req.body || {};
    if (!nova || String(nova).length < 6) return res.status(400).json({ error: "A nova senha precisa ter pelo menos 6 caracteres." });
    const u = await Usuario.scope("comSenha").findByPk(req.usuario.id);
    if (!(await bcrypt.compare(String(atual || ""), u.senhaHash))) return res.status(400).json({ error: "Senha atual incorreta." });
    await u.update({ senhaHash: await bcrypt.hash(String(nova), 10) });
    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
