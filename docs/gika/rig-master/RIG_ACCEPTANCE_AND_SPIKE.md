# Gika — Rig Acceptance & Bounded Spike

## Objetivo

Evitar outra sequência infinita de prompts.

O novo master será aprovado em gates pequenos. Nenhuma integração completa antes de provar a base visual.

## Gate 0 — Baseline

Repo:
`feat/gika-integration @ d66da17e0655e546a20eb62f48faa0b102cdd938`

Nada da estratégia `RASTER_GESTURE_APPROACH_REJECTED_BY_HUMAN_VISUAL_REVIEW` volta ao runtime.

## Gate A — Master Asset

Entrada:
`gika-rig-ready-master.psd`

PASS somente se:
- layers semânticas;
- hidden anatomy completa;
- braços/antebraços/mãos independentes;
- face base completa;
- cabelo em massas úteis;
- mecha própria;
- props separados;
- sem matte;
- preview fiel;
- exploded view aprovado.

Saída:
`GIKA_RIG_READY_MASTER_APPROVED`.

Se falhar: corrigir arte, não rig.

## Gate B — Rig Skeleton

Construir somente:
- head;
- neck;
- torso;
- shoulders;
- upper arms;
- forearms;
- wrists/hands;
- principais hair secondary bones.

Sem State Machine complexa.

PASS:
- pivots corretos;
- deformação orgânica;
- joints não abrem;
- braço faz arco completo;
- mão chega ao queixo;
- cabelo não quebra;
- 120/160 px limpos.

Saída:
`GIKA_BASE_RIG_APPROVED`.

## Gate C — 3-Motion Spike

Somente:
1. idle;
2. think_chin;
3. wave.

Nada além disso.

### Idle
Blink, breathing, small head; loop de 10 s sem sensação mecânica.

### Think chin
Braço sobe pelo skeleton, mão toca o queixo, hold e retorno sem teleport.

### Wave
Elbow/wrist/hand articulados, proporção correta e retorno limpo.

## Hard exit criteria

Reprovar se ocorrer:
- aparência de recorte/colagem;
- junta abre;
- braço muda de estilo/resolução;
- face/cabelo mudam entre estados;
- mão teleporta;
- matte reaparece;
- mecha troca de lado;
- identidade muda;
- 120 px fica pior que a referência;
- transition deixa membro preso.

Se causa = arte: voltar ao master.
Se master estiver correto e a engine estiver comprovadamente bloqueando: abrir decisão Spine/Live2D.

## Gate D — Engine Decision

Continuar Rive se:
- 3 motions PASS;
- mixing funciona;
- performance aceitável;
- runtime React estável.

Considerar Spine se skeletal/IK body workflow estiver claramente bloqueado no Rive com master válido.

Considerar Live2D se a maior necessidade virar deformação orgânica facial/upper-body e o master PSD estiver excelente.

Qualquer troca exige mini-spike separado antes de migração.

## Gate E — Motion Library

Somente após Gate C PASS:
- listening;
- clarify;
- success;
- error;
- offline;
- hello;
- explain;
- celebrate reserve;
- focused_reading reserve.

Cada motion: vídeo, 96/120/160, light/dark, entry/hold/exit e interruption.

## Gate F — State Machine

Arquitetura:

```text
Root Character SM
├─ semanticState
├─ headLayer
├─ faceLayer
├─ bodyLayer
├─ gestureLayer
└─ reducedMotion branch
```

Inputs preferidos:
- state enum/number;
- gesture enum/number;
- intensity optional;
- reducedMotion bool;
- gazeX/gazeY optional;
- triggers somente quando necessários.

Evitar dezenas de booleans mutuamente exclusivas.

## Gate G — Runtime isolated review

Antes do Leve:
- standalone character review;
- sem Auth;
- sem Firestore;
- sem Gemini;
- sem commands.

Testar:
- 30 state cycles;
- interruption matrix;
- reduced motion;
- resize;
- light/dark;
- 48/64/96/120/160/240;
- lifecycle/open-close quando aplicável.

## Gate H — Human Visual Review

Vídeo 60–120 s. Mostrar sem labels primeiro e depois com labels.

Se thinking/success/error/clarify não forem distinguíveis, não integrar.

## Gate I — Product Integration

Somente após aprovação humana.

Preservar:
- controller;
- semantics;
- ACK contract;
- lazy loading;
- fallback;
- privacy;
- offline behavior;
- accessibility.

## Gate J — M9 Regression

Só depois da aprovação humana:
- audit;
- lint/AST;
- typechecks;
- build;
- unit;
- integration;
- full Gika;
- shell;
- Planner;
- conventional;
- offline/PWA;
- voice;
- recurrence;
- batch;
- confirmation;
- account switch/logout;
- Axe;
- performance/lifecycle.

## Anti-loop budget

Cada gate tem no máximo:
- 1 implementação principal;
- 1 correção localizada;
- 1 revisão humana.

Se continuar falhando, parar e classificar:
- ART_SOURCE;
- RIG_ARCHITECTURE;
- ENGINE_LIMIT;
- PRODUCT_INTEGRATION.

Não continuar polindo sem diagnóstico.
