# M5-CLOSURE-R1 — Firebase Admin / node-forge remediation

## Objetivo e entrada

R1 exclusiva, branch feat/gika-integration, fetch/local/origin `5ca793e17f23f671833bdf7cebd793cc96107af3`, worktree limpo antes de editar. M5-CLOSURE blocked, M5 histórico done e M6 tarefas todo. Remover GHSA-86w9-cpqp-85rv sem alterar domínio, policies, tools, writers, UI, Rules, outbox ou Firebase client. Não R2/M6, Gemini live, PR/main/deploy/shell/Character Foundation.

## Auditoria e plano executado

Antes: firebase-admin13.6.0 direto → node-forge1.4.0 transitivo; audit0critical/2high/0moderate. SDK usa forge.pki.privateKeyFromPem na validação de service-account. Leve importa APIs públicas modulares de app/auth/firestore/messaging (nenhum import interno/privado): initializeApp/getApps/cert/applicationDefault, getAuth/getFirestore, getMessaging, FieldValue/FieldPath e tipos DecodedIdToken/Transaction/DocumentReference. Frontend/domain sem Admin imports.

Inspeção do tarball publicado13.10.0: lib/app/credential-internal.js usa require(node:crypto)/createPrivateKey e não node-forge. Exports app/auth/firestore/messaging usados são idênticos ao13.6; engines>=18 (Node24.19.0 compatível), licença Apache-2.0 preservada. Este é o upgrade minor13.x solicitado, não14.x. Atualização direta Google Auth^9.14.2→^10.6.1 é dependência do SDK; requisito Storage^7.14→^7.19. Removidas dependências diretas forge/uuid/@types/node. Leve não importa APIs privadas desses pacotes.

Plano/ownership: alterar somente o pin Admin em package.json e resolução correspondente no lock; preservar dependências fora da cadeia, overrides anteriores e metadados libc dos bindings não relacionados; clean install; audit/compatibilidade/gates e comparação original de qualquer nova falha; commit funcional somente manifest/lock, depois checkpoint documental de evidência/estado e backup feat. Rollback eventual por revert autorizado do commit funcional, nunca reset/rebase/clean.

## Árvore antes/depois e mudança mínima

Árvores npm sanitizadas completas para os pacotes auditados e delta do lock em [m5-closure-r1-dependencies.json](evidence/m5-closure-r1-dependencies.json). Depois: firebase-admin13.10.0 → google-auth-library10.9.1/gaxios7.3.1/node-fetch3.3.2/data-uri-to-buffer4.0.1/google-logging-utils1.1.3 na cadeia Admin. Dependências compartilhadas de metadata/fetch passaram de dev-only para produção conforme grafo real, sem upgrades de versão desses nós compartilhados.

Firebase client12.19.0, @firebase/firestore4.17.2, @google-cloud/firestore7.11.6, @google-cloud/storage7.22.0, google-gax4.6.1, overrides gRPC1.14.5/uuid11.1.1 preservados. Nenhum override novo de forge, npm audit fix, --force, SDK14 ou patch manual crypto. Sete mudanças de versão/caminho no lock: Admin atualizado, cinco caminhos de dependências Admin adicionados, forge removido; demais alterações são metadados de alcance/dev/optional. Metadados libc que npm tentou remover em bindings não relacionados foram preservados da entrada, sem alterar versões/bytes desses pacotes.

`npm ci --include=dev` executado duas vezes: primeira instalação limpa PASS; segunda sobre lock final com libc preservado PASS. Não houve upgrade amplo/npm update. `npm ls --all node-forge --json` retornou árvore vazia (exit1 esperado de “não instalado”); forge não está na produção **nem** em outra cadeia instalada. Auditoria produção high e JSON inicial e final após os gates PASS/exit0:0critical/0high/0moderate/0low, total0.

## Compatibilidade observada

Sonda local nas duas versões, usando RSA sintética gerada em memória: cert aceita private key válida e rejeita entrada malformada nas duas. Nenhum PEM/chave foi escrito, logado ou versionado; nenhum credential real/live. Typechecks confirmam imports/tipos usados, build e integrações confirmam Auth/Rules/Firestore/commands/receipts/Undo/policy/recurrence/batch. Signatures só são validadas pelos fluxos existentes, sem nova lógica crypto no produto.

## Gates e primeiras execuções

| Gate | Resultado |
|---|---|
| Clean install (lock inicial e final) | PASS/exit0 |
| Audit produção high + JSON | PASS/exit0, 0critical/0high/0moderate |
| Lint / cliente+servidor typechecks / build | PASS/exit0 |
| Unit inicial com LOG_LEVEL=error imposto pelo runner | 479PASS/1FAIL; não verde |
| Reprodução focal do unit na entrada13.6, mesmo LOG_LEVEL=error | Mesmo teste de observação/sanitização falha; runner suprimiu console.info |
| Unit completa com ambiente padrão, sem LOG_LEVEL imposto | 480PASS/50arquivos, exit0 |
| `npm run test:integration` | 243PASS/8arquivos, exit0; Auth/Firestore lifecycle próprio |
| E2E originais Gika (create/Undo/complete/update/reschedule/confirmation/recurrence/batch) | **56PASS**, seis specs completas:12+6+6+12+7+13, primeiras execuções de cada grupo, exit0 |
| Auth histórico original (persistent:5) | **1FAIL**, strict-mode selector na linha18; bateria inicial57casos=56PASS/1FAIL, não integralmente verde |
| Reprodução Auth original na entrada5ca793e/Admin13.6 | Mesmo strict-mode selector na linha18, 1FAIL |
| Auth suplementar com seletores atuais, entrada13.6 | 1PASS, fluxo completo/console limpo |
| Auth suplementar13.10, cópia inicial com symlink node_modules | 1FAIL ao final, console com28HTTP403 de fontes fora da allowlist Vite; fluxo Auth completou |
| Auth suplementar13.10, dependências copiadas localmente como baseline | 1PASS, fluxo completo/console limpo; nenhum deadline/assertion relaxado |

Falha unit inicial: gika-action-policy:62 exige um evento console.info; server/logger resolve mínimo error pelo ambiente do runner, por isso recebeu0. Reproduzida no snapshot exato5ca793e/Admin13.6. Correção somente do comando de teste (LOG_LEVEL não imposto), sem editar/desabilitar teste ou código. Não classificar como regressão Admin.

E2E focais em grupos serializados, API/emuladores demo novos por grupo, mesmos testes/deadlines; nenhum writer concorrente. O Firestore órfão fictício da etapa anterior foi encerrado antes dos gates; nenhum workaround no produto. Somente dados de teste, GEMINI_API_KEY removida dos runners, proxy/egress herdado ambiente-only. Logs brutos /tmp não versionados; extração de status/assertions/counts sem headers/tokens/payloads.

## Limitações e decisão

**R1_PASS — segurança direcionada atendida**, sem regressão causada pelo Admin13.10 demonstrada. Audit produção0/0/0 e forge ausente em toda a árvore. Não confundir com M5_READY_FOR_NEXT_PHASE: closure global permanece blocked, conforme pedido. A bateria original Auth/Gika teve56PASS/1FAIL; não apagar essa primeira falha nem declarar tudo verde. A prova suplementar de Auth passou nas duas versões após corrigir apenas a configuração da cópia de teste.

Falha Auth original reproduzida no snapshot5ca793e com **node_modules13.6 copiado antes do upgrade**, não symlink para a instalação nova: `getByRole(button,{name:Criar conta})` resolve tanto o botão submit quanto “Criar conta com Google” e falha antes do envio de cadastro. O teste também usa o label histórico “Pular tutorial”, enquanto UI atual é “Pular guia”. Leve/client/test original são byte-idênticos nas duas versões. Não atribuir esse defeito do seletor ao SDK nem modificar a UI para satisfazer seletor obsoleto.

Prova complementar local **não versionada**: copia somente o primeiro teste de persistent.spec.ts (até antes de “login, ativação e atividade sobrevivem ao reload”), acrescenta `exact:true` aos dois cliques “Criar conta” e usa “Pular guia” no clique existente. Todas as demais ações/asserções/deadlines, inclusive console vazio, são iguais; não remove asserções nem amplia timeout. Copiar em snapshot/tests/e2e-local/r1-auth-compatible.spec.ts e executar npm run test:e2e:local com esse arquivo reproduz a prova. Cadastro/verificação/ativação/recuperação/código Auth emulador/logout/login/reload são realmente executados, não mocks.

A primeira cópia13.10 usou node_modules symlink para /workspace/Leve, enquanto baseline tinha cópia física. Traces e Vite apontaram28fontes @fontsource sob /@fs/workspace/Leve/node_modules e “outside of Vite serving allow list”; todas28HTTP403 eram fontes. Essa cópia completou o fluxo Auth, mas falhou na asserção final de console limpo. Repetição13.10 com **cópia física das mesmas dependências**, igual ao método baseline, passou sem erros. Nenhuma configuração/allowlist de Vite foi alterada; não workaround de produto, proxy ou relaxamento de asserção. Tentativa inicial preservada em /tmp/leve-m5-r1-current-auth-auth-compatible-initial.log; resultado correto em /tmp/leve-m5-r1-current-auth-copy-auth-compatible-initial.log.

Comparação final de **282 arquivos versionados fora da documentação e manifest/lock**: zero divergências à entrada5ca793e; digest canônico `88ec8334d5354c751736043a5c1a93f6458a08ebc5806aac0642f504cb829cde`. Nenhum teste fonte, timeout, policy, command/writer/receipt, Rule, SDK client, UI, env/provider ou arquitetura mudou. Fontes/licenças publicadas inspecionadas e instalação limpa validada; nenhum novo dependency override.

Primeiras execuções e resultados locais: /tmp/leve-m5-r1-static-results.json; /tmp/leve-m5-r1-current-e2e-results.json e logs iniciais por grupo; comparação /tmp/leve-m5-r1-entry-auth-*.log, sondas Auth em /tmp/leve-m5-r1-{entry,current-proof}; comparação unit /tmp/leve-m5-r1-unit-entry-same-env.log e repetição completa /tmp/leve-m5-r1-unit-standard-env.log. Não versionar logs/traces/headers. A única alteração de teste suplementar foi em /tmp, hash SHA256 da cópia: 35db325035fc00f74b26eed6603e4b2616459da279400377d27c506f0f65ff66. Emuladores não provam credencial real/ADC/FCM em produção; RSA sintética é prova local de validação, não provisionamento de service-account. Não Gemini live. Closure global permanece blocked pelo gate de regressão anterior e limite de policy já registrados; R1 trata somente segurança de dependências, não autoriza R2/M6.

## Checkpoints

Commit funcional isolado somente package.json/package-lock.json após os gates, seguido de checkpoint documental com esta evidência, árvore sanitizada, STATE/TASKS. SHA funcional verificado: `12c36521eeea7aa39fa1a7ccc7381c70a1b8dbe2`; parent exato5ca793e. Push somente feat/gika-integration; verificar HEAD local=origin/worktree limpo no encerramento e reportar SHA real. Parar antes de R2/M6. Nenhuma nova ADR necessária: mesma arquitetura, somente remoção upstream da dependência vulnerável.
