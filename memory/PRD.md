# LaBrand - Brand OS

## Problema Original
Ferramenta interna de gestão de marcas para agência de branding. Plataforma que unifica estratégia, criatividade e colaboração em um único ambiente.

## Personas
- **Admin/Agência**: Equipe interna LABrand que gerencia marcas de clientes
- **Clientes**: (Futuro) Acesso white-label com branding personalizado

## Requisitos Core
1. Autenticação (Google Auth + JWT)
2. Dashboard com métricas + atividade recente + status rápido
3. Pilares de Marca (7 coleções) com navegação integrada
4. Naming (Ferramenta de criação de nomes - 7 etapas, 100% local)
5. Relatórios PDF (Executivo + Custom)
6. Créditos de IA via Stripe
7. Push Notifications (in-app + email)
8. Colaboração (aprovações, comentários, log de atividades)
9. UI/UX premium (Linear-inspired)

## Arquitetura
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrações**: OpenAI GPT-4o (Emergent Key), Google Auth (Emergent), Stripe (AI Credits), Resend (Email notifications)

---

## O que foi implementado

### Fase 1 - Core (Concluído)
- [x] Login/Auth (Google + JWT)
- [x] Dashboard com métricas
- [x] CRUD de Marcas
- [x] 7 Pilares de Marca
- [x] BVS Score, Mapa Mental, Ferramentas
- [x] Relatórios PDF (Executivo + Custom com logos LABrand)
- [x] Créditos de IA via Stripe

### Fase 2 - UI/UX Premium (Concluído)
- [x] Redesign "Linear-inspired" (login preto/branco, glassmorphism)
- [x] Design system com CSS variables, fonte Inter, accent laranja

### Fase 3 - Naming Module (Concluído - 21/03/2026)
- [x] Wizard de 7 etapas com geração algorítmica local
- [x] 12 arquétipos, 20 provocações, 39 idiomas, análise fonética
- [x] Avaliação por estrelas + export .txt
- [x] CRUD completo com auto-save MongoDB

### Fase 4 - Notifications + Module Improvements + Refactoring (Concluído - 22/03/2026)
- [x] Push Notifications: Sino in-app no header, email via Resend
- [x] Preferências de Notificação: Settings com toggles conectadas ao backend
- [x] Dashboard Enriquecido: Atividade Recente + Status Rápido
- [x] Navegação entre Pilares: Componente PillarNavigation compartilhado (7 páginas)
- [x] Colaboração + Notificações: Auto-criação de notificações em aprovações/comentários
- [x] Refatoração: Remoção de Plans.js (código morto), componentes compartilhados

### Bug Fix - Convite de Equipe (Concluído - 22/03/2026)
- [x] BrandContext: adicionado `refreshBrands()` que reseta `hasFetchedRef` e recarrega marcas
- [x] AcceptInvite: chama `refreshBrands()` após aceitar convite
- [x] BrandContext: auto-seleciona marca corretamente quando marca atual não está na lista
- [x] AuthCallback: verifica `pending_invite` após Google Auth e redireciona para aceitação
- [x] ProtectedRoute: verifica `pending_invite` ao acessar rotas protegidas

---

## Backlog Priorizado

### P1 - Alta Prioridade
- [ ] White-labeling Fase 1 (tenants, logos, cores, subdomínios)

### P2 - Média Prioridade
- [ ] Mais melhorias de UX em módulos específicos (Touchpoints, Reports, etc.)
- [ ] Push notifications via browser (Web Push API)

### P3 - Baixa Prioridade
- [ ] Refatoração contínua (Settings.js 1480 linhas, Touchpoints.js 1181 linhas)
- [ ] Testes de regressão automatizados

---

## Arquivos Chave
- `/app/frontend/src/contexts/BrandContext.js` - Context com refreshBrands
- `/app/frontend/src/pages/AcceptInvite.js` - Fluxo de aceitação de convite
- `/app/frontend/src/components/AuthCallback.js` - Google Auth callback
- `/app/frontend/src/components/ProtectedRoute.js` - Verificação de pending_invite
- `/app/frontend/src/components/PillarNavigation.js` - Navegação compartilhada dos pilares
- `/app/frontend/src/components/Layout.js` - Header com sino de notificações
- `/app/frontend/src/pages/Dashboard.js` - Dashboard com atividade + status
- `/app/frontend/src/pages/Naming.js` - Wizard de Naming (7 etapas)
- `/app/backend/routes/notifications.py` - Sistema de notificações
- `/app/backend/routes/collaboration.py` - Colaboração + triggers de notificação
- `/app/backend/routes/team.py` - Convites de equipe

## Credenciais de Teste
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
- Teste convidado: `sandro@test.com` / `Test@123`
