# Decisões do Glass

- M9 técnico congelado antes da autoria Glass. Aprovação facial e identidade/asset/controller intocados.
- Primitivo único no glass.css existente; manter suas regras históricas não relacionadas a vidro, removendo filtros redundantes em seus donos durante os lotes.
- Desktop sidebar/rail continuam ink opaco. Somente bottom navigation móvel recebe vidro: a paleta já validada e o contraste de navegação não dependem do blur.
- Inputs, células de calendário, listas densas, notas, previews/confirmation/batch/recurrence e danger zones permanecem sólidos. Nada de blur aninhado.
- Fullscreen Gika móvel permanece sólido: o blur de toda a tela não agrega hierarquia. Desktop dialog mantém uma superfície forte; scrim não terá blur adicional.
- Máximo24px sem exceção. Valores/alpha/saturação/border/shadow centralizados, fallback sólido antes de @supports, variantes e preferências de acessibilidade conservadoras.
- Harness usa Chromium nativo para cores modernas; cor desconhecida falha, não vira PASS. Autenticado utiliza o harness DEV/emuladores existente; preview4173 verifica o build público/PWA/isolamento sem alterar a configuração de produção.
- Manifesto preenchido uma vez a partir deste inventário; hash e harness protegidos depois dos self-tests. Qualquer alteração posterior exige motivo factual aqui, antes de editar o manifesto/lock.
- Lotes previstos: primitive + navegação/entrada/limpeza redundante (até5componentes), overlays/dock (até4), Gika (2). Nenhum lote pode ser declarado verde sem check/typechecks/lint/build/focais/Glass E2E reais.
