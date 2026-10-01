# Gika Character Foundation

Status: **planejado e isolado**. Esta branch existe para estruturar a personagem da Gika sem interferir no fluxo funcional M5 em andamento na `feat/gika-integration`.

## Decisão de produto

Gika deixa de ser apenas a interface conversacional do Leve e passa a ser uma **personagem de produto**: memorável, acolhedora, inteligente e contextual.

A personagem não controla domínio, policy, persistência ou comandos. Ela **reflete** estados já decididos pelo software.

Princípio:

```text
estado do produto
→ character controller
→ estado visual
→ animação/personagem
```

Nunca:

```text
modelo/LLM
→ escolhe animação privilegiada
→ altera comportamento do produto
```

## Direção visual

- mulher jovem parda/morena;
- cabelos cacheados volumosos como principal assinatura de silhueta;
- sorriso marcante;
- olhos e sobrancelhas muito expressivos;
- roupa simples, clara e moderna;
- pequenos detalhes em roxo/ameixa do universo Leve;
- 2D estilizado, limpo, icônico e fácil de animar;
- evitar acabamento genérico de “arte IA”, excesso de brilho, volumes 3D artificiais ou detalhamento que comprometa consistência.

Referência de linguagem: personagem expressiva e reconhecível, com leitura instantânea em tamanhos pequenos e animação baseada em estados.

## Personalidade

**Gika é a parceira de rotina do Leve.**

- acolhedora sem infantilizar;
- inteligente sem parecer fria;
- levemente brincalhona;
- prática e curta;
- não culpa o usuário;
- não usa produtividade como pressão;
- sugere em vez de mandar;
- comemora conquistas de forma proporcional;
- em erros, permanece calma e honesta.

Exemplos:

- “Boa. Seu dia ficou bem mais leve.”
- “Tem bastante coisa aqui. Posso organizar isso com você.”
- “Não consegui aplicar isso agora. Sua agenda ficou como estava.”

## Tecnologia pretendida

Direção preferida: **Rive + React**, com fallback estático e transições de interface usando a stack visual existente.

Three.js não é a escolha inicial porque a necessidade é uma personagem 2D altamente expressiva, não uma cena 3D.

Nenhuma dependência de runtime é adicionada nesta branch de fundação.

## Onde a personagem poderá aparecer

1. launcher/avatar da Gika;
2. painel vazio da Gika;
3. estados de thinking/clarify/confirm/success/error/offline;
4. onboarding curto;
5. empty states selecionados;
6. celebrações relevantes;
7. organização inteligente do M6;
8. futuramente voz/proatividade, sempre subordinadas aos contratos do produto.

A personagem não deve ocupar toda tela ou chamar atenção continuamente.

## Fases

### C1-T1 — Character Bible
Identidade, forma, proporções, tom de voz, expressões, poses, regras de uso e anti-padrões.

### C1-T2 — Visual Asset + Rig
Asset vetorial mestre, artboards, rig Rive e pacote inicial de animações.

### C1-T3 — Character State Engine
Contrato React/TypeScript que mapeia estados determinísticos do produto para estados visuais.

### C1-T4 — Product Integration
Launcher, painel, confirmation, result, onboarding e empty states; a11y, reduced motion, mobile, light/dark e performance.

## Sequenciamento

Esta fundação pode ser preparada em paralelo **somente em documentação/assets isolados**.

Integração em código deve ocorrer apenas após:

```text
M5-T4
→ fechamento/smoke de M5
→ integração/estabilização do shell responsivo
→ C1 Character Foundation
→ M6
```

## Regras de segurança de integração

- não editar `.agent/GIKA_STATE.md`, `.agent/GIKA_TASKS.yaml` ou arquivos em uso pelo Codex enquanto M5 estiver em andamento;
- não tocar em command layer, policy, receipts, recurrence ou server nesta branch;
- não adicionar writer, persistência, collection ou Rules;
- não criar acoplamento do modelo com animação;
- sem merge na main;
- sem deploy;
- sem Gemini live;
- integração futura por commit/cherry-pick ou merge revisado depois do fechamento de M5.

## Fonte de verdade desta iniciativa

- `docs/gika/character/CHARACTER_BIBLE.md`
- `docs/gika/character/MOTION_SYSTEM.md`
- `docs/gika/character/TECHNICAL_ARCHITECTURE.md`
- `docs/gika/character/INTEGRATION_PLAN.md`
- `docs/gika/character/ACCEPTANCE_CRITERIA.md`
