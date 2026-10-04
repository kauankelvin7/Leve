# Arquitetura do Leve

Esta pasta é a referência geral da arquitetura implementada no repositório. Descreve os principais componentes, fronteiras de confiança, dados e fluxos. O código continua sendo a referência factual; ao mudar um contrato, atualize a página correspondente.

## Visão geral

| Tema | Documento |
|---|---|
| Contexto e sistemas externos | [Contexto](system-context.md) |
| Componentes de execução | [Containers](containers.md) |
| Fluxos entre browser, API e serviços | [Fluxos de runtime](runtime-flows.md) |
| Escritas, revisão e idempotência | [Modelo de comandos](command-model.md) |
| Identidade e autorização | [Autenticação e autorização](authentication-authorization.md) |
| Coleções e propriedade dos dados | [Persistência](data-persistence.md) |
| Cache, outbox e PWA offline | [Offline e sincronização](offline-sync.md) |
| Integração da assistente | [Gika](gika.md) |
| Desenvolvimento local e deploy config | [Runtime e deploy](deployment-runtime.md) |

## Escopo e precedência

Esta visão geral cobre o Leve como sistema. [docs/gika/ARCHITECTURE.md](../gika/ARCHITECTURE.md) é a especialização da Gika: políticas, resolução de pedidos, integração com o modelo e confirmação. Se a arquitetura compartilhada e a especialização parecerem divergir, use esta pasta para as fronteiras gerais e a documentação Gika para seus contratos; confira o código-fonte indicado antes de concluir que o comportamento atual mudou. A especialização preserva snapshots datados de milestones anteriores, que não substituem esta visão geral.

ADRs registram escolhas e motivos, não todos os detalhes de implementação: [ADRs gerais](../adr/) e [decisões Gika](../../.agent/GIKA_DECISIONS.md). A [política de segurança](../../SECURITY.md) descreve relato responsável; as [regras de acesso](../../firestore.rules) e o servidor mostram as verificações efetivas.
