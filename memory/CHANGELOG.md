## 2026-05-05 — Módulo "De Dentro Pra Fora" (Endomarketing) — Frontend finalizado

- ✅ Rota `/endomarketing` plugada em `App.js` (lazy-loaded)
- ✅ Item "De Dentro Pra Fora" adicionado ao sidebar em `Layout.js`
  (seção Diagnóstico, ícone Flame, badge "Novo")
- ✅ Entry adicionada ao CommandPalette (⌘K)
- ✅ Nova tab **Painel** (5ª tab) — dashboard visual escuro com:
  - 4 stat cards (score, nível, ponto forte, maior oportunidade)
  - RadarChart + BarChart horizontal com gaps
  - Análise de Gaps agrupada (score + potencial) + Diagnóstico Executivo
  - 5 cards da Temporada Gamificada (competição, palco, comunidade,
    pessoas, game) + Timeline do cronograma
  - Todos os dados vêm de `GET /api/endomarketing/diagnosis/{brand_id}`
- ✅ Cancelamento (AbortController) estendido para `Reports.js`,
  `BrandHistory.js`, `Touchpoints.js`, `Campaigns.js`
- ✅ Warning a11y do `CommandDialog` (DialogTitle) corrigido com
  `VisuallyHidden`
- ✅ Testing agent (iteration_33): 26/26 testes passaram (100% backend
  + frontend)


# LaBrand - Changelog

## 2026-03-21 - AI Credits Fix + PDF Reports Enhanced
- **Fixed**: Compra de créditos IA ("Erro ao iniciar compra") — import corrigido para `emergentintegrations.payments.stripe.checkout`
- **Added**: Endpoint `/api/ai-credits/checkout-status/{session_id}` para polling de status
- **Added**: Registro de transações em `payment_transactions` collection
- **Added**: Webhook endpoint `/api/webhook/stripe`
- **Enhanced**: Relatório PDF profissional com capa dark, índice, gráfico de pilares, seção BVS Score, touchpoints detalhados, recomendações com prioridade
- Files: `credits.py`, `reports.py`, `AICredits.js`

## 2026-03-21 - CORS Fix (P0 Critical)
- **Fixed**: `allow_origins=["*"]` with `allow_credentials=True` broke all API calls in production
- **Solution**: Read explicit origins from `CORS_ORIGINS` and `FRONTEND_URL` env vars
- **Result**: All data (brands, team, integrations) loading correctly again
- **Files changed**: `backend/server_new.py`, `backend/.env`

## 2026-03-21 - Plans Removal
- Removed all SaaS subscription logic (free, founder, pro plans)
- Removed Stripe integration
- Platform converted to internal agency tool
- Files: `admin.py`, `auth.py`, `server_new.py`, `Layout.js`, `App.js`, `AdminDashboard.js`

## 2026-03-21 - Auth & Brand Improvements
- Login redirect: replaced `window.location.href` with React Router `navigate`
- Brand auto-load: BrandContext fetches brands automatically on auth
- Real password change: POST /api/auth/change-password
- Admin badge: correctly shows "Admin" role
