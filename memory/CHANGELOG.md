# LaBrand - Changelog

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
