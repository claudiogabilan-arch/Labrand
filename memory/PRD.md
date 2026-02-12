# LaBrand – Brand OS

## Problema Original
Criar uma aplicação web para facilitar a gestão de marcas para empresas, cobrindo diagnóstico, criação de estratégia, execução e medição de resultados.

## Requisitos do Produto
- **Onboarding:** Registro de clientes, conexão com Google Analytics/Search Console, importação de documentos do Google Drive.
- **Pilares Core:** Módulos para desenvolvimento estratégico de marca (Start, Valores, Propósito, Promessa, Posicionamento, Personalidade, Universal).
- **Dashboards & Ferramentas:** Dashboard de Inteligência, módulo de Planejamento & Execução, Scorecard, Histórias & Narrativas, Avaliação de Marca, Inteligência de Audiência, Calendário de Campanhas, Identidade Visual, Investment Match.
- **Usuários & Permissões:** Dois papéis - "Estrategista" (acesso total) e "Cliente" (somente leitura).
- **Design:** Interface moderna, responsiva, acessível com dark mode. Branding personalizado. Português brasileiro.
- **Modelo SaaS:** Planos gratuito e pagos com período de trial de 15 dias.
- **Integrações:** APIs do Google (Analytics, Drive, Search Console), OpenAI para insights, gateway de pagamento (Treeal).

## Arquitetura Técnica
```
/app/
├── backend/
│   ├── .env
│   ├── requirements.txt
│   └── server.py (monolítico - precisa refatorar)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── pages/
│   └── public/
└── memory/
    └── PRD.md
```

## O que foi Implementado

### Autenticação & Usuários
- [x] JWT Authentication
- [x] Google OAuth 2.0
- [x] Papéis: Estrategista / Cliente
- [x] Hook usePermissions
- [x] **Esqueci minha senha** (12/02/2026)

### Pilares de Marca
- [x] Start, Valores, Propósito, Promessa
- [x] Posicionamento, Personalidade (12 arquétipos)
- [x] Universal

### Gestão
- [x] Dashboard com métricas
- [x] Avaliação de Marca (valuation completo)
- [x] Relatórios em PDF
- [x] Planejamento, Decisões, Narrativas

### Ferramentas
- [x] **Identidade Visual** - Sugestões de cores, tipografia e estilo baseadas no arquétipo
- [x] **Investment Match** - VCs REAIS brasileiros (Kaszek, Valor Capital, Canary, etc.)
- [x] **Audiência** - Influenciadores REAIS (Instagram + YouTube) com links clicáveis

### Sistema
- [x] Planos SaaS (Free, Pro, Enterprise)
- [x] Trial de 15 dias
- [x] Dark mode
- [x] Upload de logo
- [x] Branding LABrand

## Endpoints da API

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/auth/google/init
- GET /api/auth/google/callback

### Brands
- GET/POST /api/brands
- GET/PUT/DELETE /api/brands/{brand_id}
- POST /api/brands/{brand_id}/logo
- GET /api/brands/{brand_id}/report

### Pillars
- GET/PUT /api/brands/{brand_id}/pillars

### Valuation
- GET/POST /api/brands/{brand_id}/valuation

### Identity (NOVO)
- GET /api/brands/{brand_id}/identity
- POST /api/brands/{brand_id}/identity/generate

### Investment (NOVO)
- GET /api/investment/investors
- GET /api/investment/opportunities

### Campaigns
- GET/POST /api/campaigns
- PUT/DELETE /api/campaigns/{campaign_id}

## Pendências

### P0 (Crítico)
- [ ] Integrar Treeal para pagamentos (aguardando credenciais)

### P1 (Alta)
- [ ] Implementar AI Mentor com insights reais
- [ ] Completar módulo Audiência
- [ ] Completar módulo Campanhas
- [ ] Buscar dados do Google Analytics/Search Console

### P2 (Média)
- [ ] Refatorar backend/server.py em routers separados
- [ ] Importação de arquivos do Google Drive
- [ ] Conteúdo do Tutorial de onboarding
- [ ] Base real de VCs para Investment Match

### P3 (Backlog)
- [ ] Integração com Canva
- [ ] Melhorar geração de relatórios PDF
- [ ] Análise de PDFs grandes

## Credenciais de Teste
- **Estrategista:** demo@labrand.com / password123
- **Cliente:** cliente@labrand.com / password123

## Integrações de Terceiros
| Serviço | Status | Chave |
|---------|--------|-------|
| Google OAuth | ✅ Configurado | User-provided |
| OpenAI | ✅ Configurado | Emergent LLM Key |
| Treeal | ⏳ Aguardando | Pendente |

## Notas Técnicas
- MongoDB para persistência
- bcrypt 4.0.1 para hashing
- reportlab para PDFs
- Dados de VCs são MOCK (pode evoluir para API real)
