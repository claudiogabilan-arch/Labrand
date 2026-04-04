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
- [x] Frontend: Calendário + lista + detalhe com métricas
- [x] Vínculo de posts de redes sociais a campanhas

### Fase 8 - Dashboard Social Consolidado (Concluído - 29/03/2026)
- [x] Widget no Dashboard: seguidores por rede, engajamento total, top posts

### Fase 9 - RBAC (Concluído - 04/04/2026)
- [x] Backend: `permissions.py` com 7 roles de equipe + 2 roles de plataforma
- [x] Frontend: `PermissionContext.js` com `can()`, `canEdit()`, `canFull()`
- [x] App.js refatorado com `AppPage` wrapper (ProtectedRoute > BrandProvider > PermissionProvider > WhiteLabelProvider > MainLayout)
- [x] Testado: Backend 18/18, Frontend 100% (iteration_27)

### Fase 10 - White-Labeling Fase 1 (Concluído - 04/04/2026)
- [x] Backend: `white_label.py` com GET/PUT/DELETE endpoints
- [x] Frontend: `WhiteLabelSettings.js` com:
  - Upload de logo customizado
  - 6 paletas predefinidas (Azul, Verde, Roxo, Vermelho, Laranja, Rose)
  - 4 color pickers (primaria, destaque, sidebar BG, sidebar texto)
  - 5 opções de border-radius para botões
  - Preview ao vivo
- [x] `WhiteLabelContext.js` aplica CSS variables dinamicamente
- [x] Layout.js: sidebar usa cores e logo da marca quando ativo
- [x] Testado: Backend 9/9, Frontend 100% (iteration_28)

---

## Backlog Priorizado

### P1 - Alta Prioridade
- [ ] Revisitar Mapa Mental (não é clicável, bagunçado visualmente)
- [ ] Revisitar Jornada do Cliente (não apenas onboarding)

### P2 - Média Prioridade
- [ ] Push Notifications via Browser (Web Push API)

### P3 - Baixa Prioridade
- [ ] Otimização de queries DB (paginação brands/pillars)
- [ ] Refatoração contínua (Settings.js, Touchpoints.js)
- [ ] Geração automática de relatórios mensais (PDF consolidado)

---

## Arquivos Chave
- `/app/backend/routes/white_label.py` - White-Label API
- `/app/backend/routes/permissions.py` - RBAC
- `/app/backend/routes/campaigns.py` - Campanhas CRUD
- `/app/backend/routes/clickup.py` - ClickUp OAuth 2.0
- `/app/backend/routes/social_fetcher.py` - Social APIs
- `/app/frontend/src/components/WhiteLabelSettings.js` - UI White-Label
- `/app/frontend/src/contexts/WhiteLabelContext.js` - Context White-Label
- `/app/frontend/src/contexts/PermissionContext.js` - Context RBAC
- `/app/frontend/src/components/Layout.js` - Sidebar + Header
- `/app/frontend/src/App.js` - Router com AppPage wrapper

## Credenciais de Teste
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste convidado: `sandro@test.com` / `Test@123`
- Teste novo: `newuser@test.com` / `Test@123`
