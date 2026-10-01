# Gika — Motion System

## Objetivo

A animação da Gika existe para comunicar estado, intenção e resposta. Movimento decorativo contínuo deve ser mínimo.

## Estados visuais

```ts
type GikaCharacterState =
  | "idle"
  | "hello"
  | "listening"
  | "thinking"
  | "clarify"
  | "confirm"
  | "success"
  | "celebrate"
  | "attention"
  | "error"
  | "offline"
  | "resting";
```

Os nomes finais podem mudar na integração, mas a semântica deve permanecer estável.

## Mapeamento inicial

| Estado de produto | Estado da personagem |
|---|---|
| painel aberto e ocioso | idle |
| primeira abertura da sessão | hello |
| input enviado | listening |
| request em andamento | thinking |
| policy = clarify | clarify |
| confirmation pendente | confirm |
| ack real de sucesso | success |
| marco importante | celebrate |
| conflito/stale | attention |
| falha real | error |
| app offline | offline |
| pausa longa/empty state noturno | resting |

## Regra de autoridade

O Character Controller recebe apenas eventos derivados do software.

```text
domain/UI state
→ character event
→ controller
→ Rive state machine
```

O modelo de IA nunca envia nome de animação como autoridade.

## Camadas de animação

### Base loop
- respiração quase imperceptível;
- micro movimento de cabeça;
- piscar.

### Face
- olhos;
- sobrancelhas;
- boca;
- direção do olhar.

### Gesture
- apontar;
- acenar;
- braços;
- inclinação de corpo.

### Reaction
- success;
- celebrate;
- attention;
- error.

Camadas devem permitir, por exemplo, piscar durante thinking sem reiniciar a animação inteira.

## Intensidade

### Nível 0 — estático
Fallback, reduced motion, listas densas.

### Nível 1 — micro
Piscar, respirar, olhar.

### Nível 2 — reação
Acenar, apontar, sorrir, pensar.

### Nível 3 — celebração
Movimento amplo, partículas leves, duração curta.

Nível 3 é raro.

## Biblioteca inicial de motions

### idle
Loop discreto, 4–8 s de variação, sem repetição mecânica perceptível.

### hello
Aceno curto. Executa uma vez.

### listening
Olhar atento, postura aberta.

### thinking
Olhar levemente lateral, mão próxima ao rosto, micro movimento.

### clarify
Cabeça inclinada + sobrancelha curiosa.

### confirm
Aponta ou apresenta a área de ação. Sem movimento que cubra o botão.

### success
Sorriso + pequeno gesto positivo.

### celebrate
Braços ou gesto expansivo, duração curta.

### attention
Expressão atenta, sem alarmismo.

### error
Preocupação leve; retorna para idle.

### offline
Relaxada, pouco movimento.

### resting
Olhos fechados/serenos; usado apenas quando contextual.

## Timing

- microexpressão: 120–280 ms;
- reação curta: 300–700 ms;
- reação de sucesso: 600–1000 ms;
- celebração: 900–1600 ms;
- transição para idle: suave e não abrupta.

Não bloquear interação esperando uma animação terminar.

## Cooldown

Interações de hover/tap devem ter cooldown.

Sugestão:
- hover curioso: no máximo 1 reação a cada 8–15 s;
- tap no avatar: 1 reação curta a cada 3–5 s;
- celebração: apenas por evento real.

## Hover e olhar

Desktop pode usar direção de olhar para cursor dentro de uma zona limitada. Isso é cosmético e deve ser desativado:
- em reduced motion;
- em touch;
- com canvas fora de viewport.

## Reduced motion

Quando `prefers-reduced-motion: reduce`:

- nenhum bouncing;
- sem loop corporal;
- sem partículas animadas;
- sem tracking do cursor;
- transições substituídas por fade ou pose estática;
- piscada opcional e muito discreta.

A informação textual permanece completa.

## Performance

- pausar state machine fora de viewport quando possível;
- não carregar personagem completa no bootstrap do app;
- launcher pequeno pode usar SVG/avatar estático;
- carregar runtime/asset interativo somente quando necessário;
- liberar instância ao desmontar;
- limitar artboards simultâneos.

## Eventos de produto

O controller deverá aceitar eventos sem detalhes privados:

```ts
type GikaCharacterEvent =
  | { type: "PANEL_OPENED" }
  | { type: "REQUEST_STARTED" }
  | { type: "CLARIFICATION_REQUIRED" }
  | { type: "CONFIRMATION_REQUIRED" }
  | { type: "ACTION_SUCCEEDED"; importance: "normal" | "milestone" }
  | { type: "ACTION_CONFLICTED" }
  | { type: "ACTION_FAILED" }
  | { type: "NETWORK_OFFLINE" }
  | { type: "NETWORK_RESTORED" };
```

Não incluir títulos de tarefas, descrições, IDs, UID ou payload de documentos na máquina visual.

## Critério de qualidade

Uma animação é aceita somente se:
- continua legível em mobile;
- não atrapalha ações;
- respeita reduced motion;
- não cria layout shift;
- não exige texto para “explicar” o movimento;
- mantém o mesmo rosto/personagem em todos os estados.
