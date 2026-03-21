# LaBrand - Brand OS

## Problema Original
Ferramenta interna de gestão de marcas para agência de branding. Plataforma que unifica estratégia, criatividade e colaboração em um único ambiente.

## Personas
- **Admin/Agência**: Equipe interna LABrand que gerencia marcas de clientes
- **Clientes**: (Futuro) Acesso white-label com branding personalizado

## Requisitos Core
1. Autenticação (Google Auth + JWT)
2. Dashboard com métricas da marca
3. Pilares de Marca (7 coleções: start, values, personality, valuation, brand_culture, bvs_scores, pillars)
4. Naming (Ferramenta de criação de nomes - 7 etapas)
5. Relatórios PDF (Executivo + Custom)
6. Créditos de IA via Stripe
7. UI/UX premium (Linear-inspired)

## Arquitetura
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Integrações**: OpenAI GPT-4o (Emergent Key), Google Auth (Emergent), Stripe (AI Credits)

## Stack Técnica
- React 18, Tailwind CSS, Shadcn UI, Axios
- FastAPI, Motor (MongoDB async), Pydantic
- emergentintegrations (Stripe + LLM)

---

## O que foi implementado

### Fase 1 - Core (Concluído)
- [x] Login/Auth (Google + JWT)
- [x] Dashboard com métricas
- [x] CRUD de Marcas
- [x] 7 Pilares de Marca
- [x] BVS Score
- [x] Mapa Mental
- [x] Ferramentas (Frameworks, Análise Competitiva)
- [x] Relatórios PDF (Executivo + Custom com logos LABrand)
- [x] Créditos de IA via Stripe

### Fase 2 - UI/UX Premium (Concluído)
- [x] Redesign "Linear-inspired" (login preto/branco, glassmorphism interno)
- [x] Design system com CSS variables
- [x] Fonte Inter, accent laranja (#f97316)

### Fase 3 - Naming Module Rewrite (Concluído - 21/03/2026)
- [x] Wizard de 7 etapas (Essência → Propulsor → Semântico → Geração → Sonoro → Global → Avaliação)
- [x] Geração algorítmica local (sem IA, sem créditos)
- [x] 10+ técnicas: Composição, Portmanteau, Prefixo, Sufixo, Acrônimo, Inversão, Subtração, Substituição
- [x] 12 Arquétipos com word banks em 11 idiomas
- [x] 20 Provocações metodológicas (Inspiração, Construção, Implementação)
- [x] 39 idiomas suportados com seletor e busca
- [x] Análise fonética local (sílabas, memorabilidade, pronúncia, fluidez, ritmo, aliteração)
- [x] Verificação internacional em 6 idiomas
- [x] Avaliação por estrelas (5 critérios: Memorável, Sonoridade, Ortografia, Conceito, Originalidade)
- [x] Export relatório .txt
- [x] Auto-save (debounced 2s) no MongoDB
- [x] CRUD completo de projetos
- [x] Backend: 100% testes passando (7/7)
- [x] Frontend: 95% testes passando

---

## Backlog Priorizado

### P0 - Crítico
- [ ] Ajuste dos planos de Créditos IA no Stripe (aguardando valores do usuário)

### P1 - Alta Prioridade
- [ ] White-labeling Fase 1 (tenants, logos, cores, subdomínios)

### P2 - Média Prioridade
- [ ] Push Notifications para Colaboração
- [ ] Melhorar outros fluxos de módulos (conforme solicitado pelo usuário)

### P3 - Baixa Prioridade
- [ ] Refatoração contínua (modularização de páginas grandes)
- [ ] Testes de regressão automatizados

---

## Arquivos Chave
- `/app/frontend/src/pages/Naming.js` - Wizard de Naming (7 etapas)
- `/app/frontend/src/data/namingData.js` - Constantes do Naming
- `/app/frontend/src/utils/namingUtils.js` - Algoritmos de geração
- `/app/backend/routes/naming.py` - API CRUD Naming
- `/app/backend/routes/credits.py` - Créditos IA / Stripe
- `/app/backend/routes/reports.py` - Geração de PDF
- `/app/frontend/src/index.css` - Design System

## Credenciais de Teste
- Admin: `admin@labrand.com.br` / `Labrand@2026!`
