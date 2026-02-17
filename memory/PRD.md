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

---

## Changelog

### 2026-02-17
- **Fixed**: Critical auth bug - VerifyEmail.js now redirects to /onboarding instead of /dashboard
- **Fixed**: /auth/me endpoint now returns onboarding_completed, email_verified, plan, user_type
- **Fixed**: Updated 14 existing users with missing fields

### Previous Session (Summary)
- Email verification flow implemented
- "Forgot Password" flow with Resend
- Google OAuth login working
- New modules: Executive Dashboard, Benchmark, Simulator, Brand Identity, Investment Match
- SaaS plans structure defined

---

## Roadmap

### P0 - Critical
- [x] Fix login/registration loop bug

### P1 - High Priority  
- [ ] Complete Onboarding module (save 5 steps data)
- [ ] Implement AI Mentor Insights logic
- [ ] Módulo "Jeito de Ser da Marca"

### P2 - Medium Priority
- [ ] Módulo de Risco de Marca
- [ ] Roadmap Estratégico Inteligente
- [ ] Google Analytics/Search Console integration

### P3 - Low Priority / Backlog
- [ ] Treeal payment integration
- [ ] Team invitation functionality
- [ ] Refactor server.py (2000+ lines)
- [ ] Naming module
- [ ] White-labeling for Enterprise
- [ ] AI Credits system

---

## Key Files Reference
- `/app/backend/server.py` - Monolithic backend (needs refactoring)
- `/app/frontend/src/contexts/AuthContext.js` - Auth state management
- `/app/frontend/src/pages/VerifyEmail.js` - Email verification
- `/app/frontend/src/pages/Onboarding.js` - 5-step onboarding
- `/app/frontend/src/App.js` - Routes and redirect logic

## Test Credentials
- Strategist: demo@labrand.com / password123
- Client: cliente@labrand.com / password123

## Integrations Status
- ✅ Google OAuth (login)
- ✅ Resend (transactional emails)
- ❌ Google Analytics/Search Console (not implemented)
- ❌ Treeal payments (not implemented)
- ⚠️ OpenAI/Emergent LLM (partial - influencer suggestions)
