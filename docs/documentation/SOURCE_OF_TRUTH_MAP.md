# Mapa de fontes de verdade

Este mapa descreve a árvore existente na base `b0e7bae753ec93374a3ebe3ec2b1a5ac07298046` e distingue arquivos reais de destinos sugeridos para uma organização futura. Ele não cria autoridade nova nem altera os documentos referenciados.

## Precedência para interpretar o estado

1. Pedido mais recente do usuário para o escopo autorizado.
2. [AGENTS.md](../../AGENTS.md), que define a ordem e os limites globais.
3. [CONTINUAR.md](../../CONTINUAR.md) para o ponto geral de retomada, lido por seção/domínio e data.
4. Para Gika, o checkpoint mais recente em [.agent/GIKA_STATE.md](../../.agent/GIKA_STATE.md), conferido com [.agent/GIKA_TASKS.yaml](../../.agent/GIKA_TASKS.yaml) e a evidência de release [docs/release/M9_FINAL.md](../release/M9_FINAL.md).
5. A especificação e ADRs aplicáveis ao domínio.
6. Planos e evidências de etapas anteriores como registro histórico, sem sobrepor um checkpoint posterior.

Se duas fontes do mesmo nível parecerem conflitantes, prevalece a conclusão posterior e mais específica que tenha evidência identificada; registrar o conflito em vez de apagar o histórico.

Na base auditada, o estado de release Gika está em `M9_DONE_RC_READY`, com aprovação facial registrada. Glass e o RC/UAT consolidado aparecem como pendentes no checkpoint. Este mapa não declara a conclusão desses itens nem importa trabalho de outra branch. A Fase 7 do plano sazonal permanece não iniciada segundo AGENTS/CONTINUAR.

## Mapa da árvore atual

| Domínio | Fonte existente | Autoridade e uso |
|---|---|---|
| Arquitetura geral | [docs/gika/ARCHITECTURE.md](../gika/ARCHITECTURE.md), [docs/adr/001-fundacao.md](../adr/001-fundacao.md), [docs/adr/002-calendar-renderer.md](../adr/002-calendar-renderer.md) | ARCHITECTURE é mapa técnico Gika/Leve com ressalvas de atualização; ADR 002 é a decisão vigente de renderer de calendário. ADR 001 é histórico da fundação, não arquitetura presente. |
| Decisões | [docs/adr/](../adr/), [.agent/GIKA_DECISIONS.md](../../.agent/GIKA_DECISIONS.md), [docs/gika/ADR_020_BATCH_COMPOSITION.md](../gika/ADR_020_BATCH_COMPOSITION.md) | ADRs gerais e Gika registram decisões por escopo. `GIKA_DECISIONS.md` é log cumulativo; use decisões mais recentes e específicas. |
| Estado e tarefas | [.agent/GIKA_STATE.md](../../.agent/GIKA_STATE.md), [.agent/GIKA_TASKS.yaml](../../.agent/GIKA_TASKS.yaml), [.agent/GIKA_EXECPLAN.md](../../.agent/GIKA_EXECPLAN.md), [CONTINUAR.md](../../CONTINUAR.md) | `.agent` é a fonte operacional da Gika. CONTINUAR é o ponto de retomada geral e contém seções de épocas/domínios diferentes. |
| Release | [docs/release/M9_FINAL.md](../release/M9_FINAL.md), [docs/release/BRANCH_RECONCILIATION.md](../release/BRANCH_RECONCILIATION.md) | M9_FINAL é checkpoint/evidência da base e documenta pendências explícitas. BRANCH_RECONCILIATION relata apenas sua entrada e auditoria histórica. |
| Evidências | [docs/gika/](../gika/), [docs/security/](../security/), [docs/evidence/README.md](../evidence/README.md), [docs/runbooks/](../runbooks/) | Relatórios são específicos a tarefas, commits e gates; não usar total ou resultado passado como execução atual. |
| Segurança | [AGENTS.md](../../AGENTS.md), [docs/gika/SECURITY_AND_POLICY.md](../gika/SECURITY_AND_POLICY.md), [docs/security/](../security/), [docs/runbooks/validacao-local.md](../runbooks/validacao-local.md) | AGENTS define invariantes; SECURITY_AND_POLICY cobre Gika; docs/security contém auditorias/hardening datados. Não existe `SECURITY.md` na raiz desta base. |
| Histórico | [docs/EXECUCAO.md](../EXECUCAO.md), [docs/RETOMADA-2026-09-11-edicao-persistente.md](../RETOMADA-2026-09-11-edicao-persistente.md), [docs/REFINAMENTO-APLICABILIDADE.md](../REFINAMENTO-APLICABILIDADE.md), [docs/RESPONSIVE-SHELL-V2.md](../RESPONSIVE-SHELL-V2.md), checkpoints antigos em [docs/gika/](../gika/) | Preservar decisões, evidências, falhas e transições. São registros de épocas anteriores, não índice do estado atual. |
| Especialização Gika | [docs/gika/PRODUCT_SPEC.md](../gika/PRODUCT_SPEC.md), [docs/gika/ARCHITECTURE.md](../gika/ARCHITECTURE.md), [docs/gika/SECURITY_AND_POLICY.md](../gika/SECURITY_AND_POLICY.md), [docs/gika/EVALS.md](../gika/EVALS.md), [docs/gika/character/](../gika/character/), [docs/gika/rig-master/](../gika/rig-master/) | Especificação, arquitetura, policy, evals e arquivos de autoria. Decisões de escopo posteriores prevalecem sobre specs de rig anteriores. |
| Agentes e linguagem | [AGENTS.md](../../AGENTS.md), [docs/AGENT-SETUP.md](../AGENT-SETUP.md), [.agent/skills/humanizer-br/SKILL.md](../../.agent/skills/humanizer-br/SKILL.md), [.agent/PLANS.md](../../.agent/PLANS.md) | AGENTS rege o trabalho; setup e PLANS complementam. humanizer-br orienta textos de interface. |
| Entrada humana atual | [README.md](../../README.md), [CONTRIBUTING.md](../../CONTRIBUTING.md), [docs/README.md](../README.md) | README é apresentação/quick start; CONTRIBUTING é contribuição; docs/README é índice parcial da documentação. README principal contém assets e LICENSE ausentes nesta árvore. |

## Destinos propostos, ainda inexistentes

Os nomes abaixo são destinos de organização para etapas posteriores. Não existem como arquivos ou diretórios canônicos nesta base e nenhum link para eles deve ser apresentado como caminho funcional antes de sua criação.

| Destino proposto | Uso futuro sugerido | Situação nesta base |
|---|---|---|
| `docs/architecture/` | Índice e visão de arquitetura atual, com C4 Context/Containers e fluxos técnicos. | Diretório não existe. A arquitetura factual está hoje em `docs/gika/ARCHITECTURE.md`; decisões gerais estão nos ADRs. |
| `docs/archive/` | Preservar documentos classificados para arquivo após atualizar links e navegação. | Diretório não existe. Candidatos permanecem em seus caminhos atuais; nenhum foi movido. |
| `docs/adr/README.md` | Índice de ADRs gerais e convenção para novas decisões. | Diretório `docs/adr/` existe; o índice `README.md` não existe. |
| `SECURITY.md` na raiz | Política pública de divulgação responsável e segurança. | Arquivo não existe. Os documentos técnicos existentes estão em `docs/security/` e `docs/gika/SECURITY_AND_POLICY.md`; não há contato/SLAs definidos pelo inventário. |
| `docs/guides/` e `docs/runbooks/` expandidos | Guias por tarefa e procedimentos operacionais atuais. | `docs/runbooks/` existe com dois documentos; `docs/guides/` não existe. |

## Destinos existentes porém fora do índice central

- `docs/gika/`, `docs/release/` e `docs/security/` existem, mas [docs/README.md](../README.md) não os apresenta como áreas de navegação.
- `docs/adr/` existe e é indexado pelo `docs/README.md`, mas não tem índice próprio.
- `docs/evidence/` existe, com apenas um README explicativo; evidências concretas estão em `docs/gika/`, `docs/security/` e `docs/release/`.
- `docs/documentation/` contém este inventário e o mapa; a centralização como portal ainda depende de etapa posterior.

## Referência ausente já citada

`05-capacidade-e-revisao.md` não está presente no checkout. AGENTS, `docs/README.md`, `docs/EXECUCAO.md`, runbook gratuito e documentos Gika fazem referência a esse caminho. Os limiares operacionais citados em `docs/runbooks/prova-gratuita.md` não podem ser validados contra uma fonte versionada nesta base. O destino proposto é manter o tópico sob documentação operacional numa etapa futura, mas nome, localização e conteúdo permanecem indefinidos; este mapa não cria valores nem decide a política.
