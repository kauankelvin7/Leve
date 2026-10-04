# Execution Plans

Para features complexas, refactors significativos ou tarefas que atravessem múltiplos módulos, use um ExecPlan persistido.

Um ExecPlan deve permitir que outro agente, sem contexto anterior, retome o trabalho apenas com o repositório.

## Seções obrigatórias

### Objetivo
O comportamento observável que será entregue.

### Contexto atual
Arquivos relevantes, arquitetura existente e restrições descobertas.

### Não objetivos
O que não será implementado nesta etapa.

### Contratos
Interfaces, schemas, eventos, comandos e invariantes afetados.

### Passos
Tarefas pequenas, ordenadas e verificáveis.

### Ownership
Quais arquivos ou diretórios cada executor pode alterar.

### Gates
Comandos e verificações obrigatórias antes de avançar.

### Rollback
Como reverter a mudança sem destruir trabalho não relacionado.

### Evidências
Resultados de testes, builds, screenshots, logs ou diffs pertinentes.

### Estado de retomada
Último commit verificado, próxima ação e bloqueios.

## Regra de execução

Planos são documentos vivos. Atualize-os quando fatos do repositório invalidarem uma suposição.

Nunca continue implementando com base em uma suposição comprovadamente falsa apenas para “seguir o plano”.
