# Gika Character — Acceptance Criteria

## Visual identity

A Character Foundation só pode ser considerada pronta quando:

- rosto reconhecível entre todas as poses;
- cabelo mantém silhueta consistente;
- pele/cabelo/paleta não variam indevidamente entre estados;
- avatar pequeno continua identificável;
- personagem não parece um asset genérico desconectado do Leve;
- dark/light preservam identidade;
- não depende de efeitos 3D para “funcionar”.

## Personality

- linguagem curta e natural;
- zero culpa;
- zero chantagem emocional;
- zero produtividade tóxica;
- humor leve e raro;
- erro é calmo e factual;
- sucesso é proporcional;
- personalidade é estável entre telas.

## State engine

- estados tipados;
- eventos tipados;
- sem strings mágicas vindas do modelo;
- nenhum conteúdo privado no controller;
- transições determinísticas;
- estado visual não altera domínio;
- fallback funcional sem runtime Rive.

## Motion

- idle não distrai;
- animações não bloqueiam input;
- reaction não muda layout;
- celebration não dispara em ações triviais;
- cooldown implementado para interações cosméticas;
- reduced motion possui comportamento explícito;
- canvas/renderer fora de viewport não desperdiça trabalho de forma evitável.

## Product integration

- launcher;
- panel empty state;
- thinking;
- clarify;
- confirmation;
- success;
- conflict/error;
- offline;

todos com comportamento revisado.

A ausência da personagem nunca pode impedir:
- ler agenda;
- escrever no composer;
- confirmar/cancelar ação;
- navegar;
- usar o Leve offline conforme suporte existente.

## Accessibility

- `prefers-reduced-motion` respeitado;
- foco/teclado continuam na UI React;
- animação não é a única fonte de informação;
- contraste da UI ao redor permanece AA;
- zoom 200% sem sobreposição crítica;
- safe area mobile preservada.

## Security/privacy

- nenhuma nova escrita Firestore;
- nenhuma nova Rule;
- nenhuma collection;
- nenhuma telemetria com conteúdo da agenda;
- nenhum ID privado entregue ao runtime visual;
- nenhuma animação escolhida pelo Gemini como autoridade;
- nenhuma mudança em receipts/revisions/policy para acomodar visual.

## Performance

Medir antes/depois.

Bloqueadores:
- runtime carregado no bootstrap sem necessidade;
- regressão perceptível de abertura do shell;
- vazamento ao abrir/fechar painel;
- asset excessivo sem justificativa;
- layout shift ao trocar fallback por Rive.

## Test matrix

No mínimo:

- 390×844;
- 768×1024 ou equivalente;
- 853×1280;
- 1366×768;
- 1920×1080;
- light;
- dark;
- reduced motion;
- offline/falha de asset;
- 200% zoom;
- keyboard only.

## Definition of Done C1

C1 está done somente quando:

1. Character Bible aprovada;
2. asset mestre e rig reais disponíveis;
3. Character State Engine integrado;
4. launcher/painel/estados críticos integrados;
5. fallback testado;
6. a11y testada;
7. performance medida;
8. gates verdes ou regressões explicitamente classificadas;
9. evidências persistidas;
10. checkpoint e branch remota limpa.

Mock, PNG ou conceito visual isolado não contam como conclusão do C1-T2.
