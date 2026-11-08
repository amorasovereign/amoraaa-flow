const path = require("path");
const fs = require("fs");
const { Sequelize } = require("sequelize");

// Banco SQLite em arquivo. SQLITE_PATH define onde fica o arquivo
// (padrão: server/data/agenda.sqlite). No Railway, aponte para um volume
// (ex.: /data/agenda.sqlite) para os dados não sumirem a cada deploy.
const arquivo = path.resolve(process.env.SQLITE_PATH || path.join(__dirname, "..", "data", "agenda.sqlite"));
fs.mkdirSync(path.dirname(arquivo), { recursive: true });

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: arquivo,
  logging: false,
});

// Mais segurança e desempenho com várias requisições ao mesmo tempo
sequelize.ready = (async () => {
  await sequelize.query("PRAGMA journal_mode = WAL;");
  await sequelize.query("PRAGMA foreign_keys = ON;");
  await sequelize.query("PRAGMA busy_timeout = 5000;");
})();

module.exports = sequelize;