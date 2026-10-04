# Inventário da documentação

Inventário da árvore na base `b0e7bae753ec93374a3ebe3ec2b1a5ac07298046` (`docs/technical-documentation-v2`). Há 86 arquivos Markdown versionados; este registro não move, renomeia nem reescreve documentos existentes.

## Como ler as classificações

- **ACTIVE**: ponto de entrada ou registro usado para orientar trabalho no estado desta base.
- **REFERENCE**: contrato, explicação técnica ou consulta válida em seu escopo; não substitui o estado operacional.
- **EVIDENCE**: prova ou relatório de uma execução identificada. A evidência vale para aquela execução, não como status atual automático.
- **HISTORICAL**: registro válido do contexto e resultado de uma etapa anterior.
- **DUPLICATE**: conteúdo de entrada ou navegação sobreposto a outra fonte mais recente.
- **ARCHIVE_CANDIDATE**: pode ser movido para arquivo numa etapa futura, após checagem e atualização de links; permanece onde está nesta etapa.

As categorias são por arquivo. Um arquivo pode receber duas classificações quando, por exemplo, serve como evidência histórica e também contém referência ainda útil. Caminhos entre colchetes são relativos a este documento e apontam para arquivos versionados existentes; referências quebradas são identificadas separadamente.

## Inventário individual

### Raiz e estado de agentes

| Documento | Classe | Papel e observação de estado |
|---|---|---|
| [AGENTS.md](../../AGENTS.md) | ACTIVE | Regras gerais, ordem das fontes, limites de segurança, custo, UX e validação. Cita `05-capacidade-e-revisao.md`, ausente nesta base. |
| [CONTINUAR.md](../../CONTINUAR.md) | ACTIVE / HISTORICAL | Índice de retomada com checkpoint sazonal e sucessivos registros Gika. O topo fala em branch `main`/SHA sazonal; seções posteriores são a trilha Gika. Não tratar todos os checkpoints da linha do tempo como estado simultâneo. |
| [README.md](../../README.md) | ACTIVE / REFERENCE | Apresentação e instruções para pessoas. Descreve produto/release e contém links para `LICENSE` e quatro screenshots ausentes. |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | ACTIVE | Contribuição e comandos de verificação; material dirigido a contribuidores. |
| [DESIGN.md](../../DESIGN.md) | REFERENCE / HISTORICAL | Direção e referências visuais; inclui revisão datada de 15/09/2026. Consultar junto aos tokens e à implementação para não inferir que toda observação datada é estado atual. |
| [GIKA_START_HERE.md](../../GIKA_START_HERE.md) | DUPLICATE / ARCHIVE_CANDIDATE | Pacote de bootstrap da Gika. Repete a instrução de ler AGENTS e os arquivos `.agent`; fala em copiar conteúdo e começar M0, já concluído na base. Preservar até eventual arquivamento e ajuste de referências. |
| [.agent/GIKA_STATE.md](../../.agent/GIKA_STATE.md) | ACTIVE / EVIDENCE | Estado operacional detalhado da Gika, com checkpoint M9 `M9_DONE_RC_READY`, aprovação facial e pendências de finalização Glass/RC/UAT na base. Preserva checkpoints anteriores, inclusive estados antigos contraditórios. |
| [.agent/GIKA_TASKS.yaml](../../.agent/GIKA_TASKS.yaml) | ACTIVE | Grafo de tarefas e marcos da Gika; fonte estruturada de status, dependências e evidências. Interpretar junto do checkpoint atual de `GIKA_STATE.md`. |
| [.agent/GIKA_EXECPLAN.md](../../.agent/GIKA_EXECPLAN.md) | ACTIVE / REFERENCE | Plano Gika e sequência de finalização autorizada registrada nessa base; preservar os gates e limites escritos, sem inferir que os passos pendentes foram concluídos. |
| [.agent/GIKA_DECISIONS.md](../../.agent/GIKA_DECISIONS.md) | REFERENCE / HISTORICAL | Registro cumulativo de decisões arquiteturais Gika. Decisões posteriores/substitutivas devem prevalecer sobre as anteriores conforme o próprio histórico. |
| [.agent/PLANS.md](../../.agent/PLANS.md) | REFERENCE | Modelo de ExecPlan para tarefas complexas; guia de processo, não estado de milestone. |
| [.agent/skills/humanizer-br/SKILL.md](../../.agent/skills/humanizer-br/SKILL.md) | REFERENCE | Guia local de linguagem da interface em português; aplicar a textos de produto, não como fonte de arquitetura ou status. |

### Documentação geral

| Documento | Classe | Papel e observação de estado |
|---|---|---|
| [docs/README.md](../README.md) | ACTIVE / REFERENCE | Índice atual da documentação geral, porém estreito: não indexa áreas Gika, release e segurança. Afirma que o documento de capacidade existe na raiz; o caminho não existe nesta base. |
| [docs/AGENT-SETUP.md](../AGENT-SETUP.md) | REFERENCE | Setup de agentes/plugins e privacidade. Orientação geral de marketplace; não é prova de plugin instalado neste ambiente. |
| [docs/PLANO-EXPERIENCIA-CALENDARIO-NOTAS-SAZONAL.md](../PLANO-EXPERIENCIA-CALENDARIO-NOTAS-SAZONAL.md) | REFERENCE / HISTORICAL | Plano técnico de experiência Leve; AGENTS e CONTINUAR dizem que a Fase 7 de auditoria final não foi iniciada. Não usar o plano como autorização automática para iniciá-la. |
| [docs/EXECUCAO.md](../EXECUCAO.md) | HISTORICAL / ARCHIVE_CANDIDATE | Registro da fundação E00/E01, conforme ressalva explícita de AGENTS. Não é status atual. |
| [docs/REFINAMENTO-APLICABILIDADE.md](../REFINAMENTO-APLICABILIDADE.md) | HISTORICAL / REFERENCE | Registro de aplicabilidade/refinamento de produção. Conferir data e contexto antes de reutilizar recomendações como instrução atual. |
| [docs/RESPONSIVE-SHELL-V2.md](../RESPONSIVE-SHELL-V2.md) | EVIDENCE / HISTORICAL | Integração seletiva do shell; a reconciliação de release informa que o port necessário já estava absorvido. Preservar como evidência da decisão, não como plano de port pendente. |
| [docs/RETOMADA-2026-09-11-edicao-persistente.md](../RETOMADA-2026-09-11-edicao-persistente.md) | HISTORICAL / ARCHIVE_CANDIDATE | Retomada datada de edição persistente e lixeira. Sobreposta por CONTINUAR e estado técnico atual. |
| [docs/SEASONAL-ART-DIRECTION.md](../SEASONAL-ART-DIRECTION.md) | REFERENCE / EVIDENCE | Direção e decisões da experiência sazonal que AGENTS identifica como integrada e validada. Seu escopo é sazonal, não identidade geral do produto. |
| [docs/adr/001-fundacao.md](../adr/001-fundacao.md) | HISTORICAL / EVIDENCE | Decisões da fundação E00/E01; contém premissas iniciais explícitas como `/demo` e arquitetura proposta daquela fase, algumas superadas pela aplicação persistente atual. |
| [docs/adr/002-calendar-renderer.md](../adr/002-calendar-renderer.md) | REFERENCE / EVIDENCE | Decisão aceita do renderer de calendário e limites de isolamento; manter como ADR vigente para esse tema. |
| [docs/evidence/README.md](../evidence/README.md) | REFERENCE / HISTORICAL | Explica que screenshots históricos foram removidos e aponta testes/relatórios como prova. Contrasta com imagens ainda referenciadas no README principal, que não estão na árvore. |

### Gika: especificação, arquitetura, decisões e evidências

| Documento | Classe | Papel e observação de estado |
|---|---|---|
| [docs/gika/ARCHITECTURE.md](../gika/ARCHITECTURE.md) | REFERENCE / EVIDENCE | Mapa arquitetural factual Gika/Leve. Seu início contém referências de status/SHA anteriores ao checkpoint atual e caminhos históricos de screenshots; usar fatos por domínio e conferir mudanças contra o código/estado atual. |
| [docs/gika/PRODUCT_SPEC.md](../gika/PRODUCT_SPEC.md) | REFERENCE | Especificação de produto Gika; consultar junto às decisões posteriores e ao status da implementação. |
| [docs/gika/SECURITY_AND_POLICY.md](../gika/SECURITY_AND_POLICY.md) | REFERENCE / EVIDENCE | Política/ameaças Gika. Mantém limites explícitos e registra que o documento de capacidade citado não existe; não inferir os limiares ausentes. |
| [docs/gika/EVALS.md](../gika/EVALS.md) | REFERENCE / EVIDENCE | Catálogo cumulativo de cenários e critérios; resultados executados pertencem aos relatórios de evidência correspondentes. |
| [docs/gika/ADR_020_BATCH_COMPOSITION.md](../gika/ADR_020_BATCH_COMPOSITION.md) | REFERENCE | Decisão Gika de composição em lote, limites e semântica parcial. |
| [docs/gika/M0_EVIDENCE.md](../gika/M0_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de auditoria inicial M0; escopo M0 está concluído na base. |
| [docs/gika/M1_EVIDENCE.md](../gika/M1_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência do shell/mock M1 e refinamentos; não é status operacional atual. |
| [docs/gika/M2_PREFLIGHT.md](../gika/M2_PREFLIGHT.md) | EVIDENCE / HISTORICAL | Preflight de M2, etapa anterior à integração concluída. |
| [docs/gika/M2_EVIDENCE.md](../gika/M2_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de leituras/model adapter M2; contém estados antigos de dependências e bloqueios. |
| [docs/gika/M3_T1_EXECPLAN.md](../gika/M3_T1_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado para criação simples M3-T1. |
| [docs/gika/M3_T1_EVIDENCE.md](../gika/M3_T1_EVIDENCE.md) | EVIDENCE / HISTORICAL | Provas de M3-T1; checkpoints de “parar antes de T2” são históricos. |
| [docs/gika/M3_T2_EXECPLAN.md](../gika/M3_T2_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado para idempotência M3-T2. |
| [docs/gika/M3_T2_EVIDENCE.md](../gika/M3_T2_EVIDENCE.md) | EVIDENCE / HISTORICAL | Provas e limites de M3-T2. |
| [docs/gika/M3_T3_EXECPLAN.md](../gika/M3_T3_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado para undo M3-T3. |
| [docs/gika/M3_T3_EVIDENCE.md](../gika/M3_T3_EVIDENCE.md) | EVIDENCE / HISTORICAL | Provas de M3-T3; estados “M3 parcial” pertencem ao checkpoint datado. |
| [docs/gika/M3_SMOKE_EXECPLAN.md](../gika/M3_SMOKE_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano de smoke M3 concluído. |
| [docs/gika/M3_SMOKE_EVIDENCE.md](../gika/M3_SMOKE_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de smoke M3 e suas limitações de cobertura. |
| [docs/gika/M4_T1_EXECPLAN.md](../gika/M4_T1_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado para conclusão simples M4-T1. |
| [docs/gika/M4_T1_EVIDENCE.md](../gika/M4_T1_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de M4-T1. |
| [docs/gika/M4_T2_EXECPLAN.md](../gika/M4_T2_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado para atualização de título M4-T2. |
| [docs/gika/M4_T2_EVIDENCE.md](../gika/M4_T2_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de M4-T2; checkpoint anterior a M4-T3 é histórico. |
| [docs/gika/M4_T3_EXECPLAN.md](../gika/M4_T3_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado para reagendamento M4-T3. |
| [docs/gika/M4_T3_EVIDENCE.md](../gika/M4_T3_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de M4-T3 e limites do smoke. |
| [docs/gika/M4_SMOKE_EXECPLAN.md](../gika/M4_SMOKE_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano do smoke M4, posteriormente concluído. |
| [docs/gika/M4_SMOKE_EVIDENCE.md](../gika/M4_SMOKE_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência do smoke e resultado de M4. |
| [docs/gika/M5_T1_EXECPLAN.md](../gika/M5_T1_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado de policy M5-T1. |
| [docs/gika/M5_T1_EVIDENCE.md](../gika/M5_T1_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de policy determinística M5-T1. |
| [docs/gika/M5_T2_EXECPLAN.md](../gika/M5_T2_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado de confirmação/preview M5-T2. |
| [docs/gika/M5_T2_EVIDENCE.md](../gika/M5_T2_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de confirmação/preview M5-T2. |
| [docs/gika/M5_T3_EXECPLAN.md](../gika/M5_T3_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado de escopo recorrente M5-T3. |
| [docs/gika/M5_T3_EVIDENCE.md](../gika/M5_T3_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de recorrência M5-T3. |
| [docs/gika/M5_T4_EXECPLAN.md](../gika/M5_T4_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano executado para lotes M5-T4. |
| [docs/gika/M5_T4_EVIDENCE.md](../gika/M5_T4_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de lotes, recuperação e semântica parcial. |
| [docs/gika/M5_CLOSURE_EVIDENCE.md](../gika/M5_CLOSURE_EVIDENCE.md) | EVIDENCE / HISTORICAL | Primeiro gate de fechamento M5, bloqueado por achados daquele checkpoint. Não prevalece sobre fechamento posterior. |
| [docs/gika/M5_CLOSURE_R1_SECURITY_EVIDENCE.md](../gika/M5_CLOSURE_R1_SECURITY_EVIDENCE.md) | EVIDENCE / HISTORICAL | Resolução R1 do gate M5; registra limites e falhas da rodada sem apagá-los. |
| [docs/gika/M5_CLOSURE_R2_EVIDENCE.md](../gika/M5_CLOSURE_R2_EVIDENCE.md) | EVIDENCE / HISTORICAL | Rechecagem R2 e resultados próprios daquela rodada. |
| [docs/gika/M5_CLOSURE_FINAL_EVIDENCE.md](../gika/M5_CLOSURE_FINAL_EVIDENCE.md) | EVIDENCE / HISTORICAL | Fechamento final M5 `M5_READY_FOR_NEXT_PHASE`; precedência temporal sobre os gates anteriores, não sobre M9 atual. |
| [docs/gika/M6_EVIDENCE.md](../gika/M6_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de organização M6 concluído. |
| [docs/gika/M7_EVIDENCE.md](../gika/M7_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de voz M7 e limites de aparelho/serviço. |
| [docs/gika/M8_EVIDENCE.md](../gika/M8_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de proatividade M8 concluído; pendências M9 dentro desse arquivo são checkpoint histórico. |
| [docs/gika/M9_EVIDENCE.md](../gika/M9_EVIDENCE.md) | EVIDENCE / HISTORICAL | Trilha longa e cumulativa M9 (104 KB), com estados antigos bloqueados e fechamento posterior. Usar o encerramento datado e [M9_FINAL](../release/M9_FINAL.md) para o resultado da base; não ler trechos antigos como status simultâneo. |

### Gika: personagem e autoria

| Documento | Classe | Papel e observação de estado |
|---|---|---|
| [docs/gika/character/GIKA_V1_FACIAL_SCOPE.md](../gika/character/GIKA_V1_FACIAL_SCOPE.md) | REFERENCE / EVIDENCE | Decisão de escopo facial v1 aprovada e adiamento de rig corporal; contexto da aprovação está refletido no checkpoint M9. |
| [docs/gika/character/GIKA_VISUAL_LOCK.md](../gika/character/GIKA_VISUAL_LOCK.md) | REFERENCE / EVIDENCE | Autoridade visual e histórico. Trechos intermediários dizem que a aprovação/release está pendente; conferir conclusão posterior de M9 antes de interpretar esses trechos. |
| [docs/gika/character/EXPRESSION_INVENTORY.md](../gika/character/EXPRESSION_INVENTORY.md) | EVIDENCE / HISTORICAL | Inventário usado na autoria e comparação de expressões, não estado operacional do runtime. |
| [docs/gika/rig-master/README.md](../gika/rig-master/README.md) | HISTORICAL | Índice do gate de master anterior à decisão de escopo facial v1. |
| [docs/gika/rig-master/GATE_A_VALIDATION.md](../gika/rig-master/GATE_A_VALIDATION.md) | EVIDENCE / HISTORICAL | Validação/reprovação histórica do Gate A; decisão facial v1 posterior registra que esse bloqueio não impede o escopo v1. |
| [docs/gika/rig-master/RIG_ACCEPTANCE_AND_SPIKE.md](../gika/rig-master/RIG_ACCEPTANCE_AND_SPIKE.md) | REFERENCE / HISTORICAL | Critérios e spike de rig prévios; consultar apenas para contexto histórico, respeitando a decisão posterior de escopo. |
| [docs/gika/rig-master/RIG_READY_MASTER_SPEC.md](../gika/rig-master/RIG_READY_MASTER_SPEC.md) | HISTORICAL | Especificação anterior de master rig-ready; corpo/novo master não são requisito da v1 conforme decisão posterior. |
| [docs/gika/rig-master/MOTION_AND_STATE_MAP.md](../gika/rig-master/MOTION_AND_STATE_MAP.md) | REFERENCE / EVIDENCE | Mapa de estados e movimento da Gika; validar implementação final em arquitetura/evidência M9. |
| [docs/gika/rig-master/TECH_DECISION.md](../gika/rig-master/TECH_DECISION.md) | REFERENCE / HISTORICAL | Avaliação técnica de animação anterior ao rig/presença final; manter como fundamentação, não como estado da release. |

### Release, operação e segurança

| Documento | Classe | Papel e observação de estado |
|---|---|---|
| [docs/release/M9_FINAL.md](../release/M9_FINAL.md) | ACTIVE / EVIDENCE | Checkpoint de release factual da base: `M9_DONE_RC_READY`, aprovação facial e gates/lacunas documentados. Registra Glass e RC/UAT consolidado como passos pendentes nesta base. |
| [docs/release/BRANCH_RECONCILIATION.md](../release/BRANCH_RECONCILIATION.md) | EVIDENCE / HISTORICAL | Reconciliação de branches daquele checkpoint; conclusão diz que port/merge necessário não ocorreu. Não é mapa atual de branches fora da base. |
| [docs/runbooks/validacao-local.md](../runbooks/validacao-local.md) | REFERENCE / EVIDENCE | Gates locais e itens externos/aparelho ainda necessários no contexto do documento; rever a data antes de usar como checklist atual. |
| [docs/runbooks/prova-gratuita.md](../runbooks/prova-gratuita.md) | REFERENCE / EVIDENCE | Plano documental de cotas/prova gratuita não executada; cita caminho de capacidade inexistente, logo os limiares citados não têm fonte versionada neste checkout. |
| [docs/security/SECURITY-AUDIT.md](../security/SECURITY-AUDIT.md) | EVIDENCE / HISTORICAL | Auditoria de segurança datada; escopo e findings pertencem àquela revisão, não equivalem a uma certificação atual. |
| [docs/security/INVENTORY.md](../security/INVENTORY.md) | EVIDENCE / REFERENCE | Inventário de dependências de produção do hardening correspondente; evidência datada e útil para rastreio. |
| [docs/security/HARDENING_EXECPLAN.md](../security/HARDENING_EXECPLAN.md) | EVIDENCE / HISTORICAL | Plano de hardening executado em branch temporária; contém instrução de parar antes da integração daquela etapa. |
| [docs/security/REPORT.md](../security/REPORT.md) | EVIDENCE / HISTORICAL | Relatório de branch/chore de hardening e advisories daquele momento; não é status atual de segurança. |
| [docs/security/GOOGLE_EVIDENCE.md](../security/GOOGLE_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência de alterações Google/Firebase e limites da auditoria específica. |
| [docs/security/DICEBEAR_EVIDENCE.md](../security/DICEBEAR_EVIDENCE.md) | EVIDENCE / HISTORICAL | Evidência do patch DiceBear específico. |
| [docs/security/DEVELOPMENT_REMAINING.md](../security/DEVELOPMENT_REMAINING.md) | EVIDENCE / REFERENCE | Vulnerabilidades remanescentes em tooling de desenvolvimento no escopo auditado; reavaliar contra dependências atuais antes de decisão. |

### Material de autoria e testes de recursos Gika

| Documento | Classe | Papel e observação de estado |
|---|---|---|
| [assets/gika/rive/essential-bust/README.md](../../assets/gika/rive/essential-bust/README.md) | REFERENCE / EVIDENCE | Notas do ensaio de busto essencial; asset de autoria/QA, não política geral. |
| [assets/gika/rive/hybrid-bust-spike/README.md](../../assets/gika/rive/hybrid-bust-spike/README.md) | REFERENCE / EVIDENCE | Notas do spike de busto híbrido. |
| [assets/gika/rive/hybrid-bust-v2/README.md](../../assets/gika/rive/hybrid-bust-v2/README.md) | REFERENCE / EVIDENCE | Notas de autoria da v2 fora do runtime de produto; não confundir com documentação de uso da aplicação. |

## Conflitos, obsolescência e órfãos identificados

- **Precedência temporal da Gika:** `.agent/GIKA_STATE.md`, `.agent/GIKA_TASKS.yaml` e `docs/release/M9_FINAL.md` registram M9 como `M9_DONE_RC_READY` e aprovação facial. Os checkpoints iniciais/intermediários em `docs/gika/M9_EVIDENCE.md`, `GIKA_VISUAL_LOCK.md`, `CONTINUAR.md` e arquivos de rig descrevem bloqueios reais de etapas anteriores; são históricos, não um segundo estado atual. A base também registra Glass e RC/UAT consolidado como pendentes. Nenhuma etapa posterior é inferida aqui.
- **Estado geral vs. Gika:** `CONTINUAR.md` começa com estado sazonal/calendário e branch `main`, e acrescenta depois o checkpoint Gika. AGENTS já alerta que a Fase 7 sazonal não foi iniciada. Usar o trecho correspondente ao domínio e seguir a precedência em AGENTS; não escolher a primeira seção por posição.
- **Capacidade:** `AGENTS.md`, `docs/README.md`, `docs/EXECUCAO.md`, `docs/runbooks/prova-gratuita.md`, `docs/gika/ARCHITECTURE.md` e `docs/gika/SECURITY_AND_POLICY.md` citam `05-capacidade-e-revisao.md`, ausente da base. O runbook cita thresholds 50/70/85/95%, mas não há definição versionada disponível para verificá-los. Não reconstruir esses valores por inferência.
- **README incompleto:** `README.md` referencia `LICENSE` e `docs/screenshots/desktop.png`, `mobile-1.png`, `mobile-2.png`, `mobile-3.png`; nenhum dos cinco destinos existe nesta árvore. `docs/evidence/README.md` explica que capturas históricas foram removidas. A licença MIT é alegada no README, mas o arquivo de licença não está disponível para revisão nesta base.
- **Índice parcial:** `docs/README.md` não lista `docs/gika`, `docs/release` nem `docs/security`; leitores precisam conhecer os caminhos ou seguir os links de `GIKA_START_HERE.md`/AGENTS.
- **Conteúdo órfão ou com descoberta fraca:** os relatórios sob `docs/gika`, `docs/security`, `docs/release` e os três READMEs sob `assets/gika/rive` não são indexados no `docs/README.md`. Eles não estão sem referência dentro do repositório, mas ficam fora da navegação central. A maioria dos documentos técnicos não tem links de retorno ou front matter com data/estado, então descoberta depende do nome do arquivo.
- **Bootstrap duplicado:** `GIKA_START_HERE.md` instrui copiar pacote e iniciar M0, embora M0 esteja concluído e estado completo esteja versionado em `.agent/`. É candidato a arquivamento depois de definir se ainda há público que usa o pacote externo.
- **Pontos históricos explicitamente não atuais:** `docs/EXECUCAO.md` documenta E00/E01; `docs/adr/001-fundacao.md` documenta demo e decisões iniciais; `docs/RESPONSIVE-SHELL-V2.md` registra um port posteriormente reconciliado. São preservados como histórico/evidência e não como orientação de arquitetura atual.
- **Auditorias datadas:** `docs/security/SECURITY-AUDIT.md`, relatórios de hardening e runbooks têm datas/branch/escopo próprios. Advisory count e gates ali relatados não descrevem automaticamente o estado de segurança desta base.
- **Referências incorporadas em texto:** foram verificadas ligações Markdown locais e referências explícitas relevantes. Menções a paths dentro de blocos de código/logs, links externos e âncoras não foram tratadas como destinos de arquivo local nesta checagem.

## Limite desta etapa

Foi feita leitura da documentação versionada, conferência read-only de HEAD/status e varredura de links locais em Markdown/HTML. Não foram executados testes, build, fluxos externos ou auditoria de comportamento do produto. Nenhum documento preexistente foi editado.
