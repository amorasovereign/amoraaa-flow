// Copia os dados do banco SQLite antigo (server/data/agenda.sqlite) para o
// PostgreSQL novo (DATABASE_URL do .env). Rode uma vez só, depois de subir
// o Postgres e configurar o .env — e com o servidor PARADO.
//
//   npm run migrar:postgres
//
// Requer o pacote "sqlite3" (já está em devDependencies) e o arquivo antigo
// em server/data/agenda.sqlite. Se não existir, o script só avisa e sai.
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { Sequelize } = require("sequelize");

const ARQUIVO_SQLITE = path.resolve(__dirname, "..", "..", "data", "agenda.sqlite");

// Ordem importa: tabelas "pai" antes das que dependem delas (FKs).
const TABELAS_EM_ORDEM = [
  "negocios",
  "usuarios",
  "profissionais",
  "servicos",
  "profissional_servicos",
  "clientes",
  "agendamentos",
  "cupons",
  "bloqueios",
];

async function migrar() {
  if (!fs.existsSync(ARQUIVO_SQLITE)) {
    console.log(`[migração] Nenhum banco SQLite encontrado em ${ARQUIVO_SQLITE} — nada para migrar.`);
    process.exit(0);
  }

  const origem = new Sequelize({ dialect: "sqlite", storage: ARQUIVO_SQLITE, logging: false });
  const destino = require("../db"); // já aponta para o Postgres via DATABASE_URL

  await origem.authenticate();
  await destino.authenticate();
  console.log("[migração] Conectado nos dois bancos. Criando tabelas no Postgres...");

  const { sequelize, ...Modelos } = require("../models");
  await sequelize.sync(); // garante que as tabelas existem no destino

  const modeloPorTabela = Object.fromEntries(Object.values(Modelos).map((m) => [m.getTableName(), m]));

  for (const tabela of TABELAS_EM_ORDEM) {
    const Modelo = modeloPorTabela[tabela];
    if (!Modelo) continue;

    const [linhas] = await origem.query(`SELECT * FROM "${tabela}"`);
    if (!linhas.length) {
      console.log(`[migração] ${tabela}: vazio, pulando.`);
      continue;
    }

    // SQLite guarda boolean como 0/1 e datas como texto — o Sequelize já
    // converte na leitura do modelo de origem, mas aqui lemos "cru" (SELECT *)
    // então normalizamos os campos BOOLEAN antes de inserir no Postgres.
    const camposBooleanos = Object.entries(Modelo.rawAttributes)
      .filter(([, def]) => def.type?.constructor?.name === "BOOLEAN")
      .map(([nome, def]) => def.field || nome);

    const linhasNormalizadas = linhas.map((linha) => {
      const copia = { ...linha };
      for (const campo of camposBooleanos) {
        if (campo in copia) copia[campo] = !!copia[campo];
      }
      return copia;
    });

    await Modelo.bulkCreate(linhasNormalizadas, { validate: false, individualHooks: false });
    console.log(`[migração] ${tabela}: ${linhasNormalizadas.length} registro(s) copiado(s).`);
  }

  // Os IDs foram inseridos "como estavam" no SQLite; ajusta as sequences do
  // Postgres para continuarem de onde pararam (senão o próximo INSERT colide).
  for (const tabela of TABELAS_EM_ORDEM) {
    await destino.query(
      `SELECT setval(pg_get_serial_sequence('"${tabela}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tabela}"), 1))`
    );
  }

  console.log("[migração] Concluído. Confira os dados no Postgres antes de apagar o arquivo .sqlite antigo.");
  await origem.close();
  await destino.close();
}

migrar().catch((e) => {
  console.error("[migração] Falhou:", e);
  process.exit(1);
});
