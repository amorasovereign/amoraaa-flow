// Cria negócios de EXEMPLO completos para demonstração em vendas.
//
//   npm run exemplos              -> cria os exemplos que ainda não existem
//   npm run exemplos -- --recriar -> apaga os exemplos e cria de novo (agenda atualizada)
//
// Cada exemplo tem: profissionais (com serviços e tempos próprios), serviços,
// horário de funcionamento com pausas, folgas/feriados, cupons, descontos,
// acessos (gestor, atendente e profissional) e agendamentos passados (financeiro)
// e futuros (agenda dos próximos dias). Senha de todos os acessos: demo123
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const M = require("../models");
const A = require("../utils/agenda");
const AG = require("../utils/agendamentos");

const SENHA = "demo123";
const RECRIAR = process.argv.includes("--recriar");

// ------------------------------ helpers ------------------------------
const dia = (abre, fecha, ...pausas) => ({ abre, fecha, pausas: pausas.map(([inicio, fim]) => ({ inicio, fim })) });
const semana = ({ dom = null, seg = null, ter = null, qua = null, qui = null, sex = null, sab = null }) => ({ 0: dom, 1: seg, 2: ter, 3: qua, 4: qui, 5: sex, 6: sab });
const uteis = (d, sab = null, dom = null) => semana({ seg: d, ter: d, qua: d, qui: d, sex: d, sab, dom });

// Gerador aleatório com semente (resultados iguais a cada execução)
function aleatorio(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const NOMES = [
  "Mariana Alves", "João Pedro Silva", "Fernanda Costa", "Rafael Oliveira", "Juliana Santos", "Lucas Pereira", "Camila Rodrigues",
  "Bruno Ferreira", "Patrícia Gomes", "Thiago Ribeiro", "Aline Carvalho", "Gabriel Almeida", "Larissa Melo", "Diego Barbosa",
  "Beatriz Rocha", "Felipe Cardoso", "Vanessa Araújo", "Rodrigo Nunes", "Letícia Moura", "André Teixeira", "Priscila Dias",
  "Marcelo Castro", "Renata Freitas", "Gustavo Pinto", "Tatiane Lima", "Eduardo Correia", "Débora Mendes", "Vinícius Ramos",
  "Natália Barros", "Caio Monteiro", "Isabela Farias", "Henrique Lopes", "Sabrina Viana", "Mateus Cunha", "Carolina Duarte",
];
const DDD = "5581";

// --------------------------- os exemplos ---------------------------
// servicos: [nome, categoria, preço, minutos, descrição]
// profissionais[].servicos: lista de nomes; tempos: { nome: minutos próprios }
const EXEMPLOS = [
  {
    instancia: "demo-clinica-vida-plena",
    nome: "Clínica Vida Plena",
    tipo: "Clínica de saúde",
    atendente: "Clara",
    slug: "vidaplena",
    horarios: uteis(dia("07:30", "18:30", ["12:00", "13:00"]), dia("08:00", "12:00")),
    passo: 10,
    descontos: [],
    descontoAgente: 0,
    antecedencia: 24,
    escolhe: true,
    observacoes:
      "Você é recepcionista virtual de uma clínica. Nunca dê orientação médica, diagnóstico ou indicação de remédio. Em caso de sintomas graves (dor no peito, falta de ar, desmaio, sangramento intenso), oriente procurar a emergência ou ligar 192 imediatamente. Pergunte se a consulta é particular ou por convênio; aceitamos Unimed e Bradesco Saúde (o valor por convênio é informado na recepção). Peça para chegar 15 minutos antes com documento com foto.",
    servicos: [
      ["Consulta clínica geral", "Consultas", 200, 30, "Consulta com clínico geral."],
      ["Retorno clínica geral", "Consultas", 100, 20, "Retorno em até 30 dias da consulta."],
      ["Consulta cardiológica", "Consultas", 320, 40, "Consulta com cardiologista."],
      ["Eletrocardiograma", "Exames", 120, 20, "ECG em repouso com laudo."],
      ["Consulta nutricional", "Nutrição", 220, 50, "Avaliação completa e plano alimentar."],
      ["Retorno nutricional", "Nutrição", 130, 30, "Ajuste do plano alimentar."],
      ["Bioimpedância", "Exames", 80, 20, "Avaliação de composição corporal."],
      ["Sessão de psicoterapia", "Psicologia", 180, 50, "Atendimento psicológico individual."],
      ["Avaliação fisioterapêutica", "Fisioterapia", 160, 50, "Primeira avaliação."],
      ["Sessão de fisioterapia", "Fisioterapia", 120, 45, "Sessão de reabilitação."],
      ["Pilates clínico", "Fisioterapia", 90, 50, "Aula individual de pilates terapêutico."],
    ],
    profissionais: [
      { nome: "Dr. Ricardo Menezes", apelido: "Dr. Ricardo", cor: "#0369a1", servicos: ["Consulta clínica geral", "Retorno clínica geral", "Eletrocardiograma"] },
      {
        nome: "Dra. Helena Duarte", apelido: "Dra. Helena", cor: "#7c3aed", servicos: ["Consulta cardiológica", "Eletrocardiograma", "Retorno clínica geral"],
        horarios: semana({ ter: dia("13:00", "18:30"), qui: dia("13:00", "18:30"), sab: dia("08:00", "12:00") }),
      },
      { nome: "Paula Nogueira", apelido: "Paula (nutri)", cor: "#15803d", servicos: ["Consulta nutricional", "Retorno nutricional", "Bioimpedância"], horarios: uteis(dia("08:00", "17:00", ["12:00", "13:00"])) },
      { nome: "Marcos Tavares", apelido: "Marcos (psicólogo)", cor: "#be185d", servicos: ["Sessão de psicoterapia"], horarios: semana({ seg: dia("13:00", "18:30"), qua: dia("08:00", "18:30", ["12:00", "13:00"]), sex: dia("08:00", "18:30", ["12:00", "13:00"]) }) },
      { nome: "Júlia Prado", apelido: "Júlia (fisio)", cor: "#c2410c", servicos: ["Avaliação fisioterapêutica", "Sessão de fisioterapia", "Pilates clínico"] },
    ],
    cupons: [["CHECKUP", "Check-up anual", 10]],
    bloqueios: [
      { motivo: "Dia da Consciência Negra (feriado)", data: "2026-11-20" },
      { motivo: "Congresso de cardiologia", profissional: "Dra. Helena Duarte", deDias: 9, ateDias: 12 },
    ],
    atendentes: [["Recepção Vida Plena", "recepcao"]],
    porDia: [6, 10],
  },
  {
    instancia: "demo-barbearia-navalha",
    nome: "Barbearia Navalha de Ouro",
    tipo: "Barbearia",
    atendente: "Zé",
    slug: "navalha",
    horarios: semana({ ter: dia("09:00", "20:00", ["13:00", "14:00"]), qua: dia("09:00", "20:00", ["13:00", "14:00"]), qui: dia("09:00", "20:00", ["13:00", "14:00"]), sex: dia("09:00", "21:00", ["13:00", "14:00"]), sab: dia("08:00", "18:00"), dom: dia("09:00", "13:00") }),
    passo: 10,
    descontos: [{ minServicos: 2, percentual: 5 }],
    descontoAgente: 5,
    antecedencia: 1,
    escolhe: true,
    observacoes: "Linguagem descontraída, de barbearia. Ofereça a cerveja ou o café cortesia ao confirmar. Pagamento: Pix, cartão ou dinheiro. Clube de assinatura: R$ 120/mês com cortes ilimitados (informe se perguntarem e diga que é na recepção).",
    servicos: [
      ["Corte masculino", "Cabelo", 45, 30, "Máquina e tesoura, com lavagem."],
      ["Corte degradê", "Cabelo", 50, 40, "Degradê/fade na navalha."],
      ["Barba", "Barba", 35, 30, "Barba com toalha quente."],
      ["Combo corte + barba", "Combos", 75, 60, "Corte e barba completos."],
      ["Pezinho", "Cabelo", 15, 10, "Acabamento do contorno."],
      ["Sobrancelha", "Acabamento", 15, 10, "Na navalha ou pinça."],
      ["Hidratação de barba", "Barba", 30, 20, "Óleos e balm."],
      ["Platinado", "Química", 160, 120, "Descoloração global."],
      ["Luzes masculinas", "Química", 120, 90, "Luzes na touca."],
      ["Corte infantil", "Cabelo", 35, 30, "Até 10 anos."],
    ],
    profissionais: [
      { nome: "Wesley Cardoso", apelido: "Wesley", cor: "#111827", servicos: ["Corte masculino", "Corte degradê", "Barba", "Combo corte + barba", "Pezinho", "Sobrancelha", "Hidratação de barba", "Platinado", "Luzes masculinas"] },
      { nome: "Diego Fontes", apelido: "Diego", cor: "#0369a1", servicos: ["Corte masculino", "Corte degradê", "Barba", "Combo corte + barba", "Pezinho", "Sobrancelha", "Corte infantil"] },
      {
        nome: "Kauã Ribeiro (aprendiz)", apelido: "Kauã", cor: "#c8860b", servicos: ["Corte masculino", "Barba", "Pezinho", "Corte infantil"],
        tempos: { "Corte masculino": 45, Barba: 40 },
        horarios: semana({ qua: dia("09:00", "17:00", ["13:00", "14:00"]), qui: dia("09:00", "17:00", ["13:00", "14:00"]), sex: dia("09:00", "17:00", ["13:00", "14:00"]), sab: dia("08:00", "18:00") }),
      },
    ],
    cupons: [["PRIMEIRO10", "Primeiro corte na casa", 10], ["PAIEFILHO", "Pai e filho juntos", 15]],
    bloqueios: [{ motivo: "Folga do Diego", profissional: "Diego Fontes", deDias: 5, ateDias: 5 }],
    atendentes: [],
    porDia: [8, 14],
  },
  {
    instancia: "demo-salao-bella-donna",
    nome: "Salão Bella Donna",
    tipo: "Salão de beleza",
    atendente: "Bia",
    slug: "belladonna",
    horarios: semana({ ter: dia("09:00", "19:00", ["12:30", "13:30"]), qua: dia("09:00", "19:00", ["12:30", "13:30"]), qui: dia("09:00", "19:00", ["12:30", "13:30"]), sex: dia("09:00", "20:00", ["12:30", "13:30"]), sab: dia("08:00", "17:00") }),
    passo: 15,
    descontos: [{ minServicos: 2, percentual: 5 }, { minServicos: 3, percentual: 10 }, { minServicos: 4, percentual: 15 }],
    descontoAgente: 5,
    antecedencia: 4,
    escolhe: true,
    observacoes: "Para química (progressiva, coloração, luzes), avise que o valor é para cabelo médio e pode variar após avaliação no salão. Noivas: indicar pacote com prova de penteado e maquiagem (falar com a recepção).",
    servicos: [
      ["Corte feminino", "Cabelo", 90, 60, "Lavagem, corte e finalização."],
      ["Escova", "Cabelo", 55, 45, "Escova modeladora."],
      ["Escova + prancha", "Cabelo", 70, 60, "Escova com prancha."],
      ["Hidratação", "Tratamento", 80, 45, "Máscara de hidratação profunda."],
      ["Cronograma capilar (sessão)", "Tratamento", 110, 60, "Hidratação, nutrição ou reconstrução."],
      ["Progressiva", "Química", 280, 180, "Alisamento progressivo."],
      ["Coloração", "Química", 170, 120, "Raiz a pontas."],
      ["Retoque de raiz", "Química", 110, 90, "Retoque de coloração."],
      ["Luzes / mechas", "Química", 320, 210, "Luzes no papel ou touca."],
      ["Penteado", "Festa", 150, 60, "Penteado para eventos."],
      ["Maquiagem social", "Festa", 160, 60, "Maquiagem para eventos."],
      ["Maquiagem de noiva", "Festa", 450, 120, "Inclui prova anterior."],
    ],
    profissionais: [
      { nome: "Renata Bastos", apelido: "Renata", cor: "#be185d", servicos: ["Corte feminino", "Escova", "Escova + prancha", "Hidratação", "Cronograma capilar (sessão)", "Progressiva"] },
      { nome: "Simone Araújo", apelido: "Simone", cor: "#7c3aed", servicos: ["Coloração", "Retoque de raiz", "Luzes / mechas", "Hidratação", "Escova"], tempos: { "Luzes / mechas": 240 } },
      { nome: "Tainá Freire", apelido: "Tainá", cor: "#c8860b", servicos: ["Penteado", "Maquiagem social", "Maquiagem de noiva", "Escova", "Escova + prancha"], horarios: semana({ qui: dia("12:00", "19:00"), sex: dia("12:00", "20:00"), sab: dia("08:00", "17:00") }) },
      { nome: "Jéssica Moura", apelido: "Jéssica", cor: "#0f766e", servicos: ["Corte feminino", "Escova", "Hidratação", "Cronograma capilar (sessão)"] },
    ],
    cupons: [["ANIVERSARIO", "Mês do aniversário", 15], ["INDICOU", "Indicação de cliente", 10]],
    bloqueios: [{ motivo: "Curso de colorimetria", profissional: "Simone Araújo", deDias: 3, ateDias: 3, inicio: "13:30", fim: "19:00" }],
    atendentes: [["Recepção Bella Donna", "recepcao"]],
    porDia: [6, 11],
  },
  {
    instancia: "demo-esmalteria-unhas-cia",
    nome: "Esmalteria Unhas & Cia",
    tipo: "Manicure e pedicure",
    atendente: "Lu",
    slug: "unhasecia",
    horarios: semana({ seg: dia("10:00", "19:00", ["13:00", "14:00"]), ter: dia("09:00", "19:00", ["13:00", "14:00"]), qua: dia("09:00", "19:00", ["13:00", "14:00"]), qui: dia("09:00", "19:00", ["13:00", "14:00"]), sex: dia("09:00", "20:00", ["13:00", "14:00"]), sab: dia("08:00", "17:00") }),
    passo: 15,
    descontos: [{ minServicos: 2, percentual: 10 }],
    descontoAgente: 5,
    antecedencia: 3,
    escolhe: true,
    observacoes: "Pergunte se a cliente prefere alguma cor ou se vai trazer o próprio esmalte. Remoção de gel de outro salão: acrescentar 15 minutos e R$ 20 (avise antes).",
    servicos: [
      ["Manicure", "Mãos", 30, 40, "Cutilagem e esmaltação."],
      ["Pedicure", "Pés", 35, 45, "Cutilagem e esmaltação."],
      ["Pé e mão", "Combos", 60, 80, "Manicure + pedicure."],
      ["Esmaltação em gel (mãos)", "Mãos", 70, 60, "Dura até 3 semanas."],
      ["Alongamento em fibra", "Alongamento", 180, 150, "Aplicação completa."],
      ["Manutenção de alongamento", "Alongamento", 110, 90, "A cada 20 dias."],
      ["Blindagem", "Mãos", 60, 45, "Fortalecimento da unha natural."],
      ["Spa dos pés", "Pés", 80, 60, "Esfoliação, hidratação e pedicure."],
      ["Nail art (por unha)", "Decoração", 8, 5, "Decoração simples."],
    ],
    profissionais: [
      { nome: "Luciana Prates", apelido: "Lu", cor: "#be185d", servicos: ["Manicure", "Pedicure", "Pé e mão", "Esmaltação em gel (mãos)", "Alongamento em fibra", "Manutenção de alongamento", "Blindagem", "Nail art (por unha)"] },
      { nome: "Daiane Rocha", apelido: "Dai", cor: "#7c3aed", servicos: ["Manicure", "Pedicure", "Pé e mão", "Spa dos pés", "Blindagem", "Nail art (por unha)"] },
      { nome: "Kelly Santana", apelido: "Kelly", cor: "#0f766e", servicos: ["Manicure", "Pedicure", "Pé e mão", "Esmaltação em gel (mãos)"], tempos: { Manicure: 50, Pedicure: 55 }, horarios: semana({ ter: dia("13:00", "19:00"), qua: dia("13:00", "19:00"), qui: dia("13:00", "19:00"), sex: dia("13:00", "20:00"), sab: dia("08:00", "17:00") }) },
    ],
    cupons: [["AMIGA10", "Trouxe uma amiga", 10]],
    bloqueios: [{ motivo: "Férias da Daiane", profissional: "Daiane Rocha", deDias: 14, ateDias: 21 }],
    atendentes: [],
    porDia: [8, 13],
  },
  {
    instancia: "demo-estetica-renova",
    nome: "Renova Estética Avançada",
    tipo: "Clínica de estética",
    atendente: "Sofia",
    slug: "renova",
    horarios: uteis(dia("09:00", "20:00", ["13:00", "14:00"]), dia("09:00", "14:00")),
    passo: 15,
    descontos: [{ minServicos: 2, percentual: 10 }],
    descontoAgente: 0,
    antecedencia: 24,
    escolhe: true,
    observacoes: "Pacotes de 10 sessões têm 15% de desconto (fechados na clínica). Para laser e micropigmentação é obrigatória a avaliação gratuita antes. Não prometa resultados.",
    servicos: [
      ["Avaliação estética", "Avaliação", 0, 30, "Avaliação gratuita."],
      ["Limpeza de pele profunda", "Facial", 180, 90, "Extração, máscara e hidratação."],
      ["Peeling químico", "Facial", 250, 60, "Renovação celular."],
      ["Drenagem linfática", "Corporal", 140, 60, "Técnica manual."],
      ["Massagem modeladora", "Corporal", 150, 60, "Redução de medidas."],
      ["Depilação a laser (área pequena)", "Laser", 120, 20, "Axila, buço ou virilha simples."],
      ["Depilação a laser (área grande)", "Laser", 280, 45, "Pernas ou costas."],
      ["Design de sobrancelhas com henna", "Olhar", 60, 40, "Design e henna."],
      ["Lash lifting", "Olhar", 150, 60, "Curvatura dos cílios naturais."],
      ["Micropigmentação de sobrancelhas", "Olhar", 650, 150, "Técnica fio a fio (retoque em 30 dias)."],
    ],
    profissionais: [
      { nome: "Dra. Fabiana Leal (biomédica)", apelido: "Dra. Fabiana", cor: "#7c3aed", servicos: ["Avaliação estética", "Peeling químico", "Depilação a laser (área pequena)", "Depilação a laser (área grande)", "Micropigmentação de sobrancelhas"] },
      { nome: "Bianca Torres", apelido: "Bianca", cor: "#0f766e", servicos: ["Avaliação estética", "Limpeza de pele profunda", "Drenagem linfática", "Massagem modeladora"] },
      { nome: "Yasmin Costa", apelido: "Yasmin", cor: "#be185d", servicos: ["Design de sobrancelhas com henna", "Lash lifting", "Limpeza de pele profunda"], horarios: semana({ seg: dia("13:00", "20:00"), ter: dia("13:00", "20:00"), qua: dia("13:00", "20:00"), qui: dia("13:00", "20:00"), sex: dia("13:00", "20:00"), sab: dia("09:00", "14:00") }) },
    ],
    cupons: [["VERAO15", "Campanha de verão", 15]],
    bloqueios: [{ motivo: "Manutenção do equipamento de laser", profissional: "Dra. Fabiana Leal (biomédica)", deDias: 2, ateDias: 2, inicio: "09:00", fim: "13:00" }],
    atendentes: [["Recepção Renova", "recepcao"]],
    porDia: [5, 9],
  },
  {
    instancia: "demo-petshop-patas-felizes",
    nome: "Patas Felizes Banho & Tosa",
    tipo: "Pet shop",
    atendente: "Toby",
    slug: "patasfelizes",
    horarios: uteis(dia("08:00", "18:00", ["12:00", "13:00"]), dia("08:00", "14:00")),
    passo: 30,
    descontos: [{ minServicos: 2, percentual: 5 }],
    descontoAgente: 5,
    antecedencia: 2,
    escolhe: false,
    observacoes: "Pergunte o nome, a raça e o porte do pet (P até 10 kg, M até 25 kg, G acima). Coloque o nome e a raça do pet nas observações do agendamento. Leva e traz: R$ 15 no bairro (combinar na recepção). Vacinas em dia são obrigatórias.",
    servicos: [
      ["Banho porte P", "Banho", 50, 60, "Até 10 kg."],
      ["Banho porte M", "Banho", 65, 75, "De 10 a 25 kg."],
      ["Banho porte G", "Banho", 85, 90, "Acima de 25 kg."],
      ["Tosa higiênica", "Tosa", 30, 30, "Patas, barriga e região íntima."],
      ["Tosa completa", "Tosa", 70, 60, "Máquina ou tesoura."],
      ["Hidratação de pelagem", "Tratamento", 35, 20, "Máscara e secagem."],
      ["Corte de unhas", "Cuidados", 20, 15, "Com lixamento."],
      ["Banho de gato", "Banho", 90, 60, "Manuseio especial para felinos."],
    ],
    profissionais: [
      { nome: "Rogério Lima (tosador)", apelido: "Rogério", cor: "#c2410c", servicos: ["Tosa higiênica", "Tosa completa", "Banho porte P", "Banho porte M", "Banho porte G", "Corte de unhas"] },
      { nome: "Amanda Reis (banhista)", apelido: "Amanda", cor: "#0369a1", servicos: ["Banho porte P", "Banho porte M", "Banho porte G", "Hidratação de pelagem", "Corte de unhas", "Banho de gato"] },
    ],
    cupons: [["PETNOVO", "Primeiro banho do pet", 10]],
    bloqueios: [],
    atendentes: [],
    porDia: [5, 9],
  },
  {
    instancia: "demo-odonto-sorriso",
    nome: "Odonto Sorriso Leve",
    tipo: "Clínica odontológica",
    atendente: "Lia",
    slug: "sorrisoleve",
    horarios: uteis(dia("08:00", "18:00", ["12:00", "13:30"])),
    passo: 15,
    descontos: [],
    descontoAgente: 0,
    antecedencia: 24,
    escolhe: true,
    observacoes: "Em caso de dor forte ou urgência, ofereça o primeiro horário livre de 'Atendimento de urgência'. Tratamentos (canal, implante, aparelho) só após avaliação; não informe valores deles. Aceitamos OdontoPrev e Amil Dental.",
    servicos: [
      ["Avaliação odontológica", "Avaliação", 120, 30, "Consulta inicial com plano de tratamento."],
      ["Limpeza (profilaxia)", "Prevenção", 180, 45, "Limpeza com ultrassom e polimento."],
      ["Restauração em resina", "Tratamento", 250, 60, "Por dente."],
      ["Clareamento em consultório", "Estética", 900, 90, "Sessão de clareamento."],
      ["Atendimento de urgência", "Urgência", 200, 30, "Alívio de dor."],
      ["Manutenção de aparelho", "Ortodontia", 150, 30, "Manutenção mensal."],
    ],
    profissionais: [
      { nome: "Dr. Felipe Aragão", apelido: "Dr. Felipe", cor: "#0369a1", servicos: ["Avaliação odontológica", "Limpeza (profilaxia)", "Restauração em resina", "Clareamento em consultório", "Atendimento de urgência"] },
      { nome: "Dra. Camila Rezende (ortodontista)", apelido: "Dra. Camila", cor: "#be185d", servicos: ["Avaliação odontológica", "Manutenção de aparelho"], horarios: semana({ ter: dia("08:00", "18:00", ["12:00", "13:30"]), qui: dia("08:00", "18:00", ["12:00", "13:30"]) }) },
    ],
    cupons: [],
    bloqueios: [{ motivo: "Dia da Consciência Negra (feriado)", data: "2026-11-20" }],
    atendentes: [["Recepção Sorriso Leve", "recepcao"]],
    porDia: [5, 9],
  },
  {
    instancia: "demo-studio-movimento",
    nome: "Movimento Pilates & Funcional",
    tipo: "Studio de pilates",
    atendente: "Duda",
    slug: "movimento",
    horarios: uteis(dia("06:00", "21:00", ["12:00", "15:00"]), dia("07:00", "12:00")),
    passo: 60,
    descontos: [],
    descontoAgente: 0,
    antecedencia: 6,
    escolhe: true,
    observacoes: "Aula experimental é gratuita (1 por pessoa). Planos mensais (2x ou 3x na semana) são fechados no studio. Peça para vir com roupa confortável e meia antiderrapante.",
    servicos: [
      ["Aula experimental", "Pilates", 0, 60, "Primeira aula gratuita."],
      ["Aula avulsa de pilates", "Pilates", 80, 60, "Aula individual."],
      ["Avaliação postural", "Avaliação", 120, 60, "Avaliação com relatório."],
      ["Treino funcional (personal)", "Funcional", 100, 60, "Treino individual."],
    ],
    profissionais: [
      { nome: "Eduarda Pires", apelido: "Duda", cor: "#0f766e", servicos: ["Aula experimental", "Aula avulsa de pilates", "Avaliação postural"] },
      { nome: "Marcelo Brito", apelido: "Marcelo", cor: "#c2410c", servicos: ["Aula experimental", "Aula avulsa de pilates", "Treino funcional (personal)"], horarios: uteis(dia("06:00", "12:00")) },
    ],
    cupons: [],
    bloqueios: [],
    atendentes: [],
    porDia: [6, 10],
  },
  {
    instancia: "demo-tattoo-traco-fino",
    nome: "Traço Fino Tattoo Studio",
    tipo: "Estúdio de tatuagem",
    atendente: "Nina",
    slug: "tracofino",
    horarios: semana({ ter: dia("11:00", "20:00"), qua: dia("11:00", "20:00"), qui: dia("11:00", "20:00"), sex: dia("11:00", "20:00"), sab: dia("10:00", "18:00") }),
    passo: 30,
    descontos: [],
    descontoAgente: 0,
    antecedencia: 48,
    escolhe: true,
    observacoes: "Tatuagem só para maiores de 18 anos com documento. O valor final depende do desenho; o agendamento de sessão exige sinal de 30% via Pix (combinar com o tatuador). Para orçamento, peça referência do desenho, tamanho em cm e local do corpo.",
    servicos: [
      ["Orçamento / conversa de projeto", "Projeto", 0, 30, "Conversa sobre o desenho."],
      ["Tatuagem pequena (até 7 cm)", "Tatuagem", 250, 90, "Fine line ou traço simples."],
      ["Sessão de tatuagem (3 horas)", "Tatuagem", 700, 180, "Peças médias e grandes."],
      ["Retoque", "Tatuagem", 0, 60, "Gratuito até 60 dias."],
      ["Piercing (aplicação)", "Piercing", 90, 30, "Joia básica inclusa."],
    ],
    profissionais: [
      { nome: "Rafa Monteiro", apelido: "Rafa", cor: "#111827", servicos: ["Orçamento / conversa de projeto", "Tatuagem pequena (até 7 cm)", "Sessão de tatuagem (3 horas)", "Retoque"] },
      { nome: "Nina Castro", apelido: "Nina", cor: "#be185d", servicos: ["Orçamento / conversa de projeto", "Tatuagem pequena (até 7 cm)", "Retoque", "Piercing (aplicação)"] },
    ],
    cupons: [],
    bloqueios: [{ motivo: "Convenção de tatuagem", profissional: "Rafa Monteiro", deDias: 16, ateDias: 18 }],
    atendentes: [],
    porDia: [3, 6],
  },
];

// ------------------------------ criação ------------------------------

async function apagarExemplo(instancia) {
  const n = await M.Negocio.findOne({ where: { instanciaWhatsapp: instancia } });
  if (!n) return;
  const profs = await M.Profissional.findAll({ where: { negocioId: n.id }, attributes: ["id"] });
  await M.ProfissionalServico.destroy({ where: { profissionalId: profs.map((p) => p.id) } });
  for (const Mod of [M.Agendamento, M.Bloqueio, M.Cupom, M.Cliente, M.Usuario, M.Profissional, M.Servico]) await Mod.destroy({ where: { negocioId: n.id } });
  await n.destroy();
}

async function criarExemplo(ex, indice) {
  const rnd = aleatorio(1000 + indice * 97);
  const pegar = (lista) => lista[Math.floor(rnd() * lista.length)];
  const hoje = A.hojeISO();

  const negocio = await M.Negocio.create({
    nome: ex.nome,
    tipo: ex.tipo,
    ativo: true,
    instanciaWhatsapp: ex.instancia,
    telefoneDono: null,
    nomeAtendente: ex.atendente,
    horarios: ex.horarios,
    passoMin: ex.passo,
    descontosQuantidade: ex.descontos,
    descontoMaxAgente: ex.descontoAgente,
    antecedenciaCancelamentoHoras: ex.antecedencia,
    clienteEscolheProfissional: ex.escolhe,
    observacoesAgente: ex.observacoes,
  });

  const servicos = await M.Servico.bulkCreate(
    ex.servicos.map(([nome, categoria, preco, duracaoMin, descricao]) => ({ negocioId: negocio.id, nome, categoria, preco, duracaoMin, descricao }))
  );
  const servPorNome = Object.fromEntries(servicos.map((s) => [s.nome, s]));

  const profs = [];
  for (const [i, p] of ex.profissionais.entries()) {
    const prof = await M.Profissional.create({ negocioId: negocio.id, nome: p.nome, apelido: p.apelido, cor: p.cor, horarios: p.horarios || null, ordem: i });
    await M.ProfissionalServico.bulkCreate(
      p.servicos.map((n) => {
        if (!servPorNome[n]) throw new Error(`[${ex.nome}] serviço "${n}" não existe (profissional ${p.nome}).`);
        return { profissionalId: prof.id, servicoId: servPorNome[n].id, duracaoMin: p.tempos?.[n] || null };
      })
    );
    profs.push(prof);
  }
  const profPorNome = Object.fromEntries(profs.map((p) => [p.nome, p]));

  if (ex.cupons.length) {
    await M.Cupom.bulkCreate(ex.cupons.map(([codigo, descricao, percentual]) => ({ negocioId: negocio.id, codigo, descricao, percentual })));
  }
  for (const b of ex.bloqueios) {
    const dataInicio = b.data || A.somarDias(hoje, b.deDias);
    const dataFim = b.data || A.somarDias(hoje, b.ateDias);
    await M.Bloqueio.create({
      negocioId: negocio.id,
      profissionalId: b.profissional ? profPorNome[b.profissional].id : null,
      dataInicio,
      dataFim,
      inicio: b.inicio || null,
      fim: b.fim || null,
      motivo: b.motivo,
    });
  }

  // Acessos: gestor, atendente(s) e o primeiro profissional
  const hash = await bcrypt.hash(SENHA, 10);
  const acessos = [{ nome: `Gestor ${ex.nome}`, email: `gestor@${ex.slug}.demo`, papel: "gestor" }];
  ex.atendentes.forEach(([nome, prefixo]) => acessos.push({ nome, email: `${prefixo}@${ex.slug}.demo`, papel: "atendente" }));
  acessos.push({ nome: profs[0].nome, email: `profissional@${ex.slug}.demo`, papel: "profissional", profissionalId: profs[0].id });
  for (const u of acessos) {
    await M.Usuario.destroy({ where: { email: u.email } });
    await M.Usuario.create({ ...u, negocioId: negocio.id, senhaHash: hash });
  }

  const listaProfs = await A.profissionaisDoNegocio(negocio.id);
  const clientes = NOMES.map((nome, i) => ({ nome, telefone: `${DDD}9${String(88000000 + indice * 1000 + i * 37).slice(-8)}` }));

  // ---- Passado (30 dias): atendimentos concluídos para o financeiro ----
  let passados = 0;
  for (let d = 30; d >= 1; d--) {
    const data = A.somarDias(hoje, -d);
    const bloqueios = await A.bloqueiosDoDia(negocio.id, data);
    for (const p of listaProfs) {
      const j = A.janelaProfissional(negocio, p, data, bloqueios);
      if (!j) continue;
      const feitos = Object.keys(p.tempos).map(Number);
      let t = j.abre + Math.floor(rnd() * 3) * (ex.passo || 15);
      while (t < j.fecha) {
        if (rnd() < 0.35) {
          t += 30; // horário vago
          continue;
        }
        const idServico = pegar(feitos);
        const s = servicos.find((x) => x.id === idServico);
        const itens = [{ servicoId: s.id, nome: s.nome, preco: Number(s.preco), duracaoMin: s.duracaoMin }];
        const dur = A.duracaoPara(p, itens);
        if (t + dur > j.fecha) break;
        if (j.ocupado.some((o) => o[0] < t + dur && t < o[1])) {
          t = j.ocupado.find((o) => o[0] < t + dur && t < o[1])[1];
          continue;
        }
        const orc = await A.calcularOrcamento(negocio, itens, { duracaoTotal: dur });
        const c = pegar(clientes);
        const r = rnd();
        await M.Agendamento.create({
          negocioId: negocio.id,
          profissionalId: p.id,
          profissionalNome: p.nome,
          clienteNome: c.nome,
          telefone: c.telefone,
          data,
          inicio: A.paraHora(t),
          fim: A.paraHora(t + dur),
          duracaoTotal: dur,
          servicos: orc.itens,
          subtotal: orc.subtotal,
          descontoPercentual: orc.descontoPercentual,
          descontoValor: orc.descontoValor,
          descontoMotivo: orc.descontoMotivo,
          total: orc.total,
          status: r < 0.85 ? "concluido" : r < 0.93 ? "faltou" : "cancelado",
          origem: rnd() < 0.6 ? "whatsapp" : "sistema",
        });
        passados += 1;
        t += dur;
      }
    }
  }

  // ---- Futuro (14 dias): agendamentos pelas regras reais (com conferência de horário) ----
  let futuros = 0;
  for (let d = 0; d <= 14; d++) {
    const data = A.somarDias(hoje, d);
    const meta = ex.porDia[0] + Math.floor(rnd() * (ex.porDia[1] - ex.porDia[0] + 1));
    const alvo = d <= 7 ? meta : Math.ceil(meta / 2); // semana seguinte mais vazia
    let tentativas = 0;
    let feitos = 0;
    while (feitos < alvo && tentativas < alvo * 4) {
      tentativas += 1;
      const p = pegar(listaProfs);
      const ids = Object.keys(p.tempos).map(Number);
      const qtd = rnd() < 0.25 && ids.length > 1 ? 2 : 1;
      const escolhidos = [...new Set(Array.from({ length: qtd }, () => pegar(ids)))];
      const itens = escolhidos.map((id) => {
        const s = servicos.find((x) => x.id === id);
        return { servicoId: s.id, nome: s.nome, preco: Number(s.preco), duracaoMin: s.duracaoMin };
      });
      const disp = await A.disponibilidade(negocio, itens, data, { profissional: p.id });
      const livres = disp.porProfissional?.[0]?.horarios || [];
      if (!livres.length) continue;
      const c = pegar(clientes);
      const escolheuProf = rnd() < 0.5;
      try {
        await AG.criar(negocio, {
          clienteNome: c.nome,
          telefone: c.telefone,
          data,
          inicio: pegar(livres),
          servicos: escolhidos,
          profissionalId: escolheuProf ? p.id : undefined,
          profissionalEscolhidoPeloCliente: escolheuProf,
          status: d <= 1 && rnd() < 0.6 ? "confirmado" : "agendado",
          origem: rnd() < 0.65 ? "whatsapp" : "sistema",
          observacoes: ex.tipo === "Pet shop" ? `Pet: ${pegar(["Thor", "Mel", "Luna", "Bob", "Nina", "Pipoca"])} (${pegar(["Shih-tzu", "Poodle", "Golden", "SRD", "Lhasa", "Spitz"])})` : null,
        });
        futuros += 1;
        feitos += 1;
      } catch {
        /* horário tomado por outro agendamento desta rodada: tenta de novo */
      }
    }
  }

  console.log(
    `✓ ${ex.nome.padEnd(32)} ${profs.length} profissionais · ${servicos.length} serviços · ${passados} atendimentos passados · ${futuros} futuros · login gestor@${ex.slug}.demo`
  );
}

async function main() {
  await M.sequelize.authenticate();
  await M.sequelize.ready;
  await M.sequelize.sync();
  console.log(RECRIAR ? "Recriando exemplos...\n" : "Criando exemplos que ainda não existem...\n");
  for (const [i, ex] of EXEMPLOS.entries()) {
    const existe = await M.Negocio.findOne({ where: { instanciaWhatsapp: ex.instancia } });
    if (existe && !RECRIAR) {
      console.log(`• ${ex.nome} já existe (use --recriar para gerar de novo)`);
      continue;
    }
    if (existe) await apagarExemplo(ex.instancia);
    await criarExemplo(ex, i);
  }
  console.log(`\nSenha de todos os acessos de exemplo: ${SENHA}`);
  console.log("Acessos por negócio: gestor@<negocio>.demo, recepcao@<negocio>.demo (quando houver) e profissional@<negocio>.demo");
  await M.sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});