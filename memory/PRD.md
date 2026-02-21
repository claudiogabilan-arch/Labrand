# LaBrand - Brand OS
## Product Requirements Document

### Original Problem Statement
Web application for brand management covering diagnosis, strategy creation, execution, and result measurement. Positioned as a "Strategic Brand Infrastructure Platform (Brand OS)" for B2B companies and consultants.

### User Personas
- **Estrategista**: Full access to all features, can create/edit brands
- **Cliente**: Read-only access to dashboards and reports
- **Agência/Grupo Empresarial**: Multi-brand management

### Core Requirements
1. **Onboarding**: Multi-step guided process, user type selection
2. **Brand Management**: Create brands, define pillars
3. **Analytics**: Executive dashboard, benchmark, simulator, valuation
4. **SaaS Model**: 7-day free trial, Pro, Consultor, Enterprise plans
5. **AI Credits System**: Metered usage for AI features

### Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT + Google OAuth
- **Email**: Resend API
- **AI**: Emergent LLM Key (Gemini 2.0 Flash)
- **Payments**: Stripe (LIVE keys)

---

## Changelog

### 2026-02-18 (Session 5 - Current)

#### ✅ COMPLETED: Security & Login Validation
- Confirmed `/api/setup/create-admin` endpoint already removed (security fixed)
- Validated login flow working correctly via API and UI
- Confirmed all auth endpoints functional

#### ✅ COMPLETED: Touchpoints Module (Phase 1) - Testing & Validation
- All backend endpoints verified and working
- Frontend features working (heatmap, personas, ROI, AI analysis)

#### ✅ COMPLETED: CRM Integration Module (NEW)
- **Backend endpoints:** 6 endpoints for connect/disconnect/import/list
- **Supported CRMs:** RD Station, HubSpot, Kommo
- **Frontend features:** Cards, import, stats, contacts table
- **Note:** Import is currently MOCK data. Real API integration pending.

#### ✅ COMPLETED: Naming Module "Estúdio Onomástico" (NEW)
- **Backend endpoints:**
  - `GET /api/naming/criteria` - Evaluation criteria (7 criteria with weights)
  - `GET /api/naming/archetypes` - 12 archetypes + 8 tension examples (NEW)
  - `GET /api/brands/{id}/naming` - List naming projects
  - `GET /api/brands/{id}/naming/{id}` - Get project with names
  - `POST /api/brands/{id}/naming` - Create project
  - `PUT /api/brands/{id}/naming/{id}/propulsor` - Save archetype/tension (NEW)
  - `POST /api/brands/{id}/naming/{id}/semantic-map` - Generate semantic map (1 credit) (NEW)
  - `POST /api/brands/{id}/naming/{id}/generate` - Generate names with AI (3 credits)
  - `PUT /api/brands/{id}/naming/{id}/names/{id}/score` - Score a name
  - `PUT /api/brands/{id}/naming/{id}/names/{id}/favorite` - Toggle favorite
  - `DELETE /api/brands/{id}/naming/{id}/names/{id}` - Delete name
  - `DELETE /api/brands/{id}/naming/{id}` - Delete project

- **5 Etapas Implementadas:**
  1. **Essência Decode®** - Formulário de contexto (negócio, missão, valores, público)
  2. **Fator Propulsor®** - Seleção de arquétipo (12 opções) + tensão criativa (8 exemplos)
  3. **Arquétipos Vivos®** - Mapa semântico com IA (keywords, conceitos, metáforas, palavras estrangeiras)
  4. **Geração** - Criação de nomes com IA
  5. **Avaliação** - Scoring com 7 critérios ponderados + favoritos

- **12 Arquétipos de Marca:** Herói, Mago, Rebelde, Explorador, Sábio, Inocente, Criador, Governante, Cuidador, Cara Comum, Amante, Bobo da Corte

- **Custo de IA:**
  - Mapa Semântico: 1 crédito
  - Geração de Nomes: 3 créditos

#### ✅ SYSTEM HEALTH
- Frontend: RUNNING
- Backend: RUNNING  
- MongoDB: RUNNING
- All APIs responding correctly

---

### 2026-02-17 (Session 4)

#### ✅ COMPLETED: Backend Refactoring Structure
Created modular architecture (files ready for future migration):
```
/app/backend/
├── config.py           # DB, JWT, Plans, AI Costs config
├── models/schemas.py   # Pydantic models
├── utils/helpers.py    # Auth, email, LLM, credits helpers
├── routes/
│   ├── auth.py         # Authentication endpoints
│   ├── brands.py       # Brand CRUD
│   ├── pillars.py      # Pillar endpoints + tasks/decisions
│   ├── ai.py           # AI insights, risk, consistency
│   ├── credits.py      # AI credits management
│   ├── plans.py        # Subscription plans
│   ├── stripe.py       # Payment processing
│   └── maturity.py     # Maturity diagnosis
└── server_new.py       # Refactored entry point (75 routes)
```
Note: Original server.py kept functional (98 routes). Migration can be done gradually.

#### ✅ COMPLETED: Maturity Diagnosis Module (Full Implementation)
- **6 Dimensions** with 5 questions each (30 total):
  - Estratégia de Marca
  - Identidade Visual
  - Comunicação
  - Experiência do Cliente
  - Cultura Interna
  - Métricas e Governança
- **New Endpoints:**
  - `GET /api/maturity/dimensions` - Get all dimensions/questions
  - `POST /api/brands/{id}/maturity-diagnosis/recommendations` - AI recommendations (1 credit)
- **Frontend Updated:** Added AI recommendations section with:
  - Summary
  - Priority Actions (with impact/effort matrix)
  - Quick Wins
  - 30/90/180 day Roadmap
  - Strengths to Leverage

### 2026-02-17 (Session 3)
- **IMPLEMENTED**: AI Credits Deduction System
- **FIXED**: TRIAL_DAYS changed from 15 to 7 days
- **UPDATED**: Frontend components handle 402 errors

### AI Credit Costs:
| Action | Credits | Endpoint |
|--------|---------|----------|
| Sugestão de IA | 1 | POST /api/ai/insights |
| Jeito de Ser (IA) | 2 | POST /api/ai/brand-way |
| Mentor IA | 3 | POST /api/ai/mentor |
| Análise de Risco | 5 | POST /api/brands/{id}/risk-analysis |
| Alertas de Consistência | 5 | POST /api/brands/{id}/consistency-alerts |
| Recomendações Maturidade | 1 | POST /api/brands/{id}/maturity-diagnosis/recommendations |

---

## Roadmap

### P0 - Critical (Completed ✅)
- [x] Fix login/registration loop bug
- [x] Implement Brand Way module
- [x] Implement Brand Purpose Tracks
- [x] Implement Brand Risk module
- [x] Implement Competitor Analysis
- [x] Implement Consistency Alerts
- [x] Google Integration (Real OAuth)
- [x] Stripe Payments Integration
- [x] AI Credits Deduction System
- [x] 7-day trial period

### P1 - High Priority (Completed ✅)
- [x] Backend refactoring structure (modular files created)
- [x] Complete Maturity Diagnosis module with AI recommendations
- [x] Touchpoints Module Phase 1 (ROI, Personas, AI Analysis, Dashboard)
- [x] Admin Dashboard with usage metrics

### P2 - Medium Priority (In Progress)
- [ ] Complete backend migration to refactored server.py
- [ ] Onboarding flow save responses to DB
- [ ] Team invitation functionality
- [ ] Strategic Priority Report for consultants
- [ ] Naming module
- [ ] Brand Book PDF Generator
- [ ] Complete migration to refactored server

### P3 - Low Priority / Backlog
- [ ] White-labeling for Enterprise
- [ ] API access for Enterprise
- [ ] Timeline de Evolução

---

## Key Files Reference

### Backend (Refactored Structure)
- `/app/backend/server.py` - Main server (still in use, ~3300 lines)
- `/app/backend/server_new.py` - Refactored server (ready for migration)
- `/app/backend/routes/*.py` - Modular route files
- `/app/backend/config.py` - Configuration
- `/app/backend/utils/helpers.py` - Helper functions
- `/app/backend/.env` - Contains LIVE Stripe keys, Emergent LLM key

### Frontend Pages (Updated)
- `/app/frontend/src/pages/MaturityDiagnosis.js` - Full implementation with AI recommendations
- `/app/frontend/src/pages/AICredits.js` - Credit management
- `/app/frontend/src/pages/BrandRisk.js` - Risk analysis
- `/app/frontend/src/pages/ConsistencyAlerts.js` - Consistency checks

---

## Test Credentials
- **Strategist**: demo@labrand.com / password123
- **Admin**: admin@labrand.com / LaBrand@2024!
- **Brand ID**: brand_92bcc15a44fb

## Integrations Status
- ✅ Google OAuth (login)
- ✅ Google Analytics Data API (GA4)
- ✅ Google Search Console API
- ✅ Resend (transactional emails)
- ✅ Emergent LLM (Gemini 2.0 Flash)
- ✅ Stripe Payments (LIVE keys)
- ✅ AI Credits System

## Test Reports
- `/app/test_reports/iteration_5.json` - Maturity Diagnosis (100% pass - 13/13 tests)
- `/app/test_reports/iteration_4.json` - AI Credits system (100% pass)
- `/app/test_reports/iteration_3.json` - New modules (100% pass)

## Backend Tests Created
- `/app/backend/tests/test_maturity_diagnosis.py`

---

## Touchpoints Module Details
| Field | Type | Description |
|-------|------|-------------|
| nome | string | Touchpoint name |
| descricao | string | Description |
| ambiente | enum | "Online" or "Offline" |
| fase_funil | enum | "Topo de Funil", "Meio de Funil", "Fundo de Funil" |
| sentimento | enum | "Feliz", "Neutro", "Triste", "Frustrado" |
| nota | int (1-10) | Customer experience score |
| persona | string | Target persona (default: "Geral") |
| custo_mensal | float | Monthly cost |
| receita_gerada | float | Generated revenue |
| conversoes | int | Number of conversions |
