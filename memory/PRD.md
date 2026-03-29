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
- [x] Redesign Linear-inspired

### Fase 3 - Naming Module (Concluído - 21/03/2026)
- [x] Wizard 7 etapas, geração algorítmica local, 12 arquétipos, 20 provocações

### Fase 4 - Notifications + Improvements (Concluído - 22/03/2026)
- [x] Push Notifications (in-app + email Resend)
- [x] Dashboard: Atividade Recente + Status Rápido
- [x] PillarNavigation compartilhado em 7 páginas

### Fase 5 - ClickUp OAuth 2.0 Integration (Concluído - 29/03/2026)
- [x] Backend: 13 endpoints OAuth 2.0 em /app/backend/routes/clickup.py
- [x] Frontend: ClickUpPanel, callback, seletor hierárquico, sync toggle
- [x] Log de Sincronização com links diretos ao ClickUp
- [x] Dashboard Widget com filtro por período (Semana/Mês/Todos) e contador total
- [x] Zero créditos IA

### Fase 6 - Social Media APIs Reais (Concluído - 29/03/2026)
- [x] Backend: `/app/backend/routes/social_fetcher.py` com 5 fetchers reais:
  - Instagram Graph API (posts, curtidas, comentários, alcance)
  - Facebook Pages API (posts da página, reações, shares)
  - YouTube Data API v3 (canal, vídeos, views, subscribers)
  - LinkedIn API (posts org, engajamento)
  - TikTok Creator API (vídeos orgânicos, likes, views)
- [x] TikTok adicionado ao Social Listening (platform guide + credenciais)
- [x] Botão "Buscar Dados" manual por plataforma conectada
- [x] Botão "Buscar Todas" para atualizar todas as redes de uma vez
- [x] Cards de perfil (seguidores, nome) por rede conectada
- [x] Endpoint `/social-profiles` para métricas de perfil armazenadas
- [x] Endpoint `/social-fetcher/all` para fetch universal
- [x] Deduplicação por external_id (não duplica posts já importados)
- [x] Dados reais alimentam automaticamente Social Listening + Share of Voice
- [x] Testes: Backend 47/47 + Frontend 100%

---

## Backlog Priorizado

### P1 - Alta Prioridade
- [ ] Campanhas + Social Posts: vincular posts de redes sociais a campanhas ativas
- [ ] White-labeling Fase 1 (tenants, logos, cores, subdomínios)

### P2 - Média Prioridade
- [ ] Dashboard Social Media: métricas consolidadas cross-platform no Dashboard principal
- [ ] Push Notifications via Browser (Web Push API)

### P3 - Baixa Prioridade
- [ ] Refatoração contínua (Settings.js, Touchpoints.js)

---

## Arquivos Chave
- `/app/backend/routes/clickup.py` - ClickUp OAuth 2.0 + Sync History + Stats
- `/app/backend/routes/social_fetcher.py` - Real API fetchers (5 plataformas)
- `/app/backend/routes/social_listening.py` - Social Listening + Platform Guides (com TikTok)
- `/app/backend/routes/share_of_voice.py` - SOV baseado em social_mentions
- `/app/frontend/src/pages/SocialListening.js` - UI Social Listening + Fetch + Profiles
- `/app/frontend/src/pages/Dashboard.js` - Dashboard + ClickUp widget com filtros
- `/app/frontend/src/pages/Planning.js` - Planning + ClickUpPanel + SyncLog
- `/app/frontend/src/pages/ClickUpCallback.js` - OAuth callback handler

## Credenciais de Teste
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste convidado: `sandro@test.com` / `Test@123`
- Teste novo: `newuser@test.com` / `Test@123`
