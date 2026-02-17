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

### 2026-02-17 (Session 2 - Part 2)
- **NEW**: Brand Risk Module - AI-powered risk analysis with 5 categories
- **NEW**: Competitor Analysis - Compare up to 5 competitors across 6 attributes
- **NEW**: Consistency Alerts - AI detects inconsistencies between brand pillars
- **NEW**: Google Integration page (MOCKED - Analytics & Search Console)
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

---

## Roadmap

### P0 - Critical (Completed ✅)
- [x] Fix login/registration loop bug
- [x] Implement Brand Way module
- [x] Implement Brand Purpose Tracks
- [x] Implement Brand Risk module
- [x] Implement Competitor Analysis
- [x] Implement Consistency Alerts
- [x] Google Integration page (MOCKED)

### P1 - High Priority  
- [ ] Implement real Google OAuth for Analytics/Search Console
- [ ] Treeal payment integration
- [ ] Refactor server.py (2500+ lines)

### P2 - Medium Priority
- [ ] Diagnóstico de Maturidade
- [ ] Team invitation functionality
- [ ] AI Credits system

### P3 - Low Priority / Backlog
- [ ] Naming module
- [ ] White-labeling for Enterprise
- [ ] Brand Book PDF Generator
- [ ] Timeline de Evolução

---

## New Modules Summary

### Brand Risk Module (/brand-risk)
- **5 Risk Categories**: Reputacional, Competitivo, Operacional, Legal, Cultural
- **AI Analysis**: Generates scores (0-100) and factors for each category
- **Recommendations**: 5 mitigation recommendations
- **Endpoints**: GET/POST /api/brands/{brand_id}/risk-analysis

### Competitor Analysis (/competitors)
- **6 Attributes**: Preço, Qualidade, Inovação, Atendimento, Presença Digital, Reconhecimento
- **Max 5 Competitors**: With descriptions and scores
- **Advantages/Disadvantages**: Auto-calculated based on scores
- **Endpoints**: GET/PUT /api/brands/{brand_id}/competitors

### Consistency Alerts (/consistency)
- **AI Analysis**: Detects inconsistencies between brand pillars
- **4 Alert Types**: error, warning, success, info
- **Score**: 0-100% consistency score
- **Endpoints**: GET/POST /api/brands/{brand_id}/consistency-alerts

### Google Integration (/google-integration) ⚠️ MOCKED
- **Analytics Tab**: Users, pageviews, bounce rate, session duration, top pages
- **Search Console Tab**: Clicks, impressions, CTR, position, top queries
- **Endpoints**: GET/POST /api/brands/{brand_id}/google-integration/*

---

## Key Files Reference

### New Files Created (Session 2)
- `/app/frontend/src/pages/BrandWay.js`
- `/app/frontend/src/pages/BrandRisk.js`
- `/app/frontend/src/pages/CompetitorAnalysis.js`
- `/app/frontend/src/pages/ConsistencyAlerts.js`
- `/app/frontend/src/pages/GoogleIntegration.js`
- `/app/frontend/src/pages/PillarStart.js` (updated)

### Backend (Monolithic - Needs Refactoring)
- `/app/backend/server.py` - 2500+ lines, all endpoints

## Test Credentials
- Strategist: demo@labrand.com / password123
- Brand ID: brand_92bcc15a44fb

## Integrations Status
- ✅ Google OAuth (login)
- ✅ Resend (transactional emails)
- ✅ Emergent LLM (Gemini 2.0 Flash)
- ⚠️ Google Analytics (MOCKED)
- ⚠️ Google Search Console (MOCKED)
- ❌ Treeal payments (not implemented)

## Test Reports
- `/app/test_reports/iteration_1.json` - Initial features
- `/app/test_reports/iteration_3.json` - New modules (100% pass rate)
