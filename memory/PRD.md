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
- Payments: Stripe (mantido para créditos IA)

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

### Recent Changes (2026-03-21)
1. **Planos REMOVIDOS** - Sidebar, backend routes, admin stats, registro/login responses
2. **BrandContext auto-load** - Marcas carregam automaticamente ao autenticar
3. **Troca de senha real** - POST /api/auth/change-password funcional
4. **Login redirect** - navigate() em vez de window.location.href
5. **Admin badge** - Mostra "Admin" corretamente

### Priority Backlog
- P0: White Label (subdomínios, cores, logo por cliente)
  - Config por cliente: logo, cores, nome
  - Login personalizado
  - Subdomínios: cliente1.labrand.com.br
  - Admin vê tudo de todos os White Labels
- P2: Better PDF Reports
- P2: Push Notifications for Collaboration
- P3: Refactoring

### Architecture
```
/app/backend/
  routes/: auth.py, brands.py, admin.py, admin_emails.py, collaboration.py, 
           naming.py, touchpoints.py, credits.py, maturity.py
  utils/: helpers.py
  server_new.py, config.py
/app/frontend/src/
  contexts/: AuthContext.js, BrandContext.js
  components/: LoginPage.js, Layout.js, AuthCallback.js, ProtectedRoute.js
  pages/: Dashboard.js, Settings.js, AdminDashboard.js, etc.
  App.js
```

### Critical Notes
- Production needs "Save to Github" + deploy for code updates
- Code changes NEVER affect MongoDB data
- Planos/Trial/Stripe routes REMOVIDOS do server_new.py
- PlanContext.js e FeatureGate.js existem mas não são importados
