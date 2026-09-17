# Leve — ponto exato de retomada

**Atualizado em:** 17/09/2026  
**Branch atual:** `feat/seasonal-experiences-safe`  
**Base:** `main` em `e8047bf23778e5bb395639a2d839a72f61c1bcf7`  
**Estado:** implementação sazonal concluída e validada na branch; próxima ação é PR/merge controlado

> Este arquivo registra somente o ponto atual necessário para retomar. O histórico anterior continua preservado no Git, nos ADRs e em `docs/EXECUCAO.md`.

## Etapa atual

Experiências sazonais opcionais concluídas na branch isolada, seguindo a direção aprovada em `docs/SEASONAL-ART-DIRECTION.md`.

Direção de arte validada pelo usuário:

- intensidade equilibrada e elegante;
- formas editoriais e abstratas;
- intro de aproximadamente 3 segundos, uma vez por período/aparelho;
- Natal com estrelas/luzes e neve mínima ou ausente;
- Páscoa com ovo/papel/folhas, sem coelho literal dominante;
- favicon sazonal nesta fase; ícone de launcher instalado continua best-effort;
- CSS + SVG próprios, sem Motion, Lottie, canvas permanente ou asset remoto.

## Implementado e validado

### Contrato e persistência

- `seasonalDetailsEnabled?: boolean` no perfil, com compatibilidade `undefined => true`;
- ativação de conta grava `true` por padrão;
- `profile.update` preserva o opt-out quando clientes antigos não enviam o campo;
- alteração continua usando `expectedRevision`, recibos e o comando existente;
- exportação inclui a preferência;
- schema de arquivo continua aceitando exports antigos;
- importação preserva a semântica atual de importar conteúdo como cópia e não sobrescreve o perfil atual.

### Resolução sazonal

O registry puro resolve por data civil/fuso:

- Natal: 20–25/12;
- Ano-Novo: 31/12–01/01;
- Páscoa: sexta-feira anterior até domingo;
- Festa Junina: 12–30/06;
- Halloween: 29–31/10.

Ano-Novo tem prioridade em sobreposições. As superfícies são `login`, `today`, `calendar` e `global`.

### UI e comportamento

- `SeasonalExperience` centraliza resolução e renderização;
- `SeasonalGlyph` contém SVGs próprios, pequenos e determinísticos para os cinco eventos;
- layer sazonal usa `pointer-events: none` e permanece atrás da interface;
- nenhuma posição usa `Math.random()`;
- intro é marcada como vista somente depois de terminar, evitando race com React Strict Mode;
- chave local: `leve.seasonal.seen.<eventId>.<periodId>`;
- `prefers-reduced-motion` é lido já no primeiro render e, junto de `profile.reduceMotion`, elimina a intro animada;
- preferência desligada remove decoração, intro e favicon sazonal;
- toggle de Preferências é otimista durante o save e faz rollback se o comando falhar;
- Login recebe presença maior; Meu dia/Calendário, presença moderada; outras telas, detalhe mínimo;
- Calendário recebe marcador sazonal sem alterar cores de compromissos;
- favicon sazonal deriva da paleta/aparência ativa;
- modo escuro teve o contraste de `Excluir conta` corrigido após o Axe detectar 2,39:1.

### Gate permanente

`.github/workflows/seasonal-e2e.yml` ficou focal e permanente:

- roda em PR para `main` e em pushes relevantes;
- observa componentes sazonais, perfil/exportação e `apps/web/src/styles/**`;
- usa somente Auth/Firestore Emulator e dados fictícios;
- `permissions: contents: read`;
- concorrência cancela execução obsoleta da mesma ref.

## Validação final da branch

HEAD validado antes deste checkpoint: `e82f5e2bb2b24c97ba32a4304cde2f33ed36607c`.

```text
Production dependency security audit  PASS
npm run lint                          PASS
npm run typecheck                     PASS
npm test                              PASS
npm run build                         PASS
Auth + Firestore integration          PASS
Seasonal E2E                          PASS (6/6)
```

CI final da branch: run `35237771271`, sucesso.  
Seasonal E2E final da branch: run `35237768995`, sucesso.

O E2E comprova:

- decoração de Natal sem bloquear a entrada;
- intro uma vez por período/aparelho;
- reduced motion sem intro animada;
- opt-out persistido no perfil e remoção integral da camada;
- Claro, Escuro e Sistema;
- Axe WCAG automatizado;
- Meu dia e Calendário sem overflow nas larguras 1440, 1366, 1024, 430, 390 e 360 px.

A integração focal comprova `profile.update`, preservação por cliente legado, exportação da preferência e default `true` na ativação de conta.

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
tests/integration/seasonal-preference.test.ts
tests/e2e-local/seasonal-experience.spec.ts
.github/workflows/seasonal-e2e.yml
docs/SEASONAL-ART-DIRECTION.md
```

## Segurança e limites preservados

- nenhuma escrita direta nova no Firestore;
- nenhuma alteração em `firestore.rules`;
- nenhuma coleção nova;
- nenhuma dependência nova;
- nenhuma API externa de feriados;
- nenhuma localização enviada para serviço externo;
- nenhuma credencial, analytics ou telemetria;
- nenhuma mudança de billing/domínio/infraestrutura paga;
- custo planejado continua R$ 0;
- a branch não altera o domínio de atividades, recorrência ou outbox.

## Auditoria antes do PR

`main...feat/seasonal-experiences-safe` estava com `behind_by: 0` durante a revisão. O escopo ficou concentrado na experiência sazonal, preferência/exportação, testes, documentação, gate E2E e a correção de contraste descoberta pelo Axe.

## Pendência imediata

1. abrir PR para `main`;
2. aguardar CI + Seasonal E2E no contexto do PR;
3. revisar novamente o diff e confirmar o HEAD esperado;
4. fazer squash merge somente se os gates do PR estiverem verdes;
5. repetir CI + Seasonal E2E na própria `main`;
6. atualizar este checkpoint na `main` com o SHA final.

## Limitações honestas

- o ícone de um PWA já instalado no launcher depende do navegador/SO; o favicon sazonal é garantido pela aplicação, o launcher é best-effort;
- leitor de tela externo e sensação das animações em aparelho físico continuam validações complementares;
- dependências existentes ainda têm vulnerabilidades moderadas conhecidas; não usar `npm audit fix --force` nesta fase.

## Próximo bloco depois da integração

Executar a auditoria final do plano (`Fase 7`), sem reimplementar Planner ou sazonal. Priorizar regressão global, PWA/service worker, temas, documentação e as validações externas que realmente exigirem aparelho/ambiente autorizado.
