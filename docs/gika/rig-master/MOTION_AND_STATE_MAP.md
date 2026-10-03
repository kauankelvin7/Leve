# Gika — Motion & State Map

## Princípio

O produto envia **fatos semânticos**. O Character Controller converte esses fatos em estado visual. A engine de animação nunca recebe texto privado e o modelo de IA nunca escolhe emoção.

```text
Product Fact
  → GikaCharacterEvent
  → deterministic controller
  → semantic state
  → body layer + head layer + face layer + optional gesture
  → animation engine
```

## Estados semânticos

### REST
Respiração mínima, blink ocasional e olhar neutro.

### IDLE
Postura amigável, blink, micro head movement e variações neutras locais.

### LISTENING
Trigger: `VOICE_CAPTURE_STARTED`.
Leve lean-in, olhos atentos, pequena inclinação. Capture ended/request started → THINKING.

### THINKING
Trigger: `REQUEST_STARTED` ou execução pendente.

Motion principal: `think_chin`.

Sequência:
1. olhos mudam direção;
2. cabeça inclina;
3. ombro inicia;
4. elbow flexiona;
5. forearm sobe;
6. hand chega ao queixo;
7. hold;
8. micro eye motion.

`focused_reading` pode ser variante visual futura quando existir sinal técnico próprio.

### CLARIFY
Trigger: resultado estruturado `clarify`.
Brows interrogativas, eye focus e explain gesture discreto opcional.

### CONFIRM
Trigger: preview aguardando confirmação.
Postura atenta, presenting gesture pequeno, nunca comemoração.

### SUCCESS
Trigger: somente ACK validado.
Smile + small wave/nod + retorno ao idle.

### CELEBRATE
Evento raro e explicitamente classificado pelo produto.
Gesto maior, braços, sorriso, curta duração e cooldown.

### ATTENTION
Conflict/stale. Alerta leve, sem pânico.

### ERROR
Falha real. Concern, pequeno recoil, sem dramatização.

### OFFLINE
Offline real. Pose calma, motion quase zero, expressão própria e diferente de blink.

### HELLO
Primeira abertura/contexto de greeting. Wave e presença maior; não em todo reopen trivial.

## Camadas de animação

### Layer 1 — Base body
rest/idle, torso, breathing.

### Layer 2 — Head
head tilt, look target, nod, variants.

### Layer 3 — Face
eyes, lids, brows, mouth.

### Layer 4 — Gesture
think_chin, wave, explain, celebrate, reading.

### Layer 5 — Secondary
hair, earrings, purple curl subtle secondary motion.

Misturar camadas quando seguro; evitar timeline monolítico para cada combinação.

## Variedade

No longo prazo:
- 4–8 head idle variants;
- 4–8 body idle variants;
- combinações permitidas;
- randomização local/determinística, sem LLM.

Para v1, 3 head × 3 body é suficiente.

## Escalas

### COMPACT — 48–64 px
Header/launcher. Blink, eye direction e tiny head motion. Sem gestos detalhados de mão/props.

### PORTRAIT — 96–140 px
Conversa/cards/welcome compacto. Face completa, think_chin, small wave, clarify, success.

### PRESENCE — 160–240 px
Welcome/onboarding/momentos especiais. Torso/arms, props, celebrate, focused reading, explain.

## Reduced motion

Cada estado tem pose estática equivalente.

Exemplos:
- thinking → hand-on-chin estático;
- clarify → curious estático;
- success → smile estático;
- offline → calm estático.

Sem loop/bounce/secondary motion contínuo.

## Timings sugeridos

Não são contratos rígidos:
- blink: 100–180 ms close, 70–140 ms open;
- head anticipation: 100–200 ms;
- hand rise: 250–450 ms;
- success gesture: 500–1000 ms;
- celebrate: 900–1600 ms;
- state crossfade: 120–300 ms conforme distância de pose.

## Motion rules

- nada teleporta;
- braço entra e sai pelo mesmo skeleton;
- props aparecem somente quando a pose suporta;
- draw order pode animar;
- não atravessar cabelo/rosto;
- não deixar features do estado anterior;
- reset explícito;
- interruptions definidas.

## Interruption policy

- listening → thinking: crossfade imediato permitido;
- thinking → success/error/clarify: interromper hold e sair por transition curta;
- success → thinking: somente com novo request real;
- any → offline: prioridade alta e saída segura do gesture;
- offline → idle: retorno curto e calmo.

## Props

Reservas:
- tablet → focused_reading;
- phone → using_app;
- mug → resting;
- heart → gratitude/celebrate.

Nenhum prop entra só porque apareceu na model sheet.

## Eventos sem dados privados

Permitidos:
- PANEL_OPENED
- VOICE_CAPTURE_STARTED
- REQUEST_STARTED
- CLARIFY_REQUIRED
- CONFIRMATION_REQUIRED
- ACTION_ACKNOWLEDGED
- CONFLICT
- FAILURE
- OFFLINE
- ONLINE
- PANEL_CLOSED

Proibido transportar:
- UID;
- task ID;
- título;
- nota;
- prompt;
- resposta;
- áudio/transcrição;
- receipt;
- conteúdo do calendário.

## Acceptance visual

Em 120 px, thinking, clarify, success, error e offline devem ser identificáveis em vídeo sem labels. Rest/idle podem ser próximos; compact pode ser mais sutil.
