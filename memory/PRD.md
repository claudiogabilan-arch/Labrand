# LaBrand - Brand OS

## Problema Original
Ferramenta interna de gestão de marcas para agência de branding.

## Arquitetura
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrações**: OpenAI GPT-4o (Emergent Key), Google Auth (Emergent), Stripe (AI Credits), Resend (Email), ClickUp (OAuth 2.0)

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
- [x] Settings: Preferências de notificação no backend

### Bug Fix - Convite de Equipe (Concluído - 22/03/2026)
- [x] `auto_accept_pending_invites()` em auth.py
- [x] `refreshBrands()` no BrandContext
- [x] AcceptInvite.js corrigido
- [x] Endpoint admin force-accept-pending

### Fase 5 - ClickUp OAuth 2.0 Integration (Concluído - 29/03/2026)
- [x] Backend: Rotas OAuth 2.0 completas em `/app/backend/routes/clickup.py`
  - GET /api/integrations/clickup/auth-url — Gera URL de autorização
  - POST /api/integrations/clickup/callback — Troca code por access_token
  - GET /api/integrations/clickup/status/{brand_id} — Status da conexão
  - GET /api/integrations/clickup/workspaces/{brand_id} — Listar workspaces
  - GET /api/integrations/clickup/spaces/{brand_id}/{team_id} — Listar spaces
  - GET /api/integrations/clickup/folders/{brand_id}/{space_id} — Listar folders/lists
  - GET /api/integrations/clickup/lists/{brand_id}/{space_id} — Listas sem pasta
  - POST /api/integrations/clickup/select-list/{brand_id} — Salvar lista selecionada
  - POST /api/integrations/clickup/sync-task/{brand_id} — Criar tarefa no ClickUp
  - DELETE /api/integrations/clickup/disconnect/{brand_id} — Desconectar
- [x] Frontend: ClickUpPanel no Planning.js com botão "Conectar ClickUp"
- [x] Frontend: Seletor hierárquico (Workspace → Space → Lista)
- [x] Frontend: Toggle "Sincronizar com ClickUp" no dialog de nova tarefa
- [x] Frontend: Página callback /integracoes/clickup/callback
- [x] Testes: 17/17 backend + frontend 100%
- [x] Zero créditos de IA consumidos (API REST nativa do ClickUp)

---

## Backlog Priorizado

### P1 - Alta Prioridade
- [ ] White-labeling Fase 1 (tenants, logos, cores, subdomínios)

### P2 - Média Prioridade
- [ ] Melhorias de UX em módulos específicos
- [ ] Push notifications via browser (Web Push API)

### P3 - Baixa Prioridade
- [ ] Refatoração contínua (Settings.js, Touchpoints.js)

---

## Arquivos Chave
- `/app/backend/routes/clickup.py` - ClickUp OAuth 2.0 Integration
- `/app/backend/routes/auth.py` - auto_accept_pending_invites() + login/register/verify
- `/app/backend/routes/team.py` - Invites, accept, force-accept-pending
- `/app/frontend/src/pages/Planning.js` - Planning page + ClickUpPanel
- `/app/frontend/src/pages/ClickUpCallback.js` - OAuth callback handler
- `/app/frontend/src/contexts/BrandContext.js` - refreshBrands()
- `/app/frontend/src/pages/AcceptInvite.js` - Fluxo de aceitação
- `/app/frontend/src/components/Layout.js` - Header + notification bell
- `/app/backend/routes/notifications.py` - Sistema de notificações

## Credenciais de Teste
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste convidado: `sandro@test.com` / `Test@123`
- Teste novo: `newuser@test.com` / `Test@123`
