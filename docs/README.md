# Documentação do Leve

Este portal reúne caminhos por necessidade. O [README principal](../README.md) apresenta o produto e seu início rápido; [CONTRIBUTING](../CONTRIBUTING.md) orienta contribuições humanas; [AGENTS](../AGENTS.md) registra guardrails para agentes.

## Começar

- [Instalar e executar localmente](getting-started/README.md)
- [Ambiente de desenvolvimento](guides/local-development.md)
- [Contribuir](../CONTRIBUTING.md)

## Arquitetura

- [Arquitetura geral — fonte canônica](architecture/README.md)
- [Contexto e containers](architecture/system-context.md) e [responsabilidades](architecture/containers.md)
- [Fluxos de runtime](architecture/runtime-flows.md)
- [Autorização](architecture/authentication-authorization.md), [comandos](architecture/command-model.md), [persistência](architecture/data-persistence.md) e [offline](architecture/offline-sync.md)
- [Runtime de deploy](architecture/deployment-runtime.md)
- [Especialização Gika](architecture/gika.md) e [detalhe Gika](gika/ARCHITECTURE.md)

## Guias

- [Índice de guias](guides/README.md)
- [Executar testes e verificações](guides/running-tests.md)
- [Adicionar comando](guides/adding-a-command.md)
- [Alterar regras Firestore](guides/changing-firestore-rules.md)
- [Trabalhar na Gika](guides/working-with-gika.md)
- [Investigar offline](guides/debugging-offline.md)

## Referência

- [Índice de referência](reference/README.md)
- [Ambiente](reference/environment.md)
- [Variáveis e configuração](reference/configuration.md)
- [Scripts npm](reference/scripts.md)
- [Estrutura do repositório](reference/repository-structure.md)
- [Estilo documental](STYLE_GUIDE.md)
- [Setup de agentes](AGENT-SETUP.md)
- [Plano de experiência de calendário](PLANO-EXPERIENCIA-CALENDARIO-NOTAS-SAZONAL.md)
- [Direção de arte sazonal](SEASONAL-ART-DIRECTION.md)
- [Registro Responsive Shell V2](RESPONSIVE-SHELL-V2.md)

## Operação

- [Índice de operação e runbooks disponíveis](operations/README.md)
- [Validação local](runbooks/validacao-local.md)
- [Prova documental de infraestrutura gratuita](runbooks/prova-gratuita.md)
- [Release](release/README.md)

## Segurança

- [Política e relato responsável](../SECURITY.md)
- [Fontes e auditorias](security/README.md)
- [Política específica da Gika](gika/SECURITY_AND_POLICY.md)

## Decisões

- [Índice de ADRs](adr/README.md)
- [Log cumulativo de decisões Gika](../.agent/GIKA_DECISIONS.md)
- [Mapa de fontes e precedência](documentation/SOURCE_OF_TRUTH_MAP.md)
- [Revisões D1/D3 e validação documental](documentation/VALIDATION.md)

## Gika

- [Especificação](gika/PRODUCT_SPEC.md), [arquitetura](gika/ARCHITECTURE.md), [segurança e política](gika/SECURITY_AND_POLICY.md), [evals](gika/EVALS.md)
- [Estado](../.agent/GIKA_STATE.md), [tarefas](../.agent/GIKA_TASKS.yaml), [plano](../.agent/GIKA_EXECPLAN.md)
- [Artefatos por milestone](gika/) e [guia de trabalho](guides/working-with-gika.md)

## Evidências de release e auditoria

- [Checkpoint M9](release/M9_FINAL.md) e [reconciliação](release/BRANCH_RECONCILIATION.md)
- [Índice de artefatos](evidence/README.md)
- [Auditorias de segurança](security/README.md)

## Arquivo

- [Índice de histórico](archive/README.md)
- [Registros gerais arquivados](archive/legacy/README.md)
- [Retomada operacional](../CONTINUAR.md)
