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

## What's Been Implemented

### Core Platform
- Full authentication system (JWT + Google OAuth)
- Multi-brand management with brand creation/editing
- 7 brand pillars (Start, Valores, Propósito, Promessa, Posicionamento, Personalidade, Universalidade)
- Executive Dashboard with real-time progress
- BVS (Branding Value Score) with real data consolidation
- Brand Equity Score (Aaker model)
- Touchpoint mapping and scoring
- Maturity diagnosis
- Brand Risk analysis
- Disaster Check module
- Value Waves analysis
- Brand Funnel
- Naming module (with AI generation)
- Content generator (AI-powered)
- Competitor analysis (AI-powered)
- CRM integration framework
- Ads integration framework (Meta, Google)
- Social Listening framework
- Share of Voice analysis
- Conversion Attributes analysis
- Brand Tracking (snapshots over time)
- PDF Report generation (executive reports)
- Email alerts system (Resend API)
- Stripe payment integration (LIVE keys)
- AI credits system with metered usage
- Team invitations and roles
- Admin dashboard with stats
- Mindmap visualization (React Flow)
- Gantt chart in Planning module
- Presentation mode for client meetings

### 2026-02-27 - Mock Data Removal (P0 Fix)
**CRITICAL FIX: Removed ALL mock/simulated data from the platform**

Files modified:
- `/app/backend/routes/social_listening.py` - Returns empty state when no mentions
- `/app/backend/routes/share_of_voice.py` - Removed fake competitor mentions (hash-based), simulated channel breakdown, simulated trend history. Now uses real DB data only.
- `/app/backend/routes/conversion_attributes.py` - Removed `generate_sample_surveys()` function that was creating and persisting 30 fake surveys in DB. Now returns empty state when < 5 real surveys.
- `/app/backend/routes/brand_tracking.py` - Removed `generate_initial_tracking()` that was creating and persisting 6 months of simulated history in DB. Returns empty state.
- `/app/backend/routes/bvs.py` - Removed simulated BVS history generation. Returns empty when no real history.
- `/app/backend/routes/brand_tools.py` - Replaced simulated equity history with real DB data.
- `/app/backend/routes/admin.py` - Added comprehensive cleanup endpoint: `GET /api/admin/clean-mock-data/{brand_id}`
- `/app/frontend/src/pages/ShareOfVoice.js` - Added empty state UI
- `/app/frontend/src/pages/ConversionAttributes.js` - Added empty state UI
- `/app/frontend/src/pages/BrandTracking.js` - Added empty state UI

### 2026-02-27 - 5 Bug Fixes (User-reported)
1. **Audiência - Buscar Influenciadores**: Button was failing silently. Now shows toast notification explaining social media integration is required.
2. **Benchmark Setorial**: Removed fake percentile formula. Shows empty state when no pillar data. RBI shows "Sem dados" when no valuation exists. Sector shows "Não definido" instead of "default".
3. **Funil de Marca**: Removed `generate_initial_funnel()` that was creating fake data (10000, 3000, etc.). Now shows empty state with "Inserir Dados do Funil" CTA.
4. **Saúde da Marca**: Now shows 0 values for funnel section when no real data exists.
5. **Pilar Valores**: Progress calculation changed from 33/33/34 (valores+necessidades+cruzamentos) to 50/50 (valores+necessidades only). Crossings no longer block 100%.

### 2026-02-27 - Refatoração brand_tools.py
**Refactored `brand_tools.py` (490 → 148 lines) into modular files:**
- `/app/backend/routes/brand_equity.py` (208 lines) - Brand Equity Score (Aaker model), history, comparison
- `/app/backend/routes/email_alerts.py` (129 lines) - Alert config, sending, history
- `/app/backend/routes/brand_tools.py` (148 lines) - Brand Score, Competitor Analysis, Content Generator
- Removed duplicate `PDFReportRequest` model (already in `reports.py`)
- Removed duplicate `/benchmark` endpoint from `extras.py` (already in `brands.py`)
- Updated `server_new.py` with new routers
- All 10 endpoints verified working post-refactor

### 2026-02-28 - Sidebar Colapsável
- Menu lateral reorganizado com seções accordion colapsáveis
- 6 itens top-level + 7 seções colapsáveis, estado salvo no localStorage
- Seção ativa auto-expande ao navegar

### 2026-02-28 - Fix Team Invite Flow
**Fixed critical bug: invited team members couldn't see shared brands.**
1. `GET /api/brands` now queries `team_members` collection (not just brands doc)
2. `GET /api/brands/{brand_id}` checks team membership for access
3. `POST /api/team/accept/{token}` auto-sets `onboarding_completed=True`
4. Frontend `VerifyEmail.js` checks `pending_invite` → redirects to invite acceptance
5. Testing: 12/12 tests passed


### 2026-03-08 - Social Listening Inline Connection + SEO + 404
**Social Listening:**
- Painel de conexão inline: Instagram, Facebook, LinkedIn, YouTube
- Passo-a-passo guiado para cada plataforma (campos de API, documentação oficial)
- Endpoints: GET /platforms, POST /connect, DELETE /disconnect/{platform}
- Credenciais salvas na coleção `social_connections`

**SEO & 404:**
- Meta tags Open Graph + Twitter Cards no index.html
- JSON-LD structured data (SoftwareApplication schema)
- robots.txt e sitemap.xml
- OG Image profissional gerada
- Página 404 customizada com botões "Dashboard" e "Voltar"

### 2026-03-08 - Módulos Cultura & Pessoas + LaBrand Academy
**Cultura & Pessoas** (`/culture`):
- 5 seções: Manifesto Cultural, Rituais & Práticas, Comportamentos (DO/DON'T), Experiência do Colaborador, Alinhamento Marca x Cultura
- Score de Saúde Cultural, recomendações, integração com valores da marca
- Backend: GET/POST `/api/brands/{id}/culture`, GET `/culture/score`

**LaBrand Academy** (`/academy`):
- CRUD completo de artigos com 8 categorias
- Busca, filtros por categoria, visualização, edição, publicação/rascunho
- Backend: GET/POST/PUT/DELETE `/api/brands/{id}/academy`
- Sidebar: Academy em Gestão, Cultura em Frameworks
### 2026-03-08 - Touchpoints Offline (Business Rules v1.0)
**Implementacao completa das regras de negocio para Touchpoints Offline:**
- 4 tipos offline: Palestra/Keynote, Imersao Presencial, Aparicao em Midia/Podcast, Mentoria/Reuniao Estrategica
- Cada tipo com: fase do funil padrao, exemplo de nomenclatura, orientacao contextual, dicas por metrica
- Mensagens de orientacao: nota=0 (warning), receita=0 com conversoes>0 (info), 5+ offline no mes (lembrete snapshot)
- Nova aba "Offline" no frontend com touchpoints agrupados por tipo e icones especificos
- Card "Touchpoints que precisam de atualizacao" para alertar sobre dados incompletos
- Box "Principio Orientador" na aba Offline
- Backend: GET /api/touchpoints/offline-types, POST retorna {touchpoint, guidance}
- Frontend: Formulario adaptativo com tipo offline, dicas contextuais, pre-preenchimento de fase do funil
- Testes: 16/16 backend + 100% frontend

---

## Prioritized Backlog

### P0 (Critical - Done)
- ✅ Remove ALL mock/simulated data from backend
- ✅ Add proper empty states to all frontend components
- ✅ Create cleanup endpoint for production DB
- ✅ Touchpoints Offline with business rules (4 types, guidance, naming conventions)

### P1 (High Priority - Next)
- ✅ Refactor `brand_tools.py` -> split into `brand_equity.py`, `email_alerts.py`
- [ ] Advanced Collaboration & Governance (granular roles, approval workflows)
- [ ] UX Suggestions: Timeline de evolucao, Comparativo antes/depois, Export PDF mindmap

### P2 (Medium Priority - Future)
- [ ] White-labeling for enterprise clients
- [ ] Enhance PDF reports with more data (BVS, social, ads, etc.)

### Key Endpoints
- `GET /health` - Kubernetes health check
- `GET /api/admin/clean-mock-data/{brand_id}` - Clean mock data for a brand
- `GET /api/touchpoints/offline-types` - Offline touchpoint type definitions
- `GET /api/brands/{brand_id}/touchpoints` - Touchpoints with offline stats, guidance
- `POST /api/brands/{brand_id}/touchpoints` - Create touchpoint (returns guidance)
- `GET /api/brands/{brand_id}/social-listening/dashboard` - Social listening data
- `POST /api/brands/{brand_id}/reports/executive-pdf` - Generate PDF report
- `GET /api/brands/{brand_id}/bvs` - BVS Score
- `GET /api/brands/{brand_id}/metrics` - Dashboard metrics

### Test Credentials
- Admin: `admin@labrand.com` / `LaBrand@2024!`
- Brand ID: `brand_29aafd2d6125` (Sandro Serzedello)
