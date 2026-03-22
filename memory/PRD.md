# LaBrand - Brand OS

## Problema Original
Ferramenta interna de gestão de marcas para agência de branding.

## Arquitetura
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrações**: OpenAI GPT-4o (Emergent Key), Google Auth (Emergent), Stripe (AI Credits), Resend (Email)

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
**Problema**: Usuários convidados não viam a marca após registro.
**Causa raiz**: Usuários registravam-se diretamente (sem clicar no link do convite), então o convite ficava "pendente" e o team_members nunca era criado.
**Correções**:
- [x] `auto_accept_pending_invites()` em auth.py: chamada no login, verify-email e Google Auth
- [x] `refreshBrands()` no BrandContext: reseta hasFetchedRef e recarrega marcas
- [x] AcceptInvite.js: chama refreshBrands após aceitar
- [x] AuthCallback + ProtectedRoute: verificam pending_invite no fluxo de auth
- [x] team.py: admins globais (is_admin) podem convidar em qualquer marca
- [x] `POST /api/team/force-accept-pending`: endpoint admin para forçar aceite de convites pendentes de usuários já registrados

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
- `/app/backend/routes/auth.py` - auto_accept_pending_invites() + login/register/verify
- `/app/backend/routes/team.py` - Invites, accept, force-accept-pending
- `/app/frontend/src/contexts/BrandContext.js` - refreshBrands()
- `/app/frontend/src/pages/AcceptInvite.js` - Fluxo de aceitação
- `/app/frontend/src/components/AuthCallback.js` - Google Auth + pending invite
- `/app/frontend/src/components/ProtectedRoute.js` - pending invite check
- `/app/frontend/src/components/PillarNavigation.js` - Navegação pilares
- `/app/frontend/src/components/Layout.js` - Header + notification bell
- `/app/backend/routes/notifications.py` - Sistema de notificações

## Credenciais de Teste
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste convidado: `sandro@test.com` / `Test@123`
- Teste novo: `newuser@test.com` / `Test@123`
