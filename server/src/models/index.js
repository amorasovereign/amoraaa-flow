const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// ---------------------------------------------------------------------------
// Multiempresa: cada negócio (salão, barbearia, clínica) tem seus próprios
// profissionais, serviços, clientes, agendamentos, cupons e bloqueios.
// Formato de horários (negócio e profissional):
//   { "0": null, "1": { "abre": "09:00", "fecha": "19:00",
//                       "pausas": [{ "inicio": "12:00", "fim": "13:00" }] }, ... }
//   0 = domingo ... 6 = sábado; null = fechado/folga.
// ---------------------------------------------------------------------------

const Negocio = sequelize.define(
  "Negocio",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    tipo: { type: DataTypes.STRING(40), allowNull: true }, // salão, barbearia, clínica...
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    telefoneDono: { type: DataTypes.STRING(20), allowNull: true }, // recebe a agenda no WhatsApp
    // Nome da instância da Evolution API ligada ao WhatsApp deste negócio.
    // É assim que o n8n descobre de qual negócio é a mensagem.
    instanciaWhatsapp: { type: DataTypes.STRING(80), allowNull: true, unique: true },
    nomeAtendente: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "Bia" },
    horarios: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    passoMin: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 15 },
    descontosQuantidade: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    descontoMaxAgente: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    antecedenciaCancelamentoHoras: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    // O cliente pode escolher o profissional pelo WhatsApp?
    clienteEscolheProfissional: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    observacoesAgente: { type: DataTypes.TEXT, allowNull: true }, // instruções extras para o agente
    // Avisar o cliente no WhatsApp quando o negócio marca, remarca ou cancela pelo sistema
    avisarClienteMudancas: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "negocios", timestamps: true }
);

// Acessos ao sistema.
//   admin       = você: vê e administra todos os negócios
//   gestor      = dono/gerente: tudo do próprio negócio
//   atendente   = recepção: agenda e agendamentos do próprio negócio
//   profissional= vê a própria agenda
const Usuario = sequelize.define(
  "Usuario",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    senhaHash: { type: DataTypes.STRING(120), allowNull: false },
    papel: { type: DataTypes.ENUM("admin", "gestor", "atendente", "profissional"), allowNull: false, defaultValue: "gestor" },
    negocioId: { type: DataTypes.INTEGER, allowNull: true }, // null só para admin
    profissionalId: { type: DataTypes.INTEGER, allowNull: true }, // para papel "profissional"
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ultimoAcesso: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "usuarios",
    timestamps: true,
    defaultScope: { attributes: { exclude: ["senhaHash"] } },
    scopes: { comSenha: { attributes: { include: ["senhaHash"] } } },
  }
);

// Funcionários que atendem (cabeleireiros, barbeiros, manicures...)
const Profissional = sequelize.define(
  "Profissional",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    negocioId: { type: DataTypes.INTEGER, allowNull: false },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    apelido: { type: DataTypes.STRING(60), allowNull: true }, // como o cliente chama ("Léo")
    telefone: { type: DataTypes.STRING(20), allowNull: true },
    cor: { type: DataTypes.STRING(9), allowNull: false, defaultValue: "#c8860b" },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // null = usa o horário do negócio; senão, horário próprio (dentro do horário do negócio)
    horarios: { type: DataTypes.JSON, allowNull: true },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "profissionais", timestamps: true }
);

// Serviços do negócio (preço e tempo padrão)
const Servico = sequelize.define(
  "Servico",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    negocioId: { type: DataTypes.INTEGER, allowNull: false },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    categoria: { type: DataTypes.STRING(60), allowNull: true },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    preco: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    duracaoMin: { type: DataTypes.INTEGER, allowNull: false },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "servicos", timestamps: true }
);

// Quais serviços cada profissional faz (com tempo próprio opcional)
const ProfissionalServico = sequelize.define(
  "ProfissionalServico",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    profissionalId: { type: DataTypes.INTEGER, allowNull: false },
    servicoId: { type: DataTypes.INTEGER, allowNull: false },
    duracaoMin: { type: DataTypes.INTEGER, allowNull: true }, // null = tempo padrão do serviço
  },
  {
    tableName: "profissional_servicos",
    timestamps: false,
    indexes: [{ unique: true, fields: ["profissionalId", "servicoId"] }],
  }
);

// Clientes (identificados pelo telefone do WhatsApp, por negócio)
const Cliente = sequelize.define(
  "Cliente",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    negocioId: { type: DataTypes.INTEGER, allowNull: false },
    nome: { type: DataTypes.STRING(150), allowNull: false },
    telefone: { type: DataTypes.STRING(20), allowNull: false },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "clientes", timestamps: true, indexes: [{ unique: true, fields: ["negocioId", "telefone"] }] }
);

const Agendamento = sequelize.define(
  "Agendamento",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    negocioId: { type: DataTypes.INTEGER, allowNull: false },
    profissionalId: { type: DataTypes.INTEGER, allowNull: false },
    profissionalNome: { type: DataTypes.STRING(120), allowNull: true }, // cópia para histórico
    clienteId: { type: DataTypes.INTEGER, allowNull: true },
    clienteNome: { type: DataTypes.STRING(150), allowNull: false },
    telefone: { type: DataTypes.STRING(20), allowNull: true },
    data: { type: DataTypes.DATEONLY, allowNull: false },
    inicio: { type: DataTypes.STRING(5), allowNull: false }, // "HH:MM"
    fim: { type: DataTypes.STRING(5), allowNull: false },
    duracaoTotal: { type: DataTypes.INTEGER, allowNull: false },
    // [{ servicoId, nome, preco, duracaoMin }]
    servicos: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    descontoPercentual: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    descontoValor: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    descontoMotivo: { type: DataTypes.STRING(200), allowNull: true },
    descontoExtraPercentual: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    descontoManualPercentual: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    cupom: { type: DataTypes.STRING(40), allowNull: true },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM("agendado", "confirmado", "concluido", "cancelado", "faltou"),
      allowNull: false,
      defaultValue: "agendado",
    },
    origem: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "sistema" }, // sistema | whatsapp
    profissionalEscolhidoPeloCliente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    canceladoEm: { type: DataTypes.DATE, allowNull: true },
    motivoCancelamento: { type: DataTypes.STRING(300), allowNull: true },
  },
  {
    tableName: "agendamentos",
    timestamps: true,
    indexes: [{ fields: ["negocioId", "data"] }, { fields: ["profissionalId", "data"] }],
  }
);

const Cupom = sequelize.define(
  "Cupom",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    negocioId: { type: DataTypes.INTEGER, allowNull: false },
    codigo: { type: DataTypes.STRING(40), allowNull: false },
    descricao: { type: DataTypes.STRING(200), allowNull: true },
    percentual: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    validoAte: { type: DataTypes.DATEONLY, allowNull: true },
  },
  { tableName: "cupons", timestamps: true, indexes: [{ unique: true, fields: ["negocioId", "codigo"] }] }
);

// Bloqueios na agenda: feriados, folgas, férias, compromissos.
// profissionalId null = vale para o negócio todo. inicio/fim null = dia inteiro.
const Bloqueio = sequelize.define(
  "Bloqueio",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    negocioId: { type: DataTypes.INTEGER, allowNull: false },
    profissionalId: { type: DataTypes.INTEGER, allowNull: true },
    dataInicio: { type: DataTypes.DATEONLY, allowNull: false },
    dataFim: { type: DataTypes.DATEONLY, allowNull: false },
    inicio: { type: DataTypes.STRING(5), allowNull: true },
    fim: { type: DataTypes.STRING(5), allowNull: true },
    motivo: { type: DataTypes.STRING(150), allowNull: true },
  },
  { tableName: "bloqueios", timestamps: true }
);

Negocio.hasMany(Usuario, { foreignKey: "negocioId" });
Usuario.belongsTo(Negocio, { foreignKey: "negocioId" });
Negocio.hasMany(Profissional, { foreignKey: "negocioId" });
Profissional.belongsTo(Negocio, { foreignKey: "negocioId" });
Negocio.hasMany(Servico, { foreignKey: "negocioId" });
Negocio.hasMany(Cliente, { foreignKey: "negocioId" });
Negocio.hasMany(Agendamento, { foreignKey: "negocioId" });
Negocio.hasMany(Cupom, { foreignKey: "negocioId" });
Negocio.hasMany(Bloqueio, { foreignKey: "negocioId" });

Profissional.belongsToMany(Servico, { through: ProfissionalServico, foreignKey: "profissionalId", otherKey: "servicoId" });
Servico.belongsToMany(Profissional, { through: ProfissionalServico, foreignKey: "servicoId", otherKey: "profissionalId" });
Profissional.hasMany(ProfissionalServico, { foreignKey: "profissionalId" });
ProfissionalServico.belongsTo(Servico, { foreignKey: "servicoId" });

Profissional.hasMany(Agendamento, { foreignKey: "profissionalId" });
Agendamento.belongsTo(Profissional, { foreignKey: "profissionalId" });
Cliente.hasMany(Agendamento, { foreignKey: "clienteId" });
Agendamento.belongsTo(Cliente, { foreignKey: "clienteId" });
Usuario.belongsTo(Profissional, { foreignKey: "profissionalId" });

module.exports = {
  sequelize,
  Negocio,
  Usuario,
  Profissional,
  Servico,
  ProfissionalServico,
  Cliente,
  Agendamento,
  Cupom,
  Bloqueio,
};