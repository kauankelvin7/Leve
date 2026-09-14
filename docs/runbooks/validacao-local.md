# Validação local — Gates G0 a G4

## Executado localmente

- `npm run typecheck`: contratos TypeScript, comandos, rotas e UI.
- `npm test`: calendário, recorrência, referências de importação, outbox, logs redigidos, HMAC do tick/Worker, envelope FCM do service worker e contraste/foco base.
- `npm run test:integration:inside` com Auth/Firestore Emulator: importação interrompida, concorrência, regras por uid, materialização, leases, entrega incerta sem reenvio e retry confirmado.
- `npm run test:e2e:local`: 7 jornadas reais; inclui duas abas, offline/reconexão, troca de sessão, conflito preservado, lixeira, exportação/importação, teclado, Axe e reflow equivalente a 200%.
- Teste focal de capacidade: vinte contas gravaram simultaneamente com isolamento em 3,806 s no Emulator. É prova funcional local, não medição de franquia de produção.
- `npm run build`: pacote de produção gerado e TypeScript estrito aprovado.
- `git diff --check`: sem erro de whitespace.
- JSON do manifesto e dos índices: sintaxe válida.

## Ainda exige ambiente externo ou aparelho

- G0: confirmar plano gratuito e billing desligado nas contas Firebase, Vercel e Cloudflare.
- G1/G2: fechados localmente com dados fictícios; repetir no preview autorizado antes do aceite.
- G3: aplicar índice de lease, configurar segredos/VAPID/Worker e receber push com aplicativo fechado em aparelho suportado.
- G4: teclado, reflow/Axe, carga concorrente local e recuperação por exportação/importação aprovados; faltam leitor de tela, métricas reais de cotas e rollback de preview.
- G5: roteiro completo com a usuária, matriz de aparelhos, aceite e publicação autorizada.

Não marcar gates externos como aprovados com base em mocks, build ou resposta de provedor.
