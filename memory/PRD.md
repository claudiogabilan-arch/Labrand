# LaBrand - Brand OS
## Strategic Brand Infrastructure Platform

### Problem Statement
Platform for B2B companies and consultants with strategic brand development, valuation, risk analysis, competitor comparison, consistency alerts, offline touchpoints tracking, advanced collaboration, and executive dashboard.

### Tech Stack
- Frontend: React + Shadcn UI + Tailwind CSS
- Backend: FastAPI + Python
- Database: MongoDB
- Auth: JWT + Emergent Google OAuth
- AI: OpenAI GPT-4o (Emergent LLM Key)
- Email: Resend
- Payments: Stripe

### Users
- Admin: admin@labrand.com.br / Labrand@2026!
- Owner: claudiogabilan@gmail.com / Cla@2026
- Production: labrand.com.br

### Completed Features
- Full auth system (JWT + Google OAuth + password change)
- Brand CRUD with pillar system (Start, Proposito, Promessa, etc.)
- BVS Score calculation
- Executive reports
- Mind map with PDF export
- Brand tracking with timeline
- Offline Touchpoints (Palestra, Imersao, TV, Mentoria)
- Advanced Collaboration (approvals, comments)
- Admin Dashboard (users, payments, credits)
- Admin System Emails (Resend)
- Naming module with semantic map
- Settings (profile, security, brands, team, integrations)

### Recent Fixes (2026-03-20)
1. **Login redirect** - Replaced window.location.href with navigate() to prevent React state loss
2. **BrandContext auto-load** - Brands now auto-fetch when user is authenticated (was relying on Layout useEffect timing)
3. **Password change** - Settings security form now calls real POST /api/auth/change-password (was fake setTimeout)
4. **Admin badge** - Layout now shows "Admin" badge for admin users (was showing "Cliente")
5. **is_admin in /auth/me** - Backend now returns is_admin field in /auth/me and /auth/login responses
6. **Admin setup on production** - Set claudiogabilan@gmail.com as admin with is_admin=True

### Priority Backlog
- P1: White-labeling for enterprise clients
- P2: Better PDF Reports
- P2: Push Notifications for Collaboration
- P3: Refactoring (split large route files)

### Architecture
```
/app/backend/
  routes/: auth.py, brands.py, admin.py, admin_emails.py, collaboration.py, naming.py, touchpoints.py
  utils/: helpers.py
  server_new.py, config.py
/app/frontend/src/
  contexts/: AuthContext.js, BrandContext.js
  components/: LoginPage.js, Layout.js, AuthCallback.js, ProtectedRoute.js
  pages/: Dashboard.js, Settings.js, AdminDashboard.js, BrandTracking.js, Collaboration.js, Touchpoints.js
  App.js
```

### Critical Notes
- Production (labrand.com.br) needs "Save to Github" + deploy to get code updates
- Code changes NEVER affect MongoDB data
- Always prefix backend routes with /api
- Use .env for all credentials
