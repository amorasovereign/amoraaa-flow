# Agenda multiempresa com agente de WhatsApp

Sistema de agendamento para salões, barbearias, manicures, clínicas e afins, vendido para vários negócios ao mesmo tempo.

- **Você (administrador)** cadastra os negócios e os acessos e entra em qualquer um deles.
- **Cada negócio** vê só os próprios dados: profissionais, serviços, agenda, clientes e financeiro.
- **O agente de WhatsApp** (n8n + Evolution API) atende os clientes de todos os negócios num único fluxo, identificando o negócio pela instância do WhatsApp.

## Estrutura

```
agenda-salao/
├── server/                         API (Node + Express + Sequelize + SQLite)
│   ├── src/
│   │   ├── server.js               inicia a API, cria/ajusta as tabelas e roda o seed
│   │   ├── db.js                   banco SQLite em arquivo (SQLITE_PATH)
│   │   ├── seed.js                 cria o admin e um salão de exemplo (banco vazio)
│   │   ├── models/index.js         Negocio, Usuario, Profissional, Servico,
│   │   │                           ProfissionalServico, Cliente, Agendamento, Cupom, Bloqueio
│   │   ├── middlewares/auth.js     login (JWT), escopo por negócio e permissões por papel
│   │   ├── routes/
│   │   │   ├── auth.js             login, "quem sou eu", trocar senha
│   │   │   ├── admin.js            negócios e acessos (só admin)
│   │   │   ├── index.js            rotas do negócio: profissionais, serviços, agenda,
│   │   │   │                       agendamentos, bloqueios, cupons, relatórios
│   │   │   └── agente.js           rotas do n8n (x-api-key + x-instancia)
│   │   ├── utils/
│   │   │   ├── agenda.js           horários, pausas, bloqueios, disponibilidade por
│   │   │   │                       profissional, escolha automática, orçamento, textos
│   │   │   └── agendamentos.js     criar/alterar/cancelar com validação e avisos
│   │   └── scripts/exemplos.js     9 negócios de demonstração completos
│   └── .env.example
├── cliente/                        Tela (React + Vite), mesmo layout do CRM
│   └── src/
│       ├── auth.jsx                sessão, papel e negócio selecionado
│       ├── services/api.js         axios com token e x-negocio-id
│       ├── components/             Layout, AgendaDia, AgendamentoModal,
│       │                           AcoesAgendamento, HorariosEditor
│       └── pages/                  Login, Agenda, Agendamentos, Financeiro,
│                                   Profissionais, Serviços, Configurações,
│                                   admin/Negocios, admin/Usuarios
└── n8n-agenda-multiempresa.json    fluxo do n8n (agente, agenda das 3h, avisos)
```

## Acessos e papéis

| Papel | O que vê e faz |
|---|---|
| **admin** (você) | Todos os negócios. Cadastra negócios, acessos e a instância do WhatsApp de cada um. Escolhe o negócio no topo da tela. |
| **gestor** (dono/gerente) | Tudo do próprio negócio: agenda, profissionais, serviços, financeiro, configurações, cupons e folgas. |
| **atendente** (recepção) | Agenda, agendamentos, folgas e financeiro do próprio negócio. |
| **profissional** | Só a própria agenda; marca atendimentos como confirmados, concluídos ou falta. |

O isolamento é feito no servidor: um usuário de um negócio nunca acessa dados de outro, mesmo alterando o cabeçalho da requisição.

## Regras da agenda

- **Funcionamento do negócio:** dias da semana, abertura, fechamento e quantas pausas quiser por dia (almoço, intervalo).
- **Profissionais:** cada um tem os serviços que faz, com tempo próprio opcional (ex.: aprendiz demora mais), e pode ter horário próprio dentro do horário do negócio.
- **Folgas e bloqueios:** feriados, férias, cursos, para o negócio todo ou um profissional, num dia, num período ou num intervalo de horas.
- **Vários serviços no mesmo agendamento:** o tempo é somado e feito pelo mesmo profissional.
- **Escolha do profissional:** o cliente escolhe (no WhatsApp ou na recepção) ou o sistema escolhe automaticamente quem faz o serviço, está livre e tem a agenda mais leve no dia.
- **Conflitos:** não deixa marcar fora do horário, em pausa, em bloqueio, no passado ou em cima de outro atendimento do mesmo profissional, e devolve os horários livres.
- **Descontos:** por quantidade de serviços, por cupom, extra do agente (até o limite configurado) e manual.
- **Cancelamento:** pelo WhatsApp (até X horas antes, configurável) ou pelo sistema, com motivo.

### Avisos no WhatsApp

| Quem muda | O dono recebe | O cliente recebe |
|---|---|---|
| Cliente pelo WhatsApp (agente) | O que mudou + agenda do dia | A própria resposta do agente na conversa |
| Negócio pelo sistema (marcar, remarcar, cancelar) | O que mudou + agenda do dia | Mensagem automática de confirmação, remarcação ou cancelamento (com o motivo) |

O aviso ao cliente pode ser desligado por negócio (Configurações) ou em cada ação (caixa “Avisar o cliente no WhatsApp”).

## Rodar local

```bash
# API
cd server
cp .env.example .env   # preencha JWT_SECRET, ADMIN_EMAIL e ADMIN_SENHA (o banco SQLite é criado sozinho em server/data/)
npm install
npm run dev            # http://localhost:3000 (cria as tabelas, o admin e um salão de exemplo)

# Exemplos de demonstração (opcional)
npm run exemplos              # cria 9 negócios completos
npm run exemplos -- --recriar # apaga e recria (atualiza as datas da agenda)

# Tela
cd ../cliente
cp .env.example .env   # VITE_API_URL=http://localhost:3000/api
npm install
npm run dev            # http://localhost:5173
```

Primeiro acesso: o e-mail e a senha de `ADMIN_EMAIL` / `ADMIN_SENHA` (padrão `admin@agenda.com` / `admin123`, troque em produção).

## Exemplos de demonstração (`npm run exemplos`)

Senha de todos os acessos: **demo123**.

| Negócio | Tipo | Destaques | Login do gestor |
|---|---|---|---|
| Clínica Vida Plena | Clínica de saúde | 5 profissionais (clínico, cardiologista, nutricionista, psicólogo, fisioterapeuta), horários diferentes por profissional, congresso, feriado, orientação para emergências | gestor@vidaplena.demo |
| Barbearia Navalha de Ouro | Barbearia | Combo corte + barba, aprendiz com tempo maior, domingo meio período, folga, cupons | gestor@navalha.demo |
| Salão Bella Donna | Salão de beleza | Química, noivas, descontos por quantidade, maquiadora em meio período, curso | gestor@belladonna.demo |
| Esmalteria Unhas & Cia | Manicure | Gel, alongamento, manutenção, férias de profissional | gestor@unhasecia.demo |
| Renova Estética Avançada | Clínica de estética | Avaliação gratuita, laser, micropigmentação, manutenção de equipamento | gestor@renova.demo |
| Patas Felizes Banho & Tosa | Pet shop | Banho por porte, tosa, dados do pet nas observações, escolha automática do profissional | gestor@patasfelizes.demo |
| Odonto Sorriso Leve | Clínica odontológica | Urgência, ortodontista só 2 dias por semana, convênios | gestor@sorrisoleve.demo |
| Movimento Pilates & Funcional | Studio de pilates | Aula experimental gratuita, grade de 60 min | gestor@movimento.demo |
| Traço Fino Tattoo Studio | Estúdio de tatuagem | Sessões longas, orçamento, convenção | gestor@tracofino.demo |

Cada exemplo também tem `profissional@<negocio>.demo` (e `recepcao@<negocio>.demo` quando há recepção), 30 dias de histórico para o financeiro e 14 dias de agenda futura. As instâncias de WhatsApp começam com `demo-`.

## Railway

- **Banco (SQLite):** no serviço `server`, crie um **Volume** montado em `/data` e defina `SQLITE_PATH=/data/agenda.sqlite`. Sem o volume, o arquivo do banco é apagado a cada deploy.
- **Serviço `server`:**
  - Root Directory `server`, Start Command `npm start`.
  - Variables: `SQLITE_PATH`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_SENHA`, `N8N_API_KEY`, `N8N_WEBHOOK_AGENDA` e, se não quiser o salão de exemplo, `SEED_EXEMPLO=false`.
- **Serviço `cliente`:**
  - Root Directory `cliente`, Build `npm run build`, Start `npm start`.
  - Variable: `VITE_API_URL=https://SEU-BACKEND.up.railway.app/api`.

O banco é um arquivo SQLite. Para fazer backup, copie o arquivo `agenda.sqlite` (com o servidor parado ou junto com os arquivos `-wal` e `-shm`). O banco da versão anterior (Postgres, um negócio só) não é migrado automaticamente.

## n8n (um fluxo para todos os negócios)

1. Importe `n8n-agenda-multiempresa.json`.
2. Preencha os três nós `config ...`:
   - `api`: URL da API com `/api`;
   - `api_key`: o mesmo valor de `N8N_API_KEY`;
   - `host_evo`: URL da Evolution;
   - `apikey_evo_global`: a chave global da Evolution (`AUTHENTICATION_API_KEY`).
3. Configure a credencial da OpenAI e a do Postgres da memória.
4. Na Evolution, para **cada instância** (um WhatsApp por negócio):
   - aponte o webhook para a URL de produção do **Webhook WhatsApp** (`/webhook/salao-whatsapp`);
   - evento `MESSAGES_UPSERT`.
5. No sistema, em **Negócios**, informe para cada negócio o **mesmo nome da instância** criada na Evolution e o WhatsApp do dono.
6. Coloque a URL de produção do webhook `salao-agenda-atualizada` em `N8N_WEBHOOK_AGENDA` no backend.
7. Publique (ative) o workflow.

Para cada novo cliente que você vender:
1. Crie a instância na Evolution e conecte o WhatsApp dele.
2. Crie o negócio no sistema com esse nome de instância.
3. Cadastre os serviços e os profissionais, ou deixe o gestor cadastrar.
4. Crie o acesso de gestor e envie o login.

## Rotas principais

- **Login:** `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/senha`.
- **Admin:**
  - `GET/POST/PUT/DELETE /api/admin/negocios`
  - `GET/POST/PUT/DELETE /api/admin/usuarios`
- **Negócio** (token + `x-negocio-id` para o admin):
  - `/api/negocio`
  - `/api/profissionais`
  - `/api/servicos`
  - `/api/bloqueios`
  - `/api/cupons`
  - `/api/clientes`
  - `/api/agendamentos` (`PATCH /:id/status` cancela com `motivoCancelamento` e `avisarCliente`)
  - `/api/agenda/disponibilidade`
  - `/api/agenda/dia`
  - `/api/agenda/orcamento`
  - `/api/relatorios/resumo`
- **Agente** (headers `x-api-key` + `x-instancia`):
  - `/api/agente/info`
  - `/orcamento`
  - `/disponibilidade`
  - `/agendar`
  - `/meus-agendamentos`
  - `/remarcar`
  - `/cancelar`
  - `/agenda-dia`
  - `/cupom/:codigo`
  - `/negocios` (este não usa `x-instancia`)