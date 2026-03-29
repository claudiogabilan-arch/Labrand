# LaBrand - Brand OS

## Problema Original
Ferramenta interna de gestão de marcas para agência de branding.

## Arquitetura
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrações**: OpenAI GPT-4o (Emergent Key), Google Auth (Emergent), Stripe (AI Credits), Resend (Email), ClickUp (OAuth 2.0), Social Media APIs (Instagram, Facebook, YouTube, LinkedIn, TikTok)

---

## O que foi implementado

### Fase 1-2 - Core + UI/UX Premium (Concluído)
- [x] Login/Auth, Dashboard, CRUD Marcas, 7 Pilares, BVS Score, Relatórios PDF, Créditos IA

### Fase 3 - Naming Module (Concluído - 21/03/2026)
- [x] Wizard 7 etapas, geração algorítmica local

### Fase 4 - Notifications + Improvements (Concluído - 22/03/2026)
- [x] Push Notifications (in-app + email Resend), PillarNavigation

### Fase 5 - ClickUp OAuth 2.0 Integration (Concluído - 29/03/2026)
- [x] OAuth completo, sync log, dashboard widget com filtro por período + contador

### Fase 6 - Social Media APIs Reais (Concluído - 29/03/2026)
- [x] Instagram Graph API, Facebook Pages API, YouTube Data API v3, LinkedIn API, TikTok Creator API
- [x] Busca manual por plataforma + "Buscar Todas"
- [x] Cards de perfil (seguidores) por rede conectada

### Fase 7 - Campanhas + Social Posts (Concluído - 29/03/2026)
- [x] Backend CRUD completo: `/app/backend/routes/campaigns.py`
  - GET/POST/PUT/DELETE campanhas
  - POST link-post / DELETE unlink-post
  - GET campaign posts com totais de engajamento
- [x] Frontend: Calendário + lista + detalhe com métricas
- [x] Vínculo de posts de redes sociais a campanhas
- [x] Métricas consolidadas por campanha (curtidas, comentários, shares, views)

### Fase 8 - Dashboard Social Consolidado (Concluído - 29/03/2026)
- [x] Endpoint `/api/brands/{brand_id}/social-dashboard`
- [x] Widget no Dashboard: seguidores por rede, engajamento total, top posts
- [x] Visível apenas quando há redes conectadas
- [x] Testes: Backend 69/69 + Frontend 100% (acumulado)

---

## Backlog Priorizado

### P1 - Alta Prioridade
- [ ] White-labeling Fase 1 (tenants, logos, cores, subdomínios)

### P2 - Média Prioridade
- [ ] Push Notifications via Browser (Web Push API)

### P3 - Baixa Prioridade
- [ ] Refatoração contínua (Settings.js, Touchpoints.js)

---

## Arquivos Chave
- `/app/backend/routes/campaigns.py` - Campanhas CRUD + Social Post Linking
- `/app/backend/routes/clickup.py` - ClickUp OAuth 2.0 + Sync History + Stats
- `/app/backend/routes/social_fetcher.py` - Real API fetchers + Social Dashboard
- `/app/backend/routes/social_listening.py` - Social Listening + Platform Guides
- `/app/frontend/src/pages/Campaigns.js` - UI Campanhas + Calendar + Detail + Link Dialog
- `/app/frontend/src/pages/Dashboard.js` - Dashboard + ClickUp + Social widgets
- `/app/frontend/src/pages/SocialListening.js` - UI Social Listening + Fetch + Profiles
- `/app/frontend/src/pages/Planning.js` - Planning + ClickUpPanel + SyncLog

## Credenciais de Teste
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste convidado: `sandro@test.com` / `Test@123`
- Teste novo: `newuser@test.com` / `Test@123`
