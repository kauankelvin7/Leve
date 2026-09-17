# Leve — ponto exato de retomada

**Atualizado em:** 17/09/2026  
**Branch atual:** `feat/seasonal-experiences-safe`  
**Base:** `main` após o Calendário Mês/Semana/Dia validado  
**Estado:** fase sazonal em implementação e validação; ainda não integrar na `main`

> Este arquivo registra somente o ponto atual necessário para retomar. O histórico anterior continua preservado no Git, nos ADRs e em `docs/EXECUCAO.md`.

## Etapa atual

Implementar as experiências sazonais opcionais aprovadas para o Leve sem alterar o domínio de atividades, Firestore Rules, billing ou infraestrutura.

Direção de arte aprovada em `docs/SEASONAL-ART-DIRECTION.md`:

- intensidade equilibrada e elegante;
- formas editoriais/abstratas;
- intro de aproximadamente 3 segundos, uma vez por período/aparelho;
- Natal com estrelas/luzes e neve mínima ou ausente;
- Páscoa com ovo/papel/folhas, sem coelho literal dominante;
- favicon sazonal nesta fase; launcher instalado continua best-effort;
- CSS + SVG próprios, sem Motion, Lottie, canvas permanente ou asset remoto.

## Implementado na branch

### Contrato e persistência

- `seasonalDetailsEnabled?: boolean` no perfil, com compatibilidade `undefined => true`;
- ativação de conta grava `true` por padrão;
- `profile.update` preserva o valor quando clientes antigos não o enviam;
- exportação inclui a preferência;
- schema de arquivo aceita a preferência sem quebrar exports antigos;
- importação continua com a semântica já existente de trazer conteúdo como cópia, sem sobrescrever o perfil atual.

### Resolução sazonal

O registry puro continua resolvendo, por data civil:

- Natal: 20–25/12;
- Ano-Novo: 31/12–01/01;
- Páscoa: sexta-feira anterior até domingo;
- Festa Junina: 12–30/06;
- Halloween: 29–31/10.

Todas as cinco experiências podem aparecer nas superfícies principais `login`, `today`, `calendar` e no detalhe global mínimo. Sobreposição de Ano-Novo tem prioridade sobre outros períodos ativos.

### UI e comportamento

- `SeasonalExperience` centraliza resolução e renderização;
- SVGs próprios e determinísticos em `SeasonalGlyph`;
- layer sazonal usa `pointer-events: none` e fica atrás das superfícies interativas;
- intro local usa `leve.seasonal.seen.<eventId>.<periodId>`;
- `prefers-reduced-motion` e `profile.reduceMotion` removem a intro animada e mantêm somente decoração estática;
- preferência desligada remove decoração, intro e favicon sazonal;
- Login recebe presença maior; Meu dia e Calendário recebem presença moderada; outras telas, detalhe mínimo;
- Calendário marca o dia atual tanto na visão mensal quanto em Semana/Dia;
- favicon sazonal deriva cor e fundo da aparência/paleta ativa;
- Preferências ganhou `Detalhes sazonais` em Aparência e cores.

### Workflow e testes

- workflow focal `.github/workflows/seasonal-e2e.yml` usa somente Auth/Firestore Emulator e dados fictícios;
- unitários cobrem preferência, storage local, superfícies, prioridade de Ano-Novo e linguagem abstrata da Páscoa;
- E2E cobre entrada sem bloqueio, reduced motion, toggle persistido e reflow em Meu dia/Calendário;
- o CI normal do HEAD anterior da branch passou integralmente;
- um E2E anterior encontrou duas fragilidades de teste/visão do calendário; ambas foram corrigidas e o novo gate está em execução no HEAD atual.

## Arquivos centrais

```text
apps/web/src/components/seasonal/SeasonalExperience.tsx
apps/web/src/components/seasonal/SeasonalGlyph.tsx
apps/web/src/components/seasonal/seasonal-experience.css
apps/web/src/platform/seasonal/seasonalEvents.ts
apps/web/src/platform/seasonal/seasonalResolver.ts
apps/web/src/platform/seasonal/seasonalStorage.ts
apps/web/src/features/settings/ThemeSettings.tsx
packages/domain/src/identity.ts
packages/domain/src/archive.ts
server/commands/identity.ts
server/account-data.ts
tests/unit/seasonal-experience.test.ts
tests/e2e-local/seasonal-experience.spec.ts
.github/workflows/seasonal-e2e.yml
docs/SEASONAL-ART-DIRECTION.md
```

## Segurança e limites preservados

- nenhuma escrita direta nova no Firestore;
- nenhuma alteração em `firestore.rules`;
- nenhuma nova coleção;
- nenhuma API externa de feriados;
- nenhuma localização enviada para serviço externo;
- nenhuma biblioteca de animação adicionada;
- nenhuma credencial, analytics ou telemetria;
- custo de infraestrutura continua R$ 0;
- nenhuma publicação/deploy faz parte desta branch.

## Gates antes de integrar

A fase só pode seguir para PR/merge quando o HEAD final passar:

```text
npm audit --omit=dev --audit-level=high
npm run lint
npm run typecheck
npm test
npm run build
npm run test:integration
Seasonal E2E
```

O E2E final precisa comprovar: opt-out, intro única, reduced motion, light/dark, desktop/mobile, reflow, ausência de overflow e Axe sem regressão crítica.

## Pendência imediata

1. aguardar CI + Seasonal E2E do HEAD atual;
2. corrigir qualquer falha real sem enfraquecer os testes;
3. adicionar prova integrada focal de `profile.update`/export sazonal se a auditoria mostrar lacuna;
4. revisar o diff completo `main...feat/seasonal-experiences-safe`;
5. atualizar este arquivo para estado validado;
6. somente então abrir PR e considerar merge controlado na `main`.

## Riscos conhecidos fora desta fase

- dependências do projeto ainda possuem vulnerabilidades moderadas conhecidas; não usar `npm audit fix --force`;
- atualização do ícone de um PWA já instalado depende do navegador/SO e não é requisito desta experiência;
- leitor de tela externo e sensação de animação em aparelho físico continuam validações complementares, não substituídas pelo Playwright.
