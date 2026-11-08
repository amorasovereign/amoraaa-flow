// Login por token (JWT) e escopo por negócio.
// - admin: escolhe o negócio no header x-negocio-id (vê todos)
// - demais papéis: sempre o próprio negócio, ignorando o header
const jwt = require("jsonwebtoken");
const { Usuario, Negocio } = require("../models");

const SEGREDO = () => process.env.JWT_SECRET || "troque-este-segredo";

function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id, papel: usuario.papel }, SEGREDO(), { expiresIn: "7d" });
}

async function autenticar(req, res, next) {
  try {
    const [tipo, token] = String(req.get("authorization") || "").split(" ");
    if (tipo !== "Bearer" || !token) return res.status(401).json({ error: "Faça login para continuar." });
    const dados = jwt.verify(token, SEGREDO());
    const usuario = await Usuario.findByPk(dados.id);
    if (!usuario || !usuario.ativo) return res.status(401).json({ error: "Acesso desativado ou inexistente." });
    req.usuario = usuario;
    return next();
  } catch {
    return res.status(401).json({ error: "Sessão expirada. Entre novamente." });
  }
}

const somenteAdmin = (req, res, next) =>
  req.usuario?.papel === "admin" ? next() : res.status(403).json({ error: "Apenas o administrador pode fazer isso." });

// Define req.negocio (o negócio em que a requisição vai trabalhar)
async function escopoNegocio(req, res, next) {
  const u = req.usuario;
  const id = u.papel === "admin" ? Number(req.get("x-negocio-id") || req.query.negocioId) : u.negocioId;
  if (!id) return res.status(400).json({ error: u.papel === "admin" ? "Selecione um negócio." : "Usuário sem negócio vinculado." });
  const negocio = await Negocio.findByPk(id);
  if (!negocio) return res.status(404).json({ error: "Negócio não encontrado." });
  if (!negocio.ativo && u.papel !== "admin") return res.status(403).json({ error: "Este negócio está desativado. Fale com o suporte." });
  req.negocio = negocio;
  return next();
}

// Restringe por papel dentro do negócio (admin sempre passa)
const permitir = (...papeis) => (req, res, next) =>
  req.usuario.papel === "admin" || papeis.includes(req.usuario.papel)
    ? next()
    : res.status(403).json({ error: "Seu acesso não permite esta ação." });

module.exports = { gerarToken, autenticar, somenteAdmin, escopoNegocio, permitir };
