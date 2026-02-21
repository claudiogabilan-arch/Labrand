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

### 2026-02-21 (Session 7 - Current)

#### ✅ COMPLETED: Limpeza de Código e Correção de Arquitetura

**Ações realizadas:**

1. **Arquivo Bridge `server.py` Criado:**
   - O supervisor aponta para `server:app`, então criamos um arquivo bridge que importa do `server_new.py`
   - Isso permite manter a arquitetura modular sem modificar configurações do supervisor
   - Arquivo original monolítico removido com sucesso

2. **Router de Reports Integrado:**
   - `reports.py` agora está corretamente incluído no `server_new.py`
   - Endpoints `/api/brands/{id}/reports/executive-pdf` funcionando
   - Geração REAL de PDF com ReportLab (não mais mock)

3. **PDF Generation FUNCIONANDO:**
   - Content-Type: application/pdf ✅
   - Arquivo binário válido (%PDF-1.4) ✅
   - Histórico de relatórios mantido no MongoDB ✅

**Estrutura Final do Backend:**
```
/app/backend/
├── server.py              # Bridge → imports from server_new.py
├── server_new.py          # Modular entry point (16 routers)
└── routes/
    ├── reports.py         # PDF generation (NOVO - agora integrado)
    └── ... (15 outros routers)
```

---

### 2026-02-21 (Session 6)

#### ✅ COMPLETED: 6 Brand Tools Features (Alto Impacto + Diferenciação)

**Alto Impacto:**

1. **Brand Score Unificado**
   - `GET /api/brands/{id}/brand-score` - Score consolidado 0-100
   - 4 dimensões: Estratégia (35%), Experiência (20%), Maturidade (25%), Consistência (20%)
   - Níveis: Excelente (≥80), Bom (≥60), Em Desenvolvimento (≥40), Crítico (<40)
   - Recomendações automáticas baseadas no score

2. **Relatório PDF Executivo**
   - `POST /api/brands/{id}/reports/executive-pdf` - Gera relatório
   - `GET /api/brands/{id}/reports/history` - Histórico de relatórios
   - Executive summary com pontos fortes, áreas de melhoria, ações prioritárias
   - **Note:** Download real de PDF em desenvolvimento (MOCK)

3. **Alertas por Email**
   - `GET/POST /api/brands/{id}/alerts/config` - Configuração de alertas
   - `POST /api/brands/{id}/alerts/send-test` - Email de teste (MOCK)
   - Frequência: diário, semanal, mensal
   - Tipos: consistência, risco, oportunidades

**Diferenciação Competitiva:**

4. **Social Listening Light**
   - `GET /api/brands/{id}/social-listening/mentions` - Menções em redes sociais
   - Sentimento, alcance, trending topics
   - Fontes: Twitter, Instagram, LinkedIn, Facebook
   - **Note:** Dados MOCK - Integração real com APIs de social listening pendente

5. **Análise de Concorrentes com IA**
   - `POST /api/brands/{id}/competitors/analyze-ai` - Análise com IA
   - Custo: 2 créditos (básico), 4 créditos (detalhado)
   - Forças, fraquezas, nível de ameaça, recomendações estratégicas
   - Histórico: `GET /api/brands/{id}/competitors/analyses`

6. **Gerador de Conteúdo de Marca**
   - `GET /api/content-generator/types` - Tipos disponíveis
   - `POST /api/brands/{id}/content-generator/generate` - Gera conteúdo
   - Tipos: Tagline (1cr), Post Social (1cr), Bio (1cr), Manifesto (2cr), Elevator Pitch (1cr)
   - Tons: profissional, casual, inspiracional
   - Histórico: `GET /api/brands/{id}/content-generator/history`

**Frontend:**
- Nova página `/brand-tools` com 6 abas
- Menu "Ferramentas" no sidebar (ícone de chave)
- Todas as funcionalidades conectadas e testadas

**Testes:**
- Backend: 23 testes passaram, 3 skipped (comportamento esperado - créditos insuficientes)
- Frontend: Todas as 6 abas verificadas funcionando
- Bug corrigido: ordenação de rotas em `/reports/history`

#### ⚙️ COMPLETED: Refatoração do server.py

**Migração Concluída com Sucesso!**

O backend foi refatorado de um arquivo monolítico (5300+ linhas) para arquitetura modular:

```
/app/backend/
├── server.py               # MODULAR - 143 rotas (em uso)
├── server_monolith_backup.py  # Backup do antigo monolítico
└── routes/
    ├── auth.py            # 11 rotas - Login, register, reset
    ├── brands.py          # 8 rotas - CRUD marcas
    ├── pillars.py         # 30 rotas - 7 pilares + tasks/decisions
    ├── ai.py              # 7 rotas - Insights, mentor, risk
    ├── credits.py         # 3 rotas - Saldo, histórico, compra
    ├── plans.py           # 4 rotas - Planos, upgrade
    ├── stripe.py          # 5 rotas - Checkout, webhook
    ├── maturity.py        # 5 rotas - Diagnóstico maturidade
    ├── brand_tools.py     # 12 rotas - 6 features novas
    ├── ads.py             # 6 rotas - Meta & Google Ads (MOCK)
    ├── crm.py             # 6 rotas - RD Station, HubSpot, Kommo (MOCK)
    ├── touchpoints.py     # 8 rotas - Jornada do cliente
    ├── naming.py          # 16 rotas - Estúdio Onomástico
    ├── extras.py          # 12 rotas - Templates, competitor groups, narratives
    └── admin.py           # 3 rotas - Dashboard administrativo
```

**Testes:** 100% backend (21 testes) + 100% frontend (Dashboard, brand-tools, naming)

#### ✅ COMPLETED: Brand Equity Score (Inteligência Avançada)

**Implementação baseada no modelo de Aaker (5 dimensões):**
- `GET /api/brands/{id}/brand-equity` - Calcula Brand Equity Score
- `GET /api/brands/{id}/brand-equity/history` - Histórico do score
- `GET /api/brands/{id}/brand-equity/comparison` - Comparação com benchmark

**5 Dimensões calculadas:**
1. **Conhecimento de Marca (20%)** - Baseado em impressões de Ads
2. **Associações de Marca (25%)** - Baseado em pilares preenchidos
3. **Qualidade Percebida (20%)** - Baseado em touchpoints e maturidade
4. **Lealdade à Marca (20%)** - Baseado em CRM e conversões
5. **Ativos Proprietários (15%)** - Baseado em naming, logo, universo

**Features:**
- Score 0-100 com níveis (Inicial, Emergente, Em Desenvolvimento, Forte, Premium)
- Multiplicador de valuation (0.5x a 3.5x)
- Recomendações priorizadas para aumentar o equity
- Benchmark com média do setor
- Histórico de evolução (6 meses)

**Frontend:** Nova aba "Equity" em /brand-tools (primeira aba)

#### ✅ COMPLETED: Testes Automatizados (Pytest)

**Criados 17 testes cobrindo todos os módulos:**
```
/app/backend/tests/
├── conftest.py          # Configuração pytest
├── pytest.ini           # Configuração asyncio
├── test_api.py          # Suite principal (17 testes)
├── test_auth.py         # Testes de auth (async)
├── test_brands.py       # Testes de brands (async)
├── test_brand_tools.py  # Testes de brand tools (async)
└── test_maturity_diagnosis.py  # Testes de maturidade
```

**Rodar testes:** `cd /app/backend && pytest tests/test_api.py -v`

**Cobertura:** Auth, Brands, Brand Score, Brand Equity, Social Listening, Naming, CRM, Ads, Touchpoints, Intelligence

#### ✅ COMPLETED: Google OAuth (Emergent Auth)

**Implementação:**
- `GET /api/auth/google/login` - Redireciona para Emergent Auth
- `POST /api/auth/session` - Processa retorno do OAuth
- Frontend: Botão "Continuar com Google" na tela de login
- AuthCallback: Processa `session_id` retornado pela URL

**Fluxo:**
1. Usuário clica "Continuar com Google"
2. Redireciona para `https://auth.emergentagent.com/?redirect={dashboard_url}`
3. Após autenticação, retorna com `?session_id=xxx`
4. Frontend processa sessão e autentica usuário

---

### 2026-02-18 (Session 5)

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

#### ✅ COMPLETED: Naming Module "Estúdio Onomástico" - COMPLETO
- **7 Etapas Implementadas:**
  1. **Essência Decode®** - Formulário de contexto (negócio, missão, valores, público)
  2. **Fator Propulsor®** - Seleção de arquétipo (12 opções) + tensão criativa (8 exemplos)
  3. **Arquétipos Vivos®** - Mapa semântico com IA (keywords, conceitos, metáforas) - 1 crédito
  4. **Geração de Nomes** - Criação de nomes com IA - 3 créditos
  5. **Laboratório Sonoro®** - Análise fonética (sílabas, ritmo, pronúncia) - 1 crédito
  6. **Fricção Global®** - Verificação em 7 idiomas (alertas de pronúncia/conotação) - 2 créditos
  7. **Avaliação Final** - Scoring com 7 critérios + favoritos + disponibilidade domínio/redes

- **Backend endpoints:** 14 endpoints completos
- **Features extras:**
  - Mock verificação de domínios (.com, .com.br, .io, .co)
  - Mock verificação redes sociais (Instagram, Twitter, LinkedIn, Facebook, TikTok)
  - Exportação de relatório (JSON)
  - 12 Arquétipos de marca com keywords e exemplos
  - 8 exemplos de tensões criativas

#### ✅ COMPLETED: Onboarding & Benchmark Improvements
- **Templates API:**
  - `GET /api/templates/pillars?sector=X` - Templates por pilar e setor
  - `GET /api/templates/sectors` - Lista de 12 setores
  - Templates para: Purpose, Values, Promise, Positioning
  - Setores: Tecnologia, Saúde, Educação, Varejo, Financeiro, Indústria, etc.

- **Benchmark com Grupos de Concorrentes:**
  - `GET /api/brands/{id}/competitor-groups` - Listar grupos
  - `POST /api/brands/{id}/competitor-groups` - Criar grupo
  - `PUT /api/brands/{id}/competitor-groups/{id}` - Atualizar concorrentes
  - `DELETE /api/brands/{id}/competitor-groups/{id}` - Remover grupo
  - Frontend: Criar grupos por segmento/região, adicionar concorrentes com scores

#### ✅ COMPLETED: Ads Integration (Meta & Google)
- **Backend endpoints:**
  - `GET /api/brands/{id}/ads/providers` - Listar provedores e status
  - `POST /api/brands/{id}/ads/connect` - Conectar provedor
  - `DELETE /api/brands/{id}/ads/{provider}` - Desconectar
  - `POST /api/brands/{id}/ads/{provider}/sync` - Sincronizar dados (MOCK)
  - `GET /api/brands/{id}/ads/{provider}/metrics` - Buscar métricas

- **Frontend features:**
  - Cards de Meta Ads e Google Ads
  - Métricas: Investimento, Impressões, Cliques, Conversões, CTR, ROAS
  - Tabela de métricas diárias (30 dias)
  - Tab comparativo entre plataformas
  - Dialog de conexão com credenciais

- **Note:** Sync é MOCK - gera dados simulados. Integração real requer credenciais das APIs.

#### ✅ COMPLETED: Intelligence Dashboard Melhorado
- **Backend endpoint:**
  - `GET /api/brands/{id}/intelligence/summary` - Resumo unificado de todas as fontes

- **Frontend features:**
  - Status de fontes conectadas (GA, Meta Ads, Google Ads, CRM)
  - Saúde da marca (completude dos pilares)
  - Métricas consolidadas de marketing
  - Insights automáticos baseados nos dados
  - Ações rápidas para navegação

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
