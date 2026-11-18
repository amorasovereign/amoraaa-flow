const { Sequelize } = require("sequelize");

// Banco PostgreSQL. DATABASE_URL já vem pronta no Railway, Render, Supabase
// etc. — para Postgres local (docker, Postgres.app), monte a própria URL,
// ex.: postgresql://postgres:SENHA@localhost:5432/agenda
const urlConexao = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/agenda";

const sequelize = new Sequelize(urlConexao, {
  dialect: "postgres",
  logging: false,
  // A maioria dos provedores de nuvem exige SSL; Postgres local, não.
  dialectOptions: process.env.DB_SSL === "false" ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

sequelize.ready = Promise.resolve();

module.exports = sequelize;
