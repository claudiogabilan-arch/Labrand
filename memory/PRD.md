# LaBrand – Brand OS

## Product Requirements Document

### Data de Criação: 2024-02-10

---

## Visão Geral
LaBrand é uma plataforma completa de gestão de marca (Brand OS) que permite diagnóstico, criação de estratégia, execução de ações e mensuração de resultados de branding.

---

## Arquitetura

### Stack Tecnológica
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Banco de Dados**: MongoDB
- **Autenticação**: JWT + Google OAuth (Emergent Auth)
- **IA**: OpenAI GPT-5.2 via Emergent LLM Key

### Estrutura de Arquivos
```
/app/
├── backend/
│   ├── server.py          # API principal
│   └── .env               # Variáveis de ambiente
├── frontend/
│   ├── src/
│   │   ├── App.js         # Roteamento principal
│   │   ├── contexts/      # AuthContext, BrandContext
│   │   ├── components/    # Layout, Login, ProtectedRoute
│   │   └── pages/         # Dashboard, Pilares, Planning, etc.
│   └── .env
└── memory/
    └── PRD.md             # Este documento
```

---

## Personas de Usuário

### 1. Estrategista
- Acesso total a todos os módulos
- Pode criar, editar e gerenciar marcas
- Acessa dashboards e métricas completas
- Gerencia permissões de clientes

### 2. Cliente
- Acesso de leitura a dashboards
- Visualiza narrativas e histórico
- Input apenas em campos liberados pelo estrategista

---

## Funcionalidades Implementadas ✅

### Autenticação
- [x] Login com email/senha (JWT)
- [x] Login com Google OAuth (Emergent Auth)
- [x] Registro de novos usuários
- [x] Logout e gestão de sessão

### Gestão de Marcas
- [x] Criar nova marca
- [x] Listar marcas do usuário
- [x] Selecionar marca ativa
- [x] Métricas de progresso

### 7 Pilares de Branding
1. **Start** ✅
   - Canvas digital (desafio, background, urgência)
   - Cenário competitivo
   - Players, tendências, públicos
   - Cenários futuros (C1-C4)
   - Incertezas

2. **Values** ✅
   - Valores da marca
   - Necessidades dos públicos
   - Cruzamento valores x necessidades
   - Insights com IA

3. **Purpose** ✅
   - Quadrantes Ikigai (habilidades, curiosidade, paixão, impacto)
   - Declaração de propósito (geração com IA)
   - Gráfico de impacto (curto, médio, longo prazo)

4. **Promise** ✅
   - Matriz de promessa (6 dimensões)
   - Malha de experiência
   - Parcerias estratégicas

5. **Positioning** ✅
   - Campos de declaração
   - Mapa de diferenciação
   - Análise de substitutos
   - Geração com IA

6. **Personality** ✅
   - Biblioteca de 8 arquétipos
   - Atributos desejados/indesejados
   - Narrativas de humanização (individual, grupal, societal)

7. **Universality** ✅
   - Checklist de acessibilidade
   - Checklist de inclusão
   - Planejamento de crises
   - Viabilidade universal

### Gestão
- [x] Intelligence Dashboard (métricas MOCK)
- [x] Planejamento & Execução (Kanban interno)
- [x] Scorecard & Decisões
- [x] Narrativas e História da Marca
- [x] Relatórios (página adicionada)
- [x] Configurações (página adicionada)
- [x] **Brand Valuation** (metodologia Interbrand) ✅ NOVO

### Brand Valuation (Avaliação de Marca)
- [x] Análise Financeira (Receita, Lucro Operacional, Margem, Custo de Capital)
- [x] Role of Brand Index (RBI) - slider 0-100%
- [x] Brand Strength Score (10 fatores Interbrand)
  - Clareza, Comprometimento, Governança, Responsividade
  - Autenticidade, Relevância, Diferenciação, Consistência
  - Presença, Engajamento
- [x] Cálculo automático do Valor da Marca
- [x] Categorias P/E (Overperformer/Underperformer Consistente/Inconsistente)
- [x] Geração de recomendações estratégicas com IA
- [x] Autosave de dados

### Interface
- [x] Sidebar colapsável
- [x] Header com seletor de marca
- [x] Progress bars por pilar
- [x] Autosave
- [x] Toasts de feedback
- [x] Design responsivo
- [x] Acessibilidade (skip links, ARIA)

---

## Funcionalidades MOCK (Aguardando Integração)

### Google Analytics
- Dados de share of search simulados
- Tráfego direto simulado
- Menções simuladas

### Google Search Console
- Dados de busca simulados

### Google Drive
- Importação de documentos não implementada

---

## Backlog de Funcionalidades (Futuras)

### P0 - Críticas
- [ ] Integração real com Google Analytics
- [ ] Integração real com Google Search Console
- [ ] Exportação de relatórios (PDF)

### P1 - Importantes
- [ ] Importação de documentos do Google Drive
- [ ] Gerador de briefings para designers/copywriters
- [ ] Integração com Monday/Trello (webhooks)
- [ ] Sistema de permissões granular (Estrategista x Cliente)

### P2 - Desejáveis
- [ ] Modo dark
- [ ] Múltiplos idiomas
- [ ] Histórico de versões (versionamento de pilares)
- [ ] Comentários e colaboração em tempo real
- [ ] Templates de marca pré-configurados

---

## Endpoints da API

### Autenticação
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `POST /api/auth/session` - OAuth callback
- `GET /api/auth/me` - Usuário atual
- `POST /api/auth/logout` - Logout

### Marcas
- `GET /api/brands` - Listar marcas
- `POST /api/brands` - Criar marca
- `GET /api/brands/{id}` - Detalhes da marca
- `PUT /api/brands/{id}` - Atualizar marca
- `GET /api/brands/{id}/metrics` - Métricas

### Pilares
- `GET/PUT /api/brands/{id}/pillars/{pillar_name}` - CRUD de pilares
  - Pilares: start, values, purpose, promise, positioning, personality, universality, **valuation**

### Tarefas
- `GET/POST /api/brands/{id}/tasks` - Listar/Criar
- `PUT/DELETE /api/brands/{id}/tasks/{task_id}` - Atualizar/Deletar

### Decisões
- `GET/POST /api/brands/{id}/decisions` - Listar/Criar
- `PUT /api/brands/{id}/decisions/{decision_id}` - Atualizar

### Narrativas
- `GET/POST /api/brands/{id}/narratives` - Listar/Criar
- `PUT /api/brands/{id}/narratives/{narrative_id}` - Atualizar

### IA
- `POST /api/ai/insights` - Gerar insights com GPT-5.2

---

## Credenciais de Teste

```
Email: demo@labrand.com
Senha: demo123
Role: estrategista
Marca de teste: Minha Marca Demo (brand_92bcc15a44fb)
```

---

## Próximos Passos

1. ~~Implementar Brand Valuation~~ ✅ Concluído
2. Implementar integração real com Google APIs (Analytics, Search Console, Drive)
3. Adicionar sistema de permissões cliente/estrategista
4. Criar exportação de relatórios em PDF
5. Módulo de Planejamento interno (sem Monday/Trello - por escolha do usuário)

---

## Changelog

### 2026-02-10
- ✅ Adicionada funcionalidade de **Brand Valuation** (Avaliação de Marca)
  - Página frontend com 4 tabs
  - Endpoints backend GET/PUT /api/brands/{id}/pillars/valuation
  - Integração com IA para recomendações estratégicas
  - Metodologia Interbrand completa implementada
- ✅ Corrigida navegação para incluir "Avaliação de Marca" no menu lateral
- ✅ Adicionada rota /valuation no App.js
- ✅ Testes completos passando (100% backend, 100% frontend)
