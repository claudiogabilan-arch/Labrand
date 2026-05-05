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

### Fase 21 - Comparar Marcas Lado a Lado (Concluido - 05/05/2026)
- [x] Backend: `GET /api/brands/{id}/compare-snapshot` — retorno plano com brand identity, metrics (overall_completion, brand_strength, bvs_score, valuation), pillars (label/progress/summary com fallback iso-aware), counts (touchpoints/campaigns/decisions), last_updated
- [x] Frontend: `pages/BrandCompare.js` — header, 2 BrandPickers (com auto-disable da marca selecionada do outro lado), empty state, IdentityCard, ScoreCard com trend ▲/▼, PillarsTable em grid 7 linhas, MetricsRow operacional, PurposeDiff em Times Italic com border-l-2 secondary
- [x] Deep-link `?a=brand_id&b=brand_id` para pre-selecao via Cmd+K
- [x] Layout: item "Comparar Marcas" (icon GitCompareArrows) na secao INTELIGÊNCIA
- [x] CommandPalette: novo grupo "Comparar marcas" + entrada "/compare" no registry de paginas
- [x] Mobile responsivo (md:grid-cols-2 → empilha em <md)
- Testado: Curl validou snapshot retornando 7 pillars com summary; Playwright validou empty state, deep-link com 2 cards/scores/7 pillar rows/purpose diff, sidebar ativo, Cmd+K mostra opcao "Comparar com Sandro Serzedello"

### Fase 22 - Robustez Frontend (Concluido - 05/05/2026)
- [x] `components/ErrorBoundary.js` — class component com getDerivedStateFromError + componentDidCatch, fallback UI com botoes "Voltar ao Dashboard" / "Recarregar"
- [x] `hooks/useApiCall.js` — single-in-flight axios call com AbortController, abort no unmount, isCancel/CanceledError → null retornado para short-circuit limpo, isMounted() guard
- [x] `App.js` reescrito: `lazy() + Suspense` em ~55 paginas, `ErrorBoundary` envolvendo `<Suspense><Routes/>`. Pages de auth (LoginPage, ResetPassword, VerifyEmail, AcceptInvite, NotFound) ficam eager no bundle inicial
- [x] `AuthContext`: listener de evento `storage` para sync entre abas (logout em uma → reflete na outra)
- [x] `BrandContext`: removido todo `localStorage.getItem('labrand_token')` fallback — usa `token` do useAuth direto. Apenas `AuthContext` lê localStorage no init
- Testado: bundle.js 541KB, Dashboard chunk 19KB, Touchpoints +5 chunks ao navegar — code-split confirmado; cross-tab logout via storage event redireciona para /login; Suspense fallback ("Carregando...") tem testid; lint passou em todos os arquivos

### Fase 23 - Dashboard Ecossistema de Marca (Concluido - 05/05/2026)
- [x] `pages/Dashboard.js` reescrito do zero — painel analitico dark (bg #0D0E10, cards #161719, border #1F2124)
- [x] Header com seletor de periodo (30/90/365 dias)
- [x] Linha 1: 4 stat cards (BVS Score, Pilares Preenchidos, Saude da Marca, Mencoes Sociais) com sub-labels coloridos e mini barras de progresso
- [x] Linha 2: Evolucao da Marca (Recharts AreaChart com 3 series gradient — BVS/Saude/Social) + Forca por Pilar (BarChart horizontal com barras laranja)
- [x] Linha 3: Funil de Marca (CSS trapezoidal) + Share of Voice (PieChart donut) + Mencoes ao Longo do Tempo (AreaChart stacked positive/neutral/negative)
- [x] Linha 4: Dimensoes da Marca (RadarChart 6 eixos) + Benchmark de Concorrentes (tabela com linha da marca destacada com border-left laranja)
- [x] Empty states elegantes em cada card sem dados (icone Database + texto + CTA ghost para preencher modulo correspondente)
- [x] Tooltip dark customizado, skeleton loading, responsivo (grid 12 cols → empilha em <md)
- [x] Dados consumidos de 8 endpoints reais (bvs, bvs/history, brand-health, brand-funnel, share-of-voice, social-listening/mentions, competitors/analyses, metrics) via Promise.allSettled
- Testado: 9 cards renderizaram, dark theme aplicado, valores reais (BVS 53.8, Pilares 4/7, Saude 40%, 7 pillar bars), lint OK, sem console errors

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
