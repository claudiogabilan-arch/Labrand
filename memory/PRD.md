# LaBrand - Brand OS

## Problema Original
Ferramenta interna de gestão de marcas para agência de branding.

## Arquitetura
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrações**: OpenAI GPT-4o (Emergent Key), Google Auth (Emergent), Stripe (AI Credits), Resend (Email), ClickUp (OAuth 2.0), Social Media APIs, Web Push (VAPID)

---

## O que foi implementado

### Fase 1-8 (Concluído até 29/03/2026)
- Core, UI/UX, Naming, Notifications, ClickUp, Social APIs, Campanhas, Dashboard Social

### Fase 9 - RBAC (Concluído - 04/04/2026)
- 7 roles equipe + 2 plataforma, PermissionContext, dropdown com hierarquia completa

### Fase 10 - White-Labeling (Concluído - 04/04/2026)
- Logo, cores, paletas, preview ao vivo, CSS variables dinâmicas

### Fase 11 - Mapa Mental + Jornada (Concluído - 04/04/2026)
- Mindmap clicável com painel de detalhes, Jornada 5 fases com progresso

### Fase 12 - Push Notifications + Paginação (Concluído - 05/04/2026)
- Web Push VAPID, service worker, toggle settings, paginação brands/campaigns/naming

### Fase 13 - Brand Valuation + Arquitetura de Marca (Concluído - 07/04/2026)
- [x] **Brand Valuation**: Wizard 4 etapas (Financeiro → Brand Contribution RBI → Brand Strength BS → Resultado)
  - Setores: serviços, SaaS, varejo, indústria, saúde, agro, educação, outro
  - Cálculo: múltiplos EBITDA ajustados por margem, crescimento, recorrência, dívida
  - RBI: 5 perguntas (decisão compra, prêmio preço, lealdade, talentos, extensibilidade)
  - BS: 10 fatores Interbrand (clareza, compromisso, governança, responsividade, autenticidade, relevância, diferenciação, consistência, presença, engajamento)
  - Brand Value = EV × RBI% × BS_multiplier
  - Testado: Backend 17/17, Frontend 100% (iteration_31)
- [x] **Arquitetura de Marca**: Tipo (Monolítica/Endossada/Independente), presença global, portfolio de produtos
  - CRUD produtos com tipo, relação, ticket médio, canal
  - Testado: Backend 17/17 (iteration_31)

---

## Backlog Priorizado

### P3 - Baixa Prioridade
- [ ] Refatoração Settings.js e Touchpoints.js em sub-componentes
- [ ] Geração automática de relatórios mensais (PDF consolidado)
- [ ] Gamificação na Jornada (badges por fase)

---

## Arquivos Chave
- `/app/backend/routes/valuation.py` - Brand Valuation API + compute_valuation()
- `/app/backend/routes/brand_architecture.py` - Arquitetura + portfolio
- `/app/frontend/src/pages/BrandValuation.js` - Wizard 4 etapas
- `/app/frontend/src/pages/BrandArchitecture.js` - UI Arquitetura
- `/app/backend/routes/push.py` - Web Push
- `/app/backend/routes/permissions.py` - RBAC
- `/app/frontend/src/App.js` - Router

## Credenciais
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste: `sandro@test.com` / `Test@123`
