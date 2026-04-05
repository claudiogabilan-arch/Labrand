# LaBrand - Brand OS

## Problema Original
Ferramenta interna de gestão de marcas para agência de branding.

## Arquitetura
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrações**: OpenAI GPT-4o (Emergent Key), Google Auth (Emergent), Stripe (AI Credits), Resend (Email), ClickUp (OAuth 2.0), Social Media APIs, Web Push (VAPID)

---

## O que foi implementado

### Fase 1-2 - Core + UI/UX Premium (Concluído)
- [x] Login/Auth, Dashboard, CRUD Marcas, 7 Pilares, BVS Score, Relatórios PDF, Créditos IA

### Fase 3 - Naming Module (Concluído - 21/03/2026)
- [x] Wizard 7 etapas, geração algorítmica local

### Fase 4 - Notifications + Improvements (Concluído - 22/03/2026)
- [x] Push Notifications (in-app + email Resend), PillarNavigation

### Fase 5 - ClickUp OAuth 2.0 Integration (Concluído - 29/03/2026)
- [x] OAuth completo, sync log, dashboard widget

### Fase 6 - Social Media APIs Reais (Concluído - 29/03/2026)
- [x] Instagram Graph API, Facebook Pages API, YouTube Data API v3, LinkedIn API, TikTok Creator API

### Fase 7 - Campanhas + Social Posts (Concluído - 29/03/2026)
- [x] Backend CRUD completo, calendário, métricas consolidadas

### Fase 8 - Dashboard Social Consolidado (Concluído - 29/03/2026)
- [x] Widget no Dashboard: seguidores por rede, engajamento total, top posts

### Fase 9 - RBAC (Concluído - 04/04/2026)
- [x] Backend: `permissions.py` com 7 roles de equipe + 2 roles de plataforma
- [x] Frontend: `PermissionContext.js` com `can()`, `canEdit()`, `canFull()`
- [x] Dropdown de convite com 7 roles organizados por grupo (Agência/Cliente)

### Fase 10 - White-Labeling Fase 1 (Concluído - 04/04/2026)
- [x] Backend: `white_label.py` com GET/PUT/DELETE endpoints
- [x] Frontend: paletas, color pickers, preview, logo upload

### Fase 11 - Mapa Mental + Jornada da Marca (Concluído - 04/04/2026)
- [x] Mapa Mental reescrito: nós clicáveis, painel de detalhes, modo tela cheia, exportar PNG
- [x] Jornada da Marca: 5 fases (Fundação → Crescimento), progresso, próximo passo

### Fase 12 - Push Notifications + Paginação DB (Concluído - 05/04/2026)
- [x] Backend: `push.py` com VAPID keys, subscribe/unsubscribe, `send_push_to_user()`
- [x] Frontend: `usePushNotifications.js` hook, `sw-push.js` service worker
- [x] Settings > Personalização: card Push Notifications com toggle
- [x] Notificações push disparadas automaticamente ao criar notificação in-app
- [x] Paginação: `/api/brands`, `/api/brands/{id}/campaigns`, `/api/brands/{id}/naming`
- [x] Testado: Backend 13/13, Frontend 100% (iteration_30)

---

## Backlog Priorizado

### P3 - Baixa Prioridade
- [ ] Refatoração Settings.js em sub-componentes menores
- [ ] Refatoração Touchpoints.js em sub-componentes menores
- [ ] Geração automática de relatórios mensais (PDF consolidado)

---

## Arquivos Chave
- `/app/backend/routes/push.py` - Web Push API
- `/app/backend/routes/white_label.py` - White-Label API
- `/app/backend/routes/permissions.py` - RBAC
- `/app/frontend/src/hooks/usePushNotifications.js` - Push hook
- `/app/frontend/public/sw-push.js` - Service worker
- `/app/frontend/src/pages/BrandMindmap.js` - Mapa Mental
- `/app/frontend/src/pages/BrandJourney.js` - Jornada da Marca
- `/app/frontend/src/components/WhiteLabelSettings.js` - UI White-Label
- `/app/frontend/src/contexts/WhiteLabelContext.js` - Context White-Label
- `/app/frontend/src/App.js` - Router com AppPage wrapper

## Credenciais
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste: `sandro@test.com` / `Test@123`
