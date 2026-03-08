# LaBrand — Brand OS

**Strategic Brand Infrastructure Platform** para empresas B2B e consultorias de marca.

Plataforma SaaS completa para diagnóstico, construção, gestão e mensuração de marcas. Inclui dashboards executivos, análise de concorrentes, BVS Score, geração de relatórios PDF, sistema de créditos IA, e mais de 30 módulos.

---

## Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React | 19.x |
| **UI Components** | Shadcn/UI + Radix UI | - |
| **Styling** | Tailwind CSS | 3.x |
| **Charts** | Recharts | 2.x |
| **Mindmap** | @xyflow/react | 12.x |
| **Backend** | FastAPI (Python) | 0.110 |
| **Database** | MongoDB | - |
| **ODM** | Motor (async) | 3.3 |
| **Auth** | JWT + Google OAuth (Emergent) | - |
| **Email** | Resend API | - |
| **Pagamentos** | Stripe (LIVE) | - |
| **IA** | Emergent LLM Key (Gemini 2.0 Flash) | - |
| **PDF** | ReportLab | 4.x |
| **Deploy** | Emergent Platform (Kubernetes) | - |

---

## Estrutura de Pastas

```
/app/
├── backend/
│   ├── .env                    # Variáveis de ambiente (PROTEGER!)
│   ├── server_new.py           # Entry point FastAPI (porta 8001)
│   ├── config.py               # Conexão MongoDB, configurações globais
│   ├── requirements.txt        # Dependências Python
│   ├── routes/                 # Endpoints da API
│   │   ├── admin.py            # Endpoints admin (reset DB, cleanup)
│   │   ├── ads.py              # Integração Meta/Google Ads
│   │   ├── ai.py               # IA: sugestões com Gemini
│   │   ├── auth.py             # Registro, login, JWT, Google OAuth
│   │   ├── brand_equity.py     # Brand Equity Score (modelo Aaker)
│   │   ├── brand_funnel.py     # Funil de marca
│   │   ├── brand_health.py     # Saúde da marca
│   │   ├── brand_tools.py      # Brand Score, concorrentes, conteúdo
│   │   ├── brand_tracking.py   # Tracking de snapshots
│   │   ├── brands.py           # CRUD de marcas, métricas, benchmark
│   │   ├── bvs.py              # BVS (Branding Value Score)
│   │   ├── conversion_attributes.py  # Atributos de conversão
│   │   ├── credits.py          # Créditos IA
│   │   ├── crm.py              # Integração CRM (HubSpot, RD Station)
│   │   ├── disaster_check.py   # Verificação de desastre
│   │   ├── email_alerts.py     # Alertas por email (Resend)
│   │   ├── extras.py           # Executive summary, dashboard metrics
│   │   ├── integrations.py     # Google Analytics integração
│   │   ├── maturity.py         # Diagnóstico de maturidade
│   │   ├── naming.py           # Naming (geração de nomes)
│   │   ├── pillars.py          # 7 pilares da marca (CRUD)
│   │   ├── plans.py            # Planos SaaS
│   │   ├── reports.py          # Geração de relatórios PDF
│   │   ├── share_of_voice.py   # Share of Voice
│   │   ├── social_listening.py # Social Listening
│   │   ├── stripe.py           # Stripe checkout, webhooks
│   │   ├── team.py             # Equipes, convites, avatares
│   │   ├── touchpoints.py      # Touchpoints da jornada
│   │   └── value_waves.py      # Ondas de valor
│   ├── services/
│   │   ├── brand_data_service.py  # Serviço de dados da marca (BVS)
│   │   └── email_service.py       # Serviço de envio de emails
│   ├── utils/
│   │   └── helpers.py          # get_current_user, utilidades JWT
│   ├── models/                 # Modelos Pydantic
│   ├── tests/                  # Testes pytest
│   └── uploads/                # Uploads temporários
│
├── frontend/
│   ├── .env                    # Variáveis de ambiente frontend
│   ├── package.json            # Dependências Node.js
│   ├── tailwind.config.js      # Configuração Tailwind
│   ├── craco.config.js         # Configuração CRACO
│   ├── public/                 # Arquivos estáticos (logos, ícones)
│   └── src/
│       ├── App.js              # Rotas principais
│       ├── index.js            # Entry point React
│       ├── index.css           # Estilos globais + tema
│       ├── components/
│       │   ├── Layout.js       # Layout principal (Sidebar + Header)
│       │   ├── LoginPage.js    # Página de login/registro
│       │   ├── AuthCallback.js # Callback Google OAuth
│       │   ├── ProtectedRoute.js # Proteção de rotas
│       │   ├── FeatureGate.js  # Controle de features por plano
│       │   ├── Tutorial.js     # Tutorial onboarding
│       │   └── ui/             # Componentes Shadcn/UI (50+)
│       ├── contexts/
│       │   ├── AuthContext.js   # Auth state, JWT, permissões
│       │   ├── BrandContext.js  # Marca atual, métricas
│       │   ├── PlanContext.js   # Plano do usuário, features
│       │   └── ThemeContext.js  # Dark/Light mode
│       ├── pages/              # 40+ páginas (ver lista abaixo)
│       ├── hooks/
│       │   └── use-toast.js
│       └── lib/
│           └── utils.js        # Utilitários (cn, etc.)
│
├── memory/
│   ├── PRD.md                  # Product Requirements Document
│   ├── CHANGELOG.md            # Histórico de mudanças
│   └── ROADMAP_MELHORIAS.md    # Roadmap de melhorias
│
└── test_reports/               # Relatórios de testes automatizados
```

---

## Variáveis de Ambiente

### Backend (`/app/backend/.env`)

| Variável | Descrição | Onde Obter |
|----------|-----------|------------|
| `MONGO_URL` | Connection string MongoDB | Seu servidor MongoDB (ex: MongoDB Atlas) |
| `DB_NAME` | Nome do banco de dados | Escolha livre (ex: `labrand_prod`) |
| `CORS_ORIGINS` | Origens permitidas | URL do frontend (ex: `https://labrand.com.br`) |
| `EMERGENT_LLM_KEY` | Chave IA (Gemini via Emergent) | Emergent Platform → Profile → Universal Key |
| `JWT_SECRET` | Segredo para tokens JWT | Gere um valor aleatório forte (`openssl rand -hex 32`) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | Google Cloud Console → Credentials |
| `FRONTEND_URL` | URL pública do frontend | Seu domínio (ex: `https://labrand.com.br`) |
| `RESEND_API_KEY` | Chave da API Resend (emails) | https://resend.com → API Keys |
| `STRIPE_API_KEY` | Chave secreta Stripe (LIVE) | https://dashboard.stripe.com → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe | Stripe Dashboard → Webhooks |

### Frontend (`/app/frontend/.env`)

| Variável | Descrição |
|----------|-----------|
| `REACT_APP_BACKEND_URL` | URL base da API (ex: `https://labrand.com.br`) |

---

## Como Recriar o Ambiente

### Pré-requisitos

- **Node.js** 18+ e **Yarn**
- **Python** 3.10+
- **MongoDB** 6+ (local ou Atlas)

### 1. Backend

```bash
cd backend

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Instalar emergentintegrations (pacote privado)
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Configurar .env (copiar e preencher valores)
cp .env.example .env

# Iniciar servidor (porta 8001)
uvicorn server_new:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Frontend

```bash
cd frontend

# Instalar dependências
yarn install

# Configurar .env
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Iniciar em desenvolvimento (porta 3000)
yarn start
```

### 3. MongoDB

```bash
# Local
mongod --dbpath /data/db

# Ou Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 4. Deploy (Emergent Platform)

Na plataforma Emergent:
- O backend roda na porta 8001 (via Supervisor)
- O frontend roda na porta 3000
- Rotas `/api/*` são redirecionadas para o backend via Kubernetes Ingress
- Usar "Use existing database" para manter dados em deploys

---

## Módulos da Plataforma

### Core
- **Dashboard** — Visão geral da marca com progresso em tempo real
- **BVS Score** — Branding Value Score (metodologia proprietária)
- **Executive Dashboard** — Resumo executivo para C-level
- **Mindmap** — Visualização interativa dos pilares (React Flow)

### 7 Pilares da Marca
1. **Start** — Nome, setor, público-alvo
2. **Valores** — Valores centrais e necessidades
3. **Propósito** — Razão de existir da marca
4. **Promessa** — O que a marca entrega
5. **Posicionamento** — Como se diferencia no mercado
6. **Personalidade** — Tom de voz e traços
7. **Universal** — Identidade visual e aplicações

### Frameworks
- **Saúde da Marca** — Health Score agregado
- **Ondas de Valor** — Mapeamento de valor percebido
- **Funil de Marca** — Jornada de preferência
- **Disaster Check** — Análise de riscos

### Análise Competitiva
- **Social Listening** — Monitoramento de menções (requer APIs sociais)
- **Share of Voice** — Participação nas conversas do mercado
- **Atributos de Conversão** — Drivers de decisão de compra
- **Benchmark Setorial** — Comparação com o setor

### Inteligência
- **Dashboard Intel** — Métricas consolidadas
- **Google Analytics** — Integração GA4
- **Meta & Google Ads** — Integração de anúncios
- **CRM** — HubSpot, RD Station, Pipedrive

### Gestão
- **Planejamento** — Tarefas + Gantt chart
- **Campanhas** — Gestão de campanhas
- **Decisões** — Scorecard de decisões
- **Narrativas** — Storytelling de marca
- **Relatórios** — PDF executivo

### Sistema
- **Créditos IA** — Controle de uso da IA
- **Planos** — Free, Pro, Consultor, Enterprise
- **Equipe** — Convites, roles (Editor, Admin)
- **Admin** — Dashboard administrativo

---

## Planos SaaS

| Plano | Trial | Preço | Marcas | IA/mês |
|-------|-------|-------|--------|--------|
| Free | 7 dias | R$ 0 | 1 | 10 |
| Pro | 7 dias | R$ 197/mês | 3 | 100 |
| Consultor | 7 dias | R$ 497/mês | 10 | 500 |
| Enterprise | - | Sob consulta | Ilimitado | Ilimitado |

---

## Banco de Dados (MongoDB)

### Coleções Principais

| Coleção | Descrição |
|---------|-----------|
| `users` | Usuários (email, senha hash, role, plano) |
| `brands` | Marcas (nome, setor, owner_id) |
| `pillars` | Pilares da marca (pillar_type, answers) |
| `touchpoints` | Touchpoints mapeados |
| `maturity_diagnosis` | Diagnóstico de maturidade |
| `team_members` | Membros de equipe (brand_id, user_id, role) |
| `team_invites` | Convites pendentes |
| `social_mentions` | Menções sociais |
| `brand_funnel` | Dados do funil |
| `brand_tracking` | Snapshots de tracking |
| `brand_equity_history` | Histórico Brand Equity |
| `ai_credits` | Créditos IA por usuário |
| `generated_content` | Conteúdo gerado por IA |
| `competitor_analyses` | Análises de concorrentes |

---

## Endpoints Importantes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/health` | Health check (Kubernetes) |
| `POST` | `/api/auth/register` | Registro de usuário |
| `POST` | `/api/auth/login` | Login (retorna JWT) |
| `GET` | `/api/brands` | Listar marcas (owner + team) |
| `GET` | `/api/brands/{id}/metrics` | Métricas do dashboard |
| `GET` | `/api/brands/{id}/bvs` | BVS Score |
| `GET` | `/api/brands/{id}/brand-equity` | Brand Equity (Aaker) |
| `POST` | `/api/brands/{id}/reports/executive-pdf` | Gerar PDF |
| `GET` | `/api/admin/clean-mock-data/{id}` | Limpar dados mock |
| `POST` | `/api/team/invite` | Enviar convite de equipe |
| `POST` | `/api/team/accept/{token}` | Aceitar convite |

---

## Credenciais de Teste

| Papel | Email | Senha |
|-------|-------|-------|
| Admin | admin@labrand.com | LaBrand@2024! |

---

## Contato

Desenvolvido para **Claudio Gabilan** — Plataforma LaBrand (labrand.com.br)
