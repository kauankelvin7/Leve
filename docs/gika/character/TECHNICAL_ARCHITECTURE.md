# Gika Character — Technical Architecture

## Objetivo

Integrar uma personagem interativa sem acoplar animação ao modelo, domínio mutável, Firestore ou command layer.

## Princípio

```text
Product state
→ GikaCharacterController
→ visual state
→ Rive runtime
```

A personagem é consumidora de estado, nunca fonte de verdade.

## Estrutura prevista

```text
apps/web/src/features/gika/character/
├── GikaCharacter.tsx
├── GikaCharacterProvider.tsx
├── useGikaCharacter.ts
├── characterState.ts
├── characterEvents.ts
├── characterMotion.ts
├── characterA11y.ts
└── GikaCharacterFallback.tsx

apps/web/public/gika/
├── gika.riv
├── gika-avatar.svg
└── gika-static.svg
```

Os nomes finais dependem da auditoria de integração.

## Dependência pretendida

Rive React/WebGL2 é a opção inicial preferida. A dependência só será adicionada após:
1. M5 fechado;
2. impacto de bundle medido;
3. fallback estático definido;
4. spike técnico aprovado.

Não adicionar Three.js para esta iniciativa inicial.

## API de integração

Exemplo conceitual:

```ts
interface GikaCharacterApi {
  state: GikaCharacterState;
  dispatch(event: GikaCharacterEvent): void;
  reducedMotion: boolean;
}
```

Eventos não devem transportar conteúdo privado.

## Fonte dos eventos

### Permitido
- request iniciado/finalizado;
- policy clarify;
- confirmation pendente;
- ack real;
- conflict;
- offline;
- panel open;
- milestone local calculado pelo produto.

### Proibido
- texto bruto do usuário;
- prompt do modelo;
- descrição de tarefa;
- UID;
- entityId;
- token;
- payload Firestore;
- conteúdo do receipt.

## Relação com Gemini

Gemini pode produzir intenção/tool proposal no fluxo já existente, mas não recebe autoridade para escolher emoção, animação ou efeito visual privilegiado.

Errado:

```json
{ "animation": "celebrate" }
```

Correto:

```text
command ack = success
→ product event ACTION_SUCCEEDED
→ controller decide success
```

## Lazy loading

### Bootstrap
Launcher usa avatar SVG/estático.

### Primeiro uso
Ao abrir a Gika:
1. lazy import do runtime;
2. carrega `gika.riv`;
3. troca fallback pela personagem viva;
4. preserva tamanho do container para evitar layout shift.

### Falha
Se runtime ou asset falhar:
- manter SVG;
- manter UI da Gika funcional;
- não bloquear composer ou ações;
- registrar erro técnico sem conteúdo privado.

## Estado e persistência

Nenhum estado emocional precisa ser persistido no servidor.

Permitido em memória:
- estado visual atual;
- cooldown;
- última reação cosmética.

Não criar collection ou documento Firestore para a personagem.

## SSR/PWA/offline

- personagem não é requisito para o app funcionar offline;
- asset estático deve continuar disponível quando possível;
- runtime pesado não deve impedir shell;
- estratégia de cache precisa respeitar PWA existente;
- não introduzir service worker paralelo.

## Dark/light

A personagem não muda identidade entre temas.

Podem variar:
- fundo;
- halo;
- contraste do container;
- partículas secundárias.

Não alterar tom de pele, cabelo ou cores essenciais por tema.

## Layout

### Launcher
24–48 px: preferir avatar estático ou motion mínimo.

### Panel
96–200 px: Rive completo.

### Onboarding/empty state
160–320 px: artboard/pose dedicada.

### Mobile
Nunca cobrir:
- composer;
- CTA de confirmação;
- bottom navigation;
- safe areas.

## Acessibilidade

- `aria-hidden` quando puramente decorativa;
- se representar estado, texto equivalente já deve existir na UI;
- nunca usar animação como única evidência de sucesso/falha;
- respeitar `prefers-reduced-motion`;
- foco permanece em controles React, não no canvas;
- tap/hover na personagem não pode ser único caminho para ação.

## Segurança

Adicionar a personagem não altera:
- Auth;
- Rules;
- receipts;
- revisions;
- operationId;
- recurrence;
- batch;
- command layer;
- policy.

Qualquer diff nesses componentes durante C1 exige parar e revisar escopo.

## Performance budget inicial

Definir empiricamente no spike, mas medir pelo menos:
- JS adicional gzip;
- WASM/runtime;
- tamanho do `.riv`;
- LCP/INP do shell;
- tempo de abertura do painel;
- memória após abrir/fechar repetidamente.

Meta principal: usuário que nunca abre Gika não deve pagar todo o custo da personagem interativa no bootstrap.

## Cleanup

Toda instância Rive deve ser desmontada/limpa ao sair do contexto correspondente. Abrir e fechar o painel repetidamente não pode acumular render loops ou objetos.

## Observabilidade

Permitido:
- runtime loaded;
- runtime failed;
- asset failed;
- reducedMotion active;
- load duration em bucket técnico.

Proibido:
- mensagens do usuário;
- agenda;
- prompt;
- IDs privados.

## Feature gating

Durante integração inicial, considerar flag local/build-time para comparar:
- personagem estática;
- personagem Rive.

Não criar controle remoto ou infraestrutura paga apenas para isso.
