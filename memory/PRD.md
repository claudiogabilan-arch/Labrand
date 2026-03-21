# LaBrand - Brand OS
## Strategic Brand Infrastructure Platform (Uso Interno da Agência)

### Problem Statement
Plataforma interna para gestão de marcas de clientes da agência. Inclui desenvolvimento estratégico, avaliação (BVS), análise de risco, comparação competitiva, alertas de consistência, touchpoints offline, colaboração avançada e dashboard executivo.

### Modelo de Negócio
- **USO INTERNO** da agência (não vai ao mercado)
- Planos REMOVIDOS (sem trial, sem assinaturas)
- Créditos IA mantidos (exclusivos do dono da marca)
- White Label planejado (cada cliente com subdomínio e visual próprio)

### Tech Stack
- Frontend: React + Shadcn UI + Tailwind CSS
- Backend: FastAPI + Python
- Database: MongoDB
- Auth: JWT + Emergent Google OAuth
- AI: OpenAI GPT-4o (Emergent LLM Key)
- Email: Resend

### Users
- Admin: admin@labrand.com.br / Labrand@2026!
- Owner: claudiogabilan@gmail.com / Cla@2026
- Production: labrand.com.br

### Completed Features
- Full auth system (JWT + Google OAuth + password change real)
- Brand CRUD with pillar system
- BVS Score calculation
- Executive reports / Mind map PDF export
- Brand tracking with timeline
- Offline Touchpoints
- Advanced Collaboration (approvals, comments)
- Admin Dashboard (sem filtro de planos)
- Admin System Emails (Resend)
- Naming module with semantic map
- Settings (profile, security, brands, team)
- Auto-load de marcas no BrandContext
- CORS fix para produção (origins explícitas com credentials)
- Login text: "Brand Builder for Equity"
- Refatoração: remoção de arquivos mortos (plans, stripe, backups, PlanContext, FeatureGate)
- AI Credits: compra via Stripe corrigida (import fix), polling de status, payment_transactions
- PDF Reports: layout profissional com capa, índice, gráficos, BVS, touchpoints, recomendações

### Priority Backlog
- P1: White Label (subdomínios, cores, logo por cliente)
  - Config por cliente: logo, cores, nome
  - Login personalizado
  - Subdomínios: cliente1.labrand.com.br
  - Admin vê tudo de todos os White Labels
- P2: Better PDF Reports
- P2: Push Notifications for Collaboration
- P3: Refatoração contínua

### Architecture
```
/app/backend/
  routes/: auth.py, brands.py, admin.py, admin_emails.py, collaboration.py, 
           naming.py, touchpoints.py, credits.py, maturity.py, pillars.py,
           ai.py, brand_tools.py, brand_equity.py, brand_tracking.py, bvs.py,
           brand_health.py, brand_funnel.py, culture.py, academy.py, ads.py,
           crm.py, email_alerts.py, extras.py, integrations.py, reports.py,
           team.py, disaster_check.py, value_waves.py, social_listening.py,
           share_of_voice.py, conversion_attributes.py
  models/: schemas.py
  services/: brand_data_service.py, email_service.py
  utils/: helpers.py
  tests/: (pytest suite)
  server_new.py, config.py
/app/frontend/src/
  contexts/: AuthContext.js, BrandContext.js
  components/: LoginPage.js, Layout.js, AuthCallback.js, ProtectedRoute.js, Tutorial.js
  pages/: Dashboard.js, Settings.js, AdminDashboard.js, etc.
  App.js
```

### CORS Configuration
- `CORS_ORIGINS` no .env: lista de domínios separados por vírgula
- `FRONTEND_URL` no .env: sempre adicionado à lista de origins
- Fallback: DynamicCORSMiddleware quando nenhum origin configurado
- NUNCA usar `allow_origins=["*"]` com `allow_credentials=True`

### Critical Notes
- Production needs "Save to Github" + deploy for code updates
- Code changes NEVER affect MongoDB data
- Planos/Trial/Stripe routes REMOVIDOS (arquivos deletados)
