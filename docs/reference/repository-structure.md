# Estrutura do repositório

| Caminho | Responsabilidade |
|---|---|
| `apps/web/` | Aplicação React/Vite e recursos públicos web |
| `packages/domain/` | Tipos e schemas compartilhados do domínio |
| `server/` | API Express, autenticação, comandos e lógica de servidor |
| `workers/scheduler/` | Worker de agendamento |
| `api/` | Entrada de API usada no runtime de deploy |
| `tests/` | Testes unitários, integração e jornadas locais |
| `scripts/` | Desenvolvimento, seed, migrações e verificações |
| `firestore.rules`, `firestore.indexes.json` | Regras e índices Firestore versionados |
| `docs/architecture/` | Arquitetura geral canônica |
| `docs/gika/` | Especificação, arquitetura e evidências da especialização Gika |
| `.agent/` | Estado, tarefas, planos e decisões operacionais da Gika |

Esta tabela é um mapa inicial, não um inventário completo. Confira o diretório e seu README antes de adicionar outro ponto de entrada.
