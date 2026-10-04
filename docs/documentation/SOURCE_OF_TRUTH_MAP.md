# Mapa de fontes de verdade

Este mapa define onde consultar cada domínio e como resolver divergências. O [inventário](INVENTORY.md) é um snapshot D1 da árvore de base `b0e7bae753ec93374a3ebe3ec2b1a5ac07298046`; as reorganizações abaixo ocorreram depois daquele snapshot e não alteram sua contagem/classificação original.

## Precedência

1. Pedido mais recente do usuário para o escopo autorizado.
2. [AGENTS.md](../../AGENTS.md) para guardrails globais.
3. [CONTINUAR.md](../../CONTINUAR.md) para retomada geral, lido por domínio e seção.
4. Para Gika, [.agent/GIKA_STATE.md](../../.agent/GIKA_STATE.md), conferido com [.agent/GIKA_TASKS.yaml](../../.agent/GIKA_TASKS.yaml), [.agent/GIKA_EXECPLAN.md](../../.agent/GIKA_EXECPLAN.md) e a evidência [M9](../release/M9_FINAL.md).
5. Arquitetura canônica, ADR aplicável e código atual do dono da responsabilidade.
6. Planos, auditorias e evidências antigas como histórico identificado; não representam execução atual.

Se duas fontes do mesmo nível divergirem, use a mais recente e específica que tenha evidência identificável e registre o conflito sem apagar o histórico.

A base documenta `M9_DONE_RC_READY / GIKA_V1_FACIAL_APPROVED`; Glass e o RC/UAT consolidado permanecem pendentes no checkpoint. A Fase 7 sazonal consta como não iniciada. Este mapa não importa conclusão ou trabalho de outra branch.

## Fonte canônica por assunto

| Assunto | Fonte canônica | Precedência e limites |
|---|---|---|
| Arquitetura geral | [docs/architecture/](../architecture/README.md) | Contexto, containers, fluxos e domínios técnicos gerais. Conferir código se comportamento mudou. |
| Decisões gerais | [docs/adr/](../adr/README.md) | Índice de ADRs gerais; preserve decisões substituídas. |
| Estado operacional Gika | [.agent/](../../.agent/GIKA_STATE.md) | Estado, tarefas, plano e log de decisões da Gika; checkpoint operacional mais recente prevalece sobre evidências anteriores. |
| Release | [docs/release/](../release/README.md) | Registros de execução e reconciliação por escopo. M9 não prova deploy nem conclui pendências declaradas. |
| Evidências | [docs/evidence/](../evidence/README.md), [docs/gika/](../gika/), [docs/security/](../security/README.md) | Artefatos e relatórios identificados; existência não equivale a aprovação atual. |
| Segurança | [SECURITY.md](../../SECURITY.md), [docs/security/](../security/README.md), [autorização na arquitetura](../architecture/authentication-authorization.md) | SECURITY.md é política de relato; auditorias em docs/security são datadas; arquitetura descreve o código auditado. Política Gika em [docs/gika/SECURITY_AND_POLICY.md](../gika/SECURITY_AND_POLICY.md). |
| Histórico | [docs/archive/](../archive/README.md), [CONTINUAR](../../CONTINUAR.md), registros por milestone | Arquivo preserva contexto; não funciona como status atual. Três documentos gerais movidos em D4 têm stubs nos caminhos anteriores para compatibilidade. |
| Gika especializada | [docs/gika/](../gika/ARCHITECTURE.md) | Especificação, evidências, rig e política específicas. A visão compartilhada permanece em docs/architecture. |
| Contribuição e documentação | [CONTRIBUTING](../../CONTRIBUTING.md), [portal](../README.md), [STYLE_GUIDE](../STYLE_GUIDE.md) | Orientação humana e navegação; AGENTS mantém guardrails de agentes. |

## Destinos e lacunas

Os diretórios canônicos `architecture/`, `adr/`, `archive/legacy/`, `evidence/`, `getting-started/`, `guides/`, `operations/`, `reference/`, `release/` e `security/` estão presentes e indexados pelo [portal](../README.md). `docs/runbooks/` continua como caminho histórico dos dois runbooks existentes; `docs/operations/README.md` é seu índice operacional.

Não há um threat model independente nem runbooks autônomos de incidente ou rollback nesta árvore. Os índices apontam às políticas e procedimentos disponíveis sem preencher essas lacunas por inferência. O arquivo `05-capacidade-e-revisao.md` segue ausente nesta base; os limiares de `prova-gratuita.md` não podem ser verificados contra uma fonte versionada disponível.

## Evidências visuais da base

O README usa [desktop](../screenshots/desktop.png), [mobile 1](../screenshots/mobile-1.png), [mobile 2](../screenshots/mobile-2.png) e [mobile 3](../screenshots/mobile-3.png). `docs/evidence/` contém as cinco imagens listadas em seu [índice](../evidence/README.md). Os registros e capturas Gika ficam em [docs/gika/](../gika/); evidências de auditorias em [docs/security/](../security/). Artefatos não indicam aprovação além do escopo do registro associado.
