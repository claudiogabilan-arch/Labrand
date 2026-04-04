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
- [x] App.js refatorado com `AppPage` wrapper
- [x] Testado: Backend 18/18, Frontend 100% (iteration_27)

### Fase 10 - White-Labeling Fase 1 (Concluído - 04/04/2026)
- [x] Backend: `white_label.py` com GET/PUT/DELETE endpoints
- [x] Frontend: `WhiteLabelSettings.js` — paletas, color pickers, preview, logo upload
- [x] `WhiteLabelContext.js` aplica CSS variables dinamicamente
- [x] Testado: Backend 9/9, Frontend 100% (iteration_28)

### Fase 11 - Mapa Mental + Jornada da Marca (Concluído - 04/04/2026)
- [x] **Mapa Mental reescrito**: Nós clicáveis, painel de detalhes lateral, barra de progresso por pilar, botão "Ir para [pilar]", modo tela cheia, exportar PNG, legenda interativa
- [x] **Jornada da Marca (nova página)**: 5 fases (Fundação, Diferenciação, Expressão, Gestão, Crescimento), barra de progresso geral, próximo passo recomendado, cards de módulos clicáveis com status e %, timeline visual
- [x] Sidebar atualizado com "Jornada" (Route icon)
- [x] Testado: Frontend 100% (iteration_29)

---

## Backlog Priorizado

### P2 - Média Prioridade
- [ ] Push Notifications via Browser (Web Push API)

### P3 - Baixa Prioridade
- [ ] Otimização de queries DB (paginação brands/pillars)
- [ ] Refatoração contínua (Settings.js, Touchpoints.js)
- [ ] Geração automática de relatórios mensais (PDF consolidado)

---

## Arquivos Chave
- `/app/frontend/src/pages/BrandMindmap.js` - Mapa Mental interativo
- `/app/frontend/src/pages/BrandJourney.js` - Jornada da Marca
- `/app/backend/routes/white_label.py` - White-Label API
- `/app/backend/routes/permissions.py` - RBAC
- `/app/frontend/src/components/WhiteLabelSettings.js` - UI White-Label
- `/app/frontend/src/contexts/WhiteLabelContext.js` - Context White-Label
- `/app/frontend/src/contexts/PermissionContext.js` - Context RBAC
- `/app/frontend/src/components/Layout.js` - Sidebar + Header
- `/app/frontend/src/App.js` - Router com AppPage wrapper

## Credenciais de Teste
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste convidado: `sandro@test.com` / `Test@123`
