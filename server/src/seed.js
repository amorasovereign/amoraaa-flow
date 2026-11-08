// Dados iniciais.
// 1) Sempre garante o acesso de administrador (ADMIN_EMAIL / ADMIN_SENHA).
// 2) Se não houver nenhum negócio, cria um salão de exemplo com profissionais,
//    serviços, cupons e um acesso de gestor (SEED_EXEMPLO=false desliga).
const bcrypt = require("bcryptjs");
const { Negocio, Usuario, Profissional, Servico, ProfissionalServico, Cupom } = require("./models");
const { HORARIOS_PADRAO } = require("./utils/agenda");

const SERVICOS = [
  { nome: "Corte feminino", categoria: "Cabelo", preco: 80, duracaoMin: 60, descricao: "Lavagem, corte e finalização simples." },
  { nome: "Corte masculino", categoria: "Cabelo", preco: 45, duracaoMin: 30, descricao: "Corte na máquina e/ou tesoura." },
  { nome: "Corte infantil", categoria: "Cabelo", preco: 35, duracaoMin: 30, descricao: "Até 10 anos." },
  { nome: "Escova", categoria: "Cabelo", preco: 50, duracaoMin: 45, descricao: "Escova modeladora." },
  { nome: "Hidratação", categoria: "Tratamento", preco: 70, duracaoMin: 45, descricao: "Hidratação profunda com máscara." },
  { nome: "Progressiva", categoria: "Química", preco: 250, duracaoMin: 180, descricao: "Alisamento progressivo (cabelo médio)." },
  { nome: "Coloração", categoria: "Química", preco: 150, duracaoMin: 120, descricao: "Coloração raiz a pontas." },
  { nome: "Barba", categoria: "Barbearia", preco: 35, duracaoMin: 30, descricao: "Barba com toalha quente." },
  { nome: "Sobrancelha", categoria: "Estética", preco: 25, duracaoMin: 15, descricao: "Design com pinça ou navalha." },
  { nome: "Manicure", categoria: "Unhas", preco: 30, duracaoMin: 45, descricao: "Mãos, esmaltação inclusa." },
  { nome: "Pedicure", categoria: "Unhas", preco: 35, duracaoMin: 45, descricao: "Pés, esmaltação inclusa." },
];

// Quem faz o quê no salão de exemplo (tempo próprio entre parênteses quando diferente)
const PROFISSIONAIS = [
  { nome: "Ana Souza", apelido: "Ana", cor: "#E0A23A", servicos: ["Corte feminino", "Escova", "Hidratação", "Progressiva", "Coloração", "Corte infantil"] },
  { nome: "Léo Martins", apelido: "Léo", cor: "#7CC4F0", servicos: ["Corte masculino", "Barba", "Corte infantil", "Sobrancelha"], tempos: { "Corte masculino": 40 } },
  {
    nome: "Carla Lima",
    apelido: "Carla",
    cor: "#F08BB8",
    servicos: ["Manicure", "Pedicure", "Sobrancelha"],
    // Carla tem horário próprio: não trabalha na terça e sai mais cedo
    horarios: {
      0: null,
      1: null,
      2: null,
      3: { abre: "10:00", fecha: "18:00", pausas: [{ inicio: "13:00", fim: "14:00" }] },
      4: { abre: "10:00", fecha: "18:00", pausas: [{ inicio: "13:00", fim: "14:00" }] },
      5: { abre: "10:00", fecha: "18:00", pausas: [{ inicio: "13:00", fim: "14:00" }] },
      6: { abre: "08:00", fecha: "14:00", pausas: [] },
    },
  },
];

async function semear() {
  const email = String(process.env.ADMIN_EMAIL || "admin@agenda.com").toLowerCase();
  if (!(await Usuario.findOne({ where: { email } }))) {
    const senha = process.env.ADMIN_SENHA || "admin123";
    await Usuario.create({ nome: "Administrador", email, papel: "admin", senhaHash: await bcrypt.hash(senha, 10) });
    console.log(`[seed] admin criado: ${email}${process.env.ADMIN_SENHA ? "" : " / admin123 (troque a senha!)"}`);
  }

  if (String(process.env.SEED_EXEMPLO ?? "true") === "false" || (await Negocio.count()) > 0) return;

  const negocio = await Negocio.create({
    nome: "Studio Corte & Arte",
    tipo: "Salão de beleza",
    instanciaWhatsapp: process.env.SEED_INSTANCIA || "studio-corte-arte",
    nomeAtendente: "Bia",
    horarios: HORARIOS_PADRAO,
    passoMin: 15,
    descontosQuantidade: [
      { minServicos: 2, percentual: 5 },
      { minServicos: 3, percentual: 10 },
    ],
    descontoMaxAgente: 5,
    antecedenciaCancelamentoHoras: 2,
    clienteEscolheProfissional: true,
  });

  const servicos = await Servico.bulkCreate(SERVICOS.map((s) => ({ ...s, negocioId: negocio.id })));
  const porNome = Object.fromEntries(servicos.map((s) => [s.nome, s]));
  for (const [i, p] of PROFISSIONAIS.entries()) {
    const prof = await Profissional.create({ negocioId: negocio.id, nome: p.nome, apelido: p.apelido, cor: p.cor, horarios: p.horarios || null, ordem: i });
    await ProfissionalServico.bulkCreate(
      p.servicos.map((n) => ({ profissionalId: prof.id, servicoId: porNome[n].id, duracaoMin: p.tempos?.[n] || null }))
    );
  }
  await Cupom.bulkCreate([
    { negocioId: negocio.id, codigo: "PRIMEIRAVEZ", descricao: "Primeira visita", percentual: 10 },
    { negocioId: negocio.id, codigo: "ANIVERSARIO", descricao: "Mês do aniversário", percentual: 15 },
  ]);
  await Usuario.create({
    nome: "Gestor do Studio",
    email: "gestor@studio.com",
    papel: "gestor",
    negocioId: negocio.id,
    senhaHash: await bcrypt.hash("gestor123", 10),
  });
  console.log("[seed] negócio de exemplo criado (gestor@studio.com / gestor123)");
}

module.exports = semear;
