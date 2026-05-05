# LaBrand - Brand OS

## Problema Original
Ferramenta interna de gestao de marcas para agencia de branding.

## Arquitetura
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integracoes**: OpenAI GPT-4o (Emergent Key), Google Auth (Emergent), Stripe (AI Credits), Resend (Email), ClickUp (OAuth 2.0), Social Media APIs, Web Push (VAPID)

---

## O que foi implementado

### Fase 1-8 (Concluido ate 29/03/2026)
- Core, UI/UX, Naming, Notifications, ClickUp, Social APIs, Campanhas, Dashboard Social

### Fase 9 - RBAC (Concluido - 04/04/2026)
- 7 roles equipe + 2 plataforma, PermissionContext, dropdown com hierarquia completa

### Fase 10 - White-Labeling (Concluido - 04/04/2026)
- Logo, cores, paletas, preview ao vivo, CSS variables dinamicas

### Fase 11 - Mapa Mental + Jornada (Concluido - 04/04/2026)
- Mindmap clicavel com painel de detalhes, Jornada 5 fases com progresso

### Fase 12 - Push Notifications + Paginacao (Concluido - 05/04/2026)
- Web Push VAPID, service worker, toggle settings, paginacao brands/campaigns/naming

### Fase 13 - Brand Valuation + Arquitetura de Marca (Concluido - 07/04/2026)
- Brand Valuation: Wizard 4 etapas (Financeiro, RBI, Brand Strength, Resultado)
- Arquitetura de Marca: Tipo (Mono/Endossada/Independente), portfolio de produtos
- Integracao Architecture -> Valuation (auto-fill setor e produtos)

### Fase 14 - Refatoracao de Componentes (Concluido - 07/04/2026)
- [x] **Settings.js**: 1563 -> 92 linhas (shell com 7 tabs)
  - SettingsProfile.js (136 linhas)
  - SettingsSecurity.js (73 linhas)
  - SettingsBrands.js (243 linhas)
  - SettingsTeam.js (178 linhas)
  - SettingsIntegrations.js (147 linhas)
  - SettingsPersonalization.js (110 linhas)
  - WhiteLabelSettings (componente existente)
- [x] **Touchpoints.js**: 1181 -> 320 linhas (shell com 5 tabs)
  - TouchpointForm.js (214 linhas)
  - TouchpointOverview.js (148 linhas)
  - TouchpointOffline.js (150 linhas)
  - TouchpointFunnel.js (77 linhas)
  - TouchpointFinancial.js (47 linhas)
  - TouchpointAI.js (97 linhas)
  - GuidanceAlert.js (21 linhas)
  - touchpointConstants.js (35 linhas)
- [x] **Architecture -> Valuation**: Verificado e funcionando (Iteration 32)
- Testado: Backend 100%, Frontend 100% (iteration_32)

### Fase 15 - Historico de Marca (Concluido - 05/05/2026)
- [x] Pagina `/history` com timeline agrupada por data
- [x] Filtros: usuario, modulo, intervalo de datas
- [x] Paginacao "Carregar mais" (20 por pagina)
- [x] Backend `/api/brands/{id}/activity` com skip/limit/user_id/module/date_from/date_to
- [x] Item "Historico" adicionado na secao SISTEMA do sidebar
- Testado: Backend via curl (total:9, has_more, filtros validos), Frontend smoke screenshot OK

### Fase 16 - Skeleton Screens (Concluido - 05/05/2026)
- [x] `components/ui/skeleton-patterns.js` com SkeletonHero/Card/List/Table/Chart
- [x] Substitucao do Loader2 de primeiro carregamento em Dashboard, Touchpoints, Valuation, PillarStart, Reports
- [x] Loader2 de acoes em-andamento (botoes) preservados
- Testado: 0 spinners no main, lint OK

### Fase 17 - Auto-save com Debounce 2s (Concluido - 05/05/2026)
- [x] `hooks/useAutoSave.js` — hook reutilizavel (status idle/saving/saved/error, debounce 2s, AbortController, contador de requests para evitar respostas stale, flush no unmount, force-save manual via Ctrl+S)
- [x] `components/AutoSaveIndicator.js` — indicador inline (sutil) com tempo relativo "Salvo ha Xs" (tick 10s) e botao "Tentar novamente" no estado erro
- [x] Aplicado em 7 PillarX.js + BrandWay.js (substituido o autoSave ad-hoc com useRef/setTimeout)
- [x] Botao "Salvar" virou ghost icon (fallback Ctrl+S)
- [x] Removido `.autosave-*` CSS antigo do index.css (canto bottom-right)
- [x] Narratives.js: nao integrado (fluxo CRUD com saves imediatos via dialog, nao se aplica debounce)
- Testado: PillarStart e BrandWay via Playwright (digitacao -> 2s -> "Salvo agora" verde + persistencia confirmada)

### Fase 18 - Empty States (Concluido - 05/05/2026)
- [x] `components/EmptyState.js` — componente reutilizavel (icone em circulo tinted secondary, h-xl heading, descricao max-w-md, primary + secondary CTA, modo bordered/borderless)
- [x] Aplicado em 6 telas: Touchpoints, Campaigns, Planning, Scorecard, Narratives, Reports (historico)
- [x] Substituidos placeholders genericos "Nenhum X cadastrado" por copy de valor + CTA primario que abre modal/troca tab
- Testado: 4/6 empty states visiveis em smoke test (admin tem campaigns/reports; gating gating verificado via API)

### Fase 19 - Command Palette + Atalhos Globais (Concluido - 05/05/2026)
- [x] `components/CommandPalette.js` — CommandDialog (cmdk) com 3 grupos: Trocar de marca, Ir para pagina (agrupado por secao do sidebar com 40+ paginas), Acoes rapidas (criar marca/tarefa/decisao/touchpoint/campanha, gerar relatorio, ver historico, configuracoes)
- [x] `hooks/useKeyboardShortcuts.js` — Cmd+K toggle palette, Shift+? cheatsheet, combos vim-style "g d/m/s/p/r/t" (timeout 1s), tecla 'c' contextual via window event 'shortcut:create'. Skipa entrada em input/textarea/contentEditable (excecao Cmd+K)
- [x] `components/ShortcutsCheatsheet.js` — Dialog com 3 secoes (Navegacao/Acoes/Edicao), grid 2 colunas, kbd tags estilizadas, conectores "depois" para combos
- [x] Layout.js: monta palette + cheatsheet + listener global; botao "Buscar... ⌘K" no header (md:inline-flex)
- [x] Touchpoints/Campaigns/Planning/Scorecard: listener `shortcut:create` abre modal de criacao
- Testado: Playwright validou Cmd+K abre palette, Esc fecha, g d navega, ? abre cheatsheet, c em Touchpoints abre dialog

### Fase 20 - Painel de Notificacoes Agrupado + Digest (Concluido - 05/05/2026)
- [x] Backend: `routes/notifications.py` — endpoint GET `/notifications?grouped=true` retorna `{unread_count, groups, by_brand}` com mapeamento type→category (comment/change/ai/system); `NotifPrefs` extendido com `email_digest`, `mute_types`, `mute_brands`; novo POST `/notifications/send-digests` (admin)
- [x] Backend: `jobs/notification_digest.py` — `run_digest(frequency, send_email_fn)` agrupa nao lidas dos ultimos N dias, filtra por mute_types/mute_brands, envia HTML agrupado via Resend, marca `digested_at` para idempotencia
- [x] Frontend Layout: painel reformulado com toggle "Por tipo" / "Por marca", grupos colapsaveis com count badge, footer "Configurar notificacoes →" link para /settings?tab=notifications
- [x] Frontend: `components/settings/SettingsNotifications.js` + nova aba em Settings (8 colunas, com query param `?tab=notifications` deep-link)
- [x] Frequencia (off/daily/weekly), silenciar tipos (4 checkboxes), silenciar marcas (lista de brands)
- Testado: Curl validou todos endpoints (grouped, prefs GET/PUT, send-digests); Playwright validou painel agrupado, toggle de view, navegacao para settings, persistencia (`weekly_persisted: 1`)

---

## Backlog Priorizado

### P2 - Media Prioridade
- [ ] Geracao automatica de relatorios mensais (PDF consolidado)

### P3 - Baixa Prioridade
- [ ] Gamificacao na Jornada (badges por fase)
- [ ] Export Brand Guide PDF

---

## Arquivos Chave
- `/app/frontend/src/pages/Settings.js` - Shell com 7 tabs
- `/app/frontend/src/components/settings/` - 6 sub-componentes
- `/app/frontend/src/pages/Touchpoints.js` - Shell com 5 tabs
- `/app/frontend/src/components/touchpoints/` - 8 sub-componentes
- `/app/backend/routes/valuation.py` - Brand Valuation API
- `/app/backend/routes/brand_architecture.py` - Arquitetura + portfolio
- `/app/backend/routes/push.py` - Web Push
- `/app/backend/routes/permissions.py` - RBAC
- `/app/frontend/src/App.js` - Router

## Credenciais
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste: `sandro@test.com` / `Test@123`
