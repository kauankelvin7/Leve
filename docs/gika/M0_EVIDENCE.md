# Evidências M0

Data: 2026-09-30. Base verificada: f6b21b6695f4953e28daace00edb05b2dd4bfde1.

## M0-T1

- Clone HTTPS concluído; main; `git status --short` vazio antes da extração.
- Nova branch feat/gika-integration criada. Pacote integrado; AGENTS.md original preservado.
- Scripts e entradas conferidos diretamente no package.json e configs, sem assumir README como prova de teste.
- `node --version`: v24.19.0; `npx --yes npm@11.19.1 --version`: 11.19.1; Java 21.0.12.1.
- Instalação exata concluída: 1125 pacotes; warnings preexistentes de pacotes deprecated e install scripts não autorizados pelo npm. Nenhum lockfile ou dependência alterado.
- `npm run lint`: PASS (exit 0).
- `npm run build`: PASS (exit 0), incluindo os dois typechecks. Aviso baseline de chunks >500 kB; index JS 1.200,56 kB (gzip 360,16 kB), Three 522,06 kB (gzip 129,57 kB).
- `npm test`: PASS, 25 arquivos / 93 testes.
- Nenhum código de produção alterado. Integração baseline em andamento.
- Ownership do orquestrador: AGENTS.md, GIKA_START_HERE.md, .agent/*, docs/gika/* e checkpoint em CONTINUAR.md. Nenhum subagente altera estado global.

## Convenção de SHA do checkpoint

O SHA dentro de um arquivo versionado não pode ser o SHA do próprio commit que contém esse arquivo. Cada checkpoint registra o HEAD verificado antes do commit e o identificador da tarefa/assunto do commit. O checkpoint seguinte registra o SHA da tarefa anterior. O checkpoint final registra o SHA do último commit de tarefa. Na retomada, comparar também `git log -1`, ancestry e diff dos commits posteriores; não tratar uma diferença como autorização para ignorar o histórico.

## M0-T2

Rastreio direto de content.ts, identity.ts, server/commands/content.ts, server/reminders.ts, Today.tsx, ActivityDetail.tsx, calendarCommandModel.ts e useCalendarRange.ts. Schemas, recorrência, categorias e todos os fluxos solicitados documentados na arquitetura. Nenhuma entidade fictícia ou alteração de produção. Gates baseline de M0-T1 continuam aplicáveis ao diff documental.
