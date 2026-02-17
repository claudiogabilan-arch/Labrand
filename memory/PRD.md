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

### 2026-02-17 (Session 3)
- **IMPLEMENTED**: AI Credits Deduction System
  - All AI endpoints now deduct credits before processing
  - Returns `credits_used` in response
  - 402 error when credits insufficient
- **FIXED**: TRIAL_DAYS changed from 15 to 7 days
- **UPDATED**: Frontend components handle 402 errors with user-friendly messages
- **ADDED**: ACTION_LABELS mapping in AICredits.js for translated history

### AI Credit Costs:
| Action | Credits | Endpoint |
|--------|---------|----------|
| Sugestão de IA | 1 | POST /api/ai/insights |
| Jeito de Ser (IA) | 2 | POST /api/ai/brand-way |
| Mentor IA | 3 | POST /api/ai/mentor |
| Análise de Risco | 5 | POST /api/brands/{id}/risk-analysis |
| Alertas de Consistência | 5 | POST /api/brands/{id}/consistency-alerts |

### 2026-02-17 (Session 2 - Part 2)
- **NEW**: Brand Risk Module - AI-powered risk analysis with 5 categories
- **NEW**: Competitor Analysis - Compare up to 5 competitors across 6 attributes
- **NEW**: Consistency Alerts - AI detects inconsistencies between brand pillars
- **NEW**: Google Integration page (Real OAuth)
- **FIXED**: AI endpoints corrected by testing agent

### 2026-02-17 (Session 2 - Part 1)
- **NEW**: "Jeito de Ser da Marca" (Brand Way) module with 6 dimensions
- **NEW**: AI suggestions for each brand way dimension
- **NEW**: Brand Purpose/Track Selection (8 types)
- **NEW**: Personalized Roadmap based on brand purpose
- **FIXED**: Login/registration redirect flow

### Previous Sessions
- Email verification, Forgot Password flows
- Google OAuth login
- Executive Dashboard, Benchmark, Simulator modules
- SaaS plans structure
- Stripe integration (subscriptions + one-time purchases)

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

### P1 - High Priority  
- [ ] Refactor server.py (3000+ lines) into modular routers
- [ ] Complete Maturity Diagnosis module
- [ ] Team invitation functionality

### P2 - Medium Priority
- [ ] Strategic Priority Report for consultants
- [ ] Naming module
- [ ] Brand Book PDF Generator

### P3 - Low Priority / Backlog
- [ ] White-labeling for Enterprise
- [ ] API access for Enterprise
- [ ] Timeline de Evolução

---

## Key Files Reference

### Backend
- `/app/backend/server.py` - Monolithic file (needs refactoring)
- `/app/backend/.env` - Contains LIVE Stripe keys, Emergent LLM key

### Frontend Pages (New/Modified)
- `/app/frontend/src/pages/AICredits.js` - Credit management
- `/app/frontend/src/pages/BrandRisk.js` - Risk analysis
- `/app/frontend/src/pages/CompetitorAnalysis.js` - Competitor comparison
- `/app/frontend/src/pages/ConsistencyAlerts.js` - Consistency checks
- `/app/frontend/src/pages/BrandWay.js` - Brand identity

### Context Providers
- `/app/frontend/src/contexts/AuthContext.js`
- `/app/frontend/src/contexts/BrandContext.js`
- `/app/frontend/src/contexts/PlanContext.js`

---

## Test Credentials
- **Strategist**: demo@labrand.com / password123
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
- `/app/test_reports/iteration_4.json` - AI Credits system (100% pass)
- `/app/test_reports/iteration_3.json` - New modules (100% pass)
