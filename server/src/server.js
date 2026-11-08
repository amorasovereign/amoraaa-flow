require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { sequelize } = require("./models");
const routes = require("./routes");
const semear = require("./seed");

const app = express();
app.set("etag", false);
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ status: "ok", message: "API da agenda (multiempresa) rodando." }));
app.use("/api", routes);

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor.", detalhe: err.message });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.ready;
    await sequelize.sync(); // cria as tabelas que faltarem (SQLite)
    await semear();
    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  } catch (e) {
    console.error("Erro ao iniciar o servidor:", e);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = { app, start };