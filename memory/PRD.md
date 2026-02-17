# LaBrand - Brand OS
## Product Requirements Document

### Original Problem Statement
Web application for brand management covering diagnosis, strategy creation, execution, and result measurement. Positioned as a "Strategic Brand Infrastructure Platform (Brand OS)" for B2B companies and consultants.

### User Personas
- **Estrategista**: Full access to all features, can create/edit brands
- **Cliente**: Read-only access to dashboards and reports
- **Agência/Grupo Empresarial**: Multi-brand management

### Core Requirements
1. **Onboarding**: Multi-step guided process, user type selection, Google integrations
2. **Brand Management**: Create brands, define pillars (values, purpose, promise, positioning, personality, universality)
3. **Analytics**: Executive dashboard, benchmark, simulator, valuation
4. **SaaS Model**: Grátis, Founder (15-day trial), Pro, Consultor, Enterprise

### Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT + Google OAuth
- **Email**: Resend API
- **AI**: Emergent LLM Key (Gemini 2.0 Flash)

---

## Changelog

### 2026-02-17 (Session 2)
- **NEW**: "Jeito de Ser da Marca" (Brand Way) module with 6 dimensions
- **NEW**: AI suggestions for each brand way dimension
- **NEW**: Brand Purpose/Track Selection (8 types: Influencer, Produto, Serviço, Comunidade, Startup, Corporativo, ONG, Artista)
- **NEW**: Personalized Roadmap based on selected brand purpose
- **FIXED**: AI endpoints updated to use LlmChat class (testing agent fix)
- **FIXED**: Login/registration redirect flow (VerifyEmail → Onboarding)
- **FIXED**: /auth/me endpoint now returns onboarding_completed, email_verified, plan, user_type

### 2026-02-17 (Session 1 - Summary)
- Email verification flow implemented
- "Forgot Password" flow with Resend
- Google OAuth login working
- New modules: Executive Dashboard, Benchmark, Simulator, Brand Identity, Investment Match
- SaaS plans structure defined

---

## Roadmap

### P0 - Critical
- [x] Fix login/registration loop bug
- [x] Implement Brand Way module
- [x] Implement Brand Purpose Tracks

### P1 - High Priority  
- [ ] Complete Onboarding module (save 5 steps data - backend exists)
- [ ] Módulo de Risco de Marca
- [ ] Implement AI Mentor Insights display on Dashboard

### P2 - Medium Priority
- [ ] Roadmap Estratégico Inteligente
- [ ] Google Analytics/Search Console integration
- [ ] Comparador de Concorrentes

### P3 - Low Priority / Backlog
- [ ] Treeal payment integration
- [ ] Team invitation functionality
- [ ] Refactor server.py (2000+ lines)
- [ ] Naming module
- [ ] White-labeling for Enterprise
- [ ] AI Credits system
- [ ] Brand Book PDF Generator
- [ ] Timeline de Evolução
- [ ] Alertas de Consistência

---

## Key Files Reference

### New Files Created
- `/app/frontend/src/pages/BrandWay.js` - Jeito de Ser da Marca (6 dimensions)
- `/app/frontend/src/pages/PillarStart.js` - Updated with brand purpose selection and roadmap

### Backend Endpoints Added
- `GET/PUT /api/brands/{brand_id}/brand-way` - Brand way data
- `POST /api/ai/brand-way` - AI suggestions for brand way dimensions

### Modified Files
- `/app/backend/server.py` - Added brand-way endpoints, fixed AI integration
- `/app/frontend/src/App.js` - Added BrandWay route
- `/app/frontend/src/components/Layout.js` - Added "Jeito de Ser" to navigation

## Test Credentials
- Strategist: demo@labrand.com / password123
- Client: cliente@labrand.com / password123
- Brand ID: brand_92bcc15a44fb

## Integrations Status
- ✅ Google OAuth (login)
- ✅ Resend (transactional emails)
- ✅ Emergent LLM (Gemini 2.0 Flash) - AI suggestions
- ❌ Google Analytics/Search Console (not implemented)
- ❌ Treeal payments (not implemented)

## Brand Purpose Tracks
| Type | Focus | Priority Modules |
|------|-------|------------------|
| Influencer | Personal branding | Personalidade, Tom de Voz, Audiência |
| Produto | Market differentiation | Posicionamento, Promessa, Valuation |
| Serviço | Trust & experience | Valores, Propósito, Comportamentos |
| Comunidade | Shared purpose | Propósito, Valores, Narrativas |
| Startup | Growth & investment | Posicionamento, Valuation, Propósito |
| Corporativo | Culture & governance | Valores, Jeito de Ser, Valuation |
| ONG | Impact & cause | Propósito, Narrativas, Audiência |
| Artista | Authenticity | Personalidade, Narrativas, Tom de Voz |
