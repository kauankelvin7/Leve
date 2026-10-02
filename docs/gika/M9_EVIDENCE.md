# M9 — hardening e release candidate

Entrada2e73b3ab4fbd72b04fc328dce60be7b928b32c77; branchfeat/gika-integration, fetch/local/origin iguais, worktree limpo. M8 aprovado, T1→T4 sequenciais autorizados. Ponytail/full/Caveman/full/humanizer local; sem novos milestones/closures/serviços pagos.

## T1 — revisão factual

Auth middleware verifica IDtoken/revogação; commands transacionais revalidam conta/membership/ownership/expectedRevision e receipt. Gika strict/contexto mínimo/readbounded/provider sem IDs/persistência; signerpurpose/expiração/snapshot e batchcap5/occurrence/future mantidos; voice/proactivity draft-only/offline semfila. Rules privadas denywrite continuam autoridade do cliente; Admin passa command layer. Gika12KB, bodyconvencional10MB preservado para import bounded existente. LimiterGika instance-local 3/min10/dia/1inflight/120globaldia/cap5000, sem garantia distribuída; mutações possuem controles/quota/ratebucket transacionais existentes. Não criar infraestrutura distribuída por estética.

AppCheck adiado factualmente: nenhum sitekey/provider/registro de domínios/reCAPTCHA validado disponível, integração web+PWA+Firestore+APIAdmin exigiria tokenverify e enforcement coordenados com usuário legítimo/offline/emuladores/CSP; habilitação cega bloquearia release ou fallback anularia enforcement. reCAPTCHAEnterprise/CloudBilling não autorizado. AppCheck não substitui Auth/Rules, ausência não é vulnerabilidade presumida. Reavaliar após cadastro/validação operacional gratuita/UAT, sem alterar proteções atuais ou ativar serviço.

Risco concreto encontrado: envguard whitelistFirebase verifica secret/token/etc mas permite VITE_GEMINI_API_KEY porque regex não incluía api-key. Adicionar rejeição de chaves de API não whitelisted, preservando publicFirebaseconfig. Prova focal antes/depois, sem segredo real nem chamada provider.

T1 reprodução envguard: primeira focal1FAIL/1PASS (não lançava erro para APIkey privada); após correção lint/doisTS/build/535unit/auditprodução0 PASS. Nenhum secret/SDK/Rules/domain/writer alterado. AppCheck ausência registrada como limitação operacional, não falha automática.

## T2 — observabilidade sanitizada

Reprodução1FAIL em backend-logging: SyntaxError/cause deixavam mensagem privada nos logs apesar da máscara de credenciais. Correção no logger existente remove mensagens/stacks/freeform causes; somente classe/code/status técnico. Rotas receipt privadas viram /api/commands/:operationId, desconhecidas viram unknown. Removidos hashes estáveis identity/operation e command livre (schema aceita string desconhecida) da telemetria HTTP/dispatch; correlationId técnico novo preservado. Validation log sócodes, sem paths de campos enviados. Finish Gika/commands info com HTTPstatus/latencybucket; policy deny/clarify e AppErrorcode/expired/conflict/provider continuam disponíveis. Sem nova plataforma/endpoint/analytics/telemetria de voz ou agenda.

Após fix: lint/doisTS/build/537unit/252integração8arquivos PASS (Auth/Rules/commands/revisions/receipts/confirmation/recurrence/batch/organization). Teste anterior que esperava mensagens privadas foi atualizado para exigir ausência, não relaxar domínio. Logs nunca contêm conteúdo/tokens/UID/áudio/modelresponse; nenhum comportamento mutável alterado.

## T3 — Character e medições iniciais

Origin/design/gika-character-foundation contém seis especificações lidas integralmente, nenhum mestre/avatar/rig .riv. Ferramentas Inkscape/Blender disponíveis para vetor/3D, sem editor/CLI/plugin de autoria Rive no harness; nenhuma ferramenta callable Rive, nenhum .riv no workspace. Runtime player não é authoring; raster gerado não é rig. Sem caminho factual de autoria/validação de rig real, CHARACTER_ASSET_REQUIRED. User reafirmou que controller/fallback/documentação não concluem a identidade visual: nenhum SVG/CSS improvisado/personagem genérica/runtime instalado. GikaMark estático atual mantido; acabamento visual da personagem bloqueia experiência final completa e RC visual final. Continuação demais itens M9 autorizada; não mascarar M9 done.

Build antes: entry577,02KB gzip175,22; api Firebase chunk603,85KB gzip178,53; Three522,06KB gzip129,57 jálazy/condicional desktoppointerfine/no reducedmotion; GikaPanel53,71KB gzip14,31 lazy. Plugin de medição temporário /tmp atribuiu entry ReactDOM/Temporal/router/Zod e apiFirestore/Auth/RE2; Three renderer/core. Experimento mínimo de destructuring importThree reduziu só13bytes (gzip7), aumentou entry284bytes (gzip99); descartado/restaurado. Não criar divisão artificial sópara silenciarwarning; não alterar threshold. Índices API/core necessários offline/Auth/commands, converter para carregamento síncrono tardio mudaria arquitetura sem benefício demonstrado. Warning registrado como limite conhecido, panelpersonagemnão pesa bootstrap.

T3 primeira suíte quality13casos:9PASS/4FAIL5,6min. Falhas: Axe completed all-day opacity .62 contrast4,28:1; duas fixtures semanal selecionavam Frequência ainda dentro de details Maisopções fechado (90/120s), e design exigia tutorial já concluído por outros casos. Comparação cinco originais (incluindo all-day que deixa chipcompleted) em cópia exata2e73b3a:1PASS/4FAIL4,2min, mesmas causas/contraste/linhas. Cópia hardlink inicial não suportada entre filesystem/tmp; tentativa ambiental abortada antes dos testes e refeita com cópia real, sem symlink/Vite workaround. Não atribuir falhas a latência.

Fix estrutural: completedchip/event sem opacityglobal que enfraquecia texto, mantém muted AA/line-through. Teste all-day existente ganha Axe no próprio estado completed. Fixtures convencionais abrem details antes frequência; design aceita tutorial finalizado e mantém asserções de domínio/Axe/preferences; matriz existente ampliada6viewports reais. Não redesenhar produto para dívida de seletor; nenhuma deadline/retry reduzida/asserção relaxada. Demais camadas/UI inalteradas. Primeira chamada de execução pósfix rejeitada por exec-server transportdisconnected antes de iniciar; conexão recuperada e SHA/worktree confirmados146bb4a/diffpreservado, sem reimplementação.

Primeira quality após fixes12PASS/1FAIL2,8min: design chegou a asserção antiga de42dias, mas calendário adaptativo inicia Semana no viewportdesktop padrão. Nenhum runtime/domain mudou; falha isolada original na base2e73b3a reproduziu42esperados/0recebidos. Fix de fixture seleciona Mês explicitamente antes da prova mensal, sem remover asserções. Primeira typecheck da matriz6falhou por tupleinferida number|undefined; somente asconst corrigiu tipo, lint/doisTS/build/537unit seguintes PASS. Mantidas ambas tentativas.

T3 focal design seguinte FAIL: última navegação completa em2560/configurações chegou a tela vazia; Chromium registrou19 módulos Vite recusados por ERR_INSUFFICIENT_RESOURCES após44fullnavigations. Harness usa agora os links reais da SPA, mantém verificação deURL/título/overflow/Axe nas42 combinações. Próxima tentativa alcançou somente premissa histórica rgb(): Chromium serializa o fundo opaco como color(srgb…). Asserção substituída por alpha255 renderizado pelo navegador, prova semântica mais forte; primeira após ajuste1PASS52,7s.

Inspeção real de60 superfícies (5rotas×6viewports×light/dark) encontrou controles avatar fora do próprio painel853/1024 e dígitos da semana partidos a200% de texto390. Adicionadas verificações geométricas no teste design existente, sem novos casos por quantidade. Primeiraquality12PASS/1FAIL3,2min reproduziu ambos os overflows do avatar; Axe ainda observou uma transição de cor do link anterior durante navegação. Espera agora título real e término das animações finitas da sidebar, sem sleep/deadline/retry/threshold alterado. CSS de origem: grid avatar auto-fit/flexwrap do cabeçalho; datas inteiras e scroll interno da semana somente quando necessário. Nenhuma regra de agenda alterada. Primeira design após fixes1PASS57,4s; lint/doisTS/build PASS,537unit anteriores preservados; regressão ampla T4 cobre estado final.

Medição final técnica: entry577,02/API603,85/Three522,06/GikaPanel53,71KB inalterados; CSS145,69KB(gzip27,04). Screenshots de60 superfícies reais revisados por amostragem de todas as larguras/rotas/claro/escuro, incluindo avatar corrigido e200%/solid. Overflowglobal0,20 scans Axe0. Observação lab em Chromium/dev/dados sintéticos: layout-shift acumulado0,09087 durante navegação/resize (não é WebVitals de produção). Primeiro carregamento do panel acrescentou cerca1,3MB lazy code/DOM; duas rodadas seguintes20open/close cada mantiveram9documents/963nodes/284listeners, heaps25,03→25,13MB, zero dialogs abertos ao final/zero modelrequests. Nenhuma tendência de duplicação DOM/listeners observada; isso não certifica leak-free ilimitado/hardware/INP/LCP de produção. Bootstrap lazy existente preservado; nenhum split artificial/runtime personagem/dependência novo.

T3 permanece **blocked: CHARACTER_ASSET_REQUIRED**. Demais melhorias técnicas verificadas; não concluir identidade visual, animação ou RC visual por fallback. Continuar T4 independente conforme autorização expressa, sem criar fase adicional.

## T4 — harness e regressão em andamento

Verify único reusa audit/lint(do AST)/build(doisTS)/unit/integration/E2E crítico8. CI recebe somente essa bateria crítica, sem deadlines/retries/dependência nova; audit de produção agora exige também zero moderate. CONTRIBUTING curto operacional; full100Gika/Planner/shell/PWAoffline no gate RC manual. Guard AST usa @babel/parser já instalado via ESLint; TypeScript7 neste pacote não exporta createSourceFile/compiler API. Read owners exatos reads/batchGuard podem importar somente db/commandHash; UI somente firebaseAuth, nenhum writer permitido. Provas negativas temporárias: import/export db, import()Firestore, Admin root, path dinâmico e proactivity→apiAdapter rejeitados. Primeiro probe revelou matcher que não incluía apiAdapter; primeira ampliação SDK causou falso positivo no legítimo platform/firebaseAuth. Ambas falhas corrigidas na própria ferramenta, não no produto;43fontes legítimas PASS. Nenhum artefato/probe retido. Limite: guard de imports não é prova adversarial transitiva completa; domínio/Auth/revisions/receipts continuam protegidos pelos testes reais.

Shell primeira tentativa npm run test:e2e não iniciou casos: webServer esperava127.0.0.1 mas Vite configurado localhost/IPv6, timeout60000ms original preservado. Configs de teste alinham localhost existente, sem workaround de produção/timeout aumentado; primeira shell seguinte17PASS56,0s, Axe/light/dark/viewports/entrada real mais referências históricas. Config local auto-start usa emuladores efêmeros/HMAC em memória e GEMINI_API_KEY vazia (ausente funcionalmente, sem chave fictícia); provider fixtures, sem live.

Primeira regressão Gika em grupos fresh serializados (emuladores/API/dev novos; sem segredo): proatividade7PASS1,1min; interface/leitura/voz/organization37PASS5,7min; create/complete/update/reschedule/confirmation/recurrence/batch56PASS8,9min. Total100/100, nenhum rerun/deadline/assertion/retry alterado. Suite convencional/Planner e execução canônica ainda pendentes. Audit produção high+JSON atuais0total/0critical/high/moderate.


### T4 — primeira regressão convencional e comparação

Quality final13/13PASS3,3min (Planner/revisões/recorrência/offline/design/Axe). Primeira convencional20:12PASS/8FAIL4,6min; avatar2, persistência8, timer2, refinements1 e sazonal7. Falhas preservadas: cadastro strict Criarconta/Google2,9s; persistência calendário mensal inexistente16,3s; all-day Meu dia colide breadcrumb7,1s; nota navigation colide atalho3,4s; export labels antigos90s; tutorial accessible name antigo15,1s; sazonal última largura360 tela vazia com módulo de fonte ERR_INSUFFICIENT_RESOURCES; timer2 link Meu dia colide breadcrumb. Em cópia exata2e73b3a, oito casos +avatar2:3PASS/7FAIL3,1min, mesmos sete seletores/vista/labels. Sazonal NÃO reproduziu na entrada: não classificar como baseline demonstrado. Evidência atual aponta recurso do loader Vite/Chromium após fullnavigations; navegar pelos links SPA reais preserva todas as provas de seis larguras/estado sazonal, sem mudar produto.

Fixtures adaptadas à UI atual sem remover asserções/deadlines: exact Criarconta/Pularguia; navigation Principal; selecionar Mês antes de asserções mensais; labels Baixarbackup/Importarbackup; tutorial identificado pelo próprio heading acessível; SPA na matriz sazonal. Primeira pós-adaptação20:17PASS/3FAIL4,0min. Novos pontos alcançados: summary Concluídos não contém mais texto literal `(1)` (count atual em small); destaque do guia ausente na vista Semana; relógio de teste continua avançando durante navegação (UI observou41..50 em vez de40).

Guia: defeito concreto no produto, Tutorial target `.calendar-panel` só alcança Mês, calendário adaptativo também usa `.calendar-time-panel`. Correção mínima de uma linha inclui os dois painéis; nenhuma regra temporal/domínio muda. Teste existente exige destaque real, não força Mês para ocultar o defeito. Primeiro focal pósfix4:2PASS/2FAIL55,1s; destaque passou, refinements alcançou outra premissa mensal e timer congelado por pauseAt deixou subscription aguardando. Tentativa pauseAt descartada: pausa global impede timers do Firestore durante navegação. Fixture passa a fixar somente Date, ancorada no serverTime do ack real timeEntry.start; timers/rede continuam ativos, asserções35/40s mantidas. Nenhum código de cronômetro alterado. Summary de compras mantém prova count1 antes de abrir em cada reload/restore; refinements seleciona Mês somente na prova mensal posterior ao guia.

Segundo focal pósfix5:3PASS/2FAIL1,7min. Fix Date-only provou timer40s sem congelar subscriptions; restante falhou por link Preferências maiúsculo antigo e cor literal Rosa legacy #CE92A5 (paleta atual #B76F88). Correções somente de teste: nome acessível Perfil e preferências; cor observada no radio escolhido comparada ao marcador persistido, mantendo texto Rosa/reload. Terceiro focal5/5PASS1,1min (avatar2, persistência, guia/mobile/Axe, timer). Lint/doisTS/build após target fix PASS, sem alterar timer/paleta/command/domain.

Comparação focal da causa do guia: código de produto na entrada2e73b3a, somente fixtures atuais copiadas para comparação, emuladores/API/dev novos.4casos:3PASS/1FAIL42,0s; guia reproduziu falta de tutorial-highlight no calendar-time-panel, timer Date-only passou na entrada sem mudar produto. Defeito do guia preexistente confirmado; não introduzido por M9. Comparação registra fixtures adaptadas, não declara suíte original verde.

Suíte convencional final20/20PASS3,1min em ambiente fresh após correções demonstradas: cadastro/Auth, persistência, all-day, compras/lixeira, multitab/offline, conflito de notas, teclado/reflow, export/import, guia/cores/unidades/mobile/Axe, sazonal/reduced/lightdark/seis larguras, timers/reload. Não alterar produto para seletores: somente target real do guia foi corrigido; fixtures atualizadas preservam domínio e deadlines.

### Gates técnicos finais

Primeira execução canônica `npm run verify`: exit0, sem rerun. Inicia e encerra seus próprios emuladores/API/dev, sem GEMINI_API_KEY funcional; oito casos críticos em1,3min. Manifest/lock/versões de dependências não mudaram: clean install local adicional desnecessário; CI mantém npm ci. Nenhuma deadline/retry/threshold alterada para obter verde.

| Gate | Resultado observado |
| --- | --- |
| Audit produção high+JSON e verify moderate | PASS;0critical/high/moderate/low,0total |
| Lint + AST boundaries | PASS;43 fontes, probes negativos rejeitados |
| Ambos typechecks + build | PASS;warning de chunks investigado/preservado |
| Unitários completos |537/537PASS;54 arquivos |
| Integração completa Auth/Rules/commands/revisions/receipts/scopes/organization |252/252PASS;8 arquivos |
| Gika ampla, três grupos fresh serializados |100/100PASS (7proatividade+37UI/leitura/voz/organization+56mutações) |
| Planner/design/Axe/zoom/seis larguras |13/13PASS;3,3min |
| Convencional/Auth/PWAoffline/guia/sazonal/timer |20/20PASS;3,1min após causas documentadas |
| Shell/produção/Axe |17/17PASS;56,0s após correção da URL de readiness |
| E2E crítico canônico com auto-start |8/8PASS;1,3min, primeira execução |

As100Gika passaram antes da correção de uma linha no target do guia; fontes Gika/model/domain não mudaram depois. A bateria convencional20 e critical8 passaram no estado final do produto. Primeiras falhas/comparações acima permanecem: os resultados finais não apagam as tentativas anteriores.

Comparação byte a byte com entrada2e73b3a:98arquivos protegidos (server exceto app/logger de diagnóstico, domain, Gika/UI/bridges, Auth/identity, platform/outbox, Rules/indexes/configFirebase e lock) inalterados. Dependencies/devDependencies/overrides/engines iguais. Nenhum writer/collection/outbox/receipt/policy/Rules/persistência paralelo; nenhuma identidade originada do modelo ou autoridade a partir de narrativa. Guard AST é enforcement de imports limitado, não prova adversarial universal. Fotografias geradas pelos testes restauradas/removidas somente nos caminhos desta execução; não versionar traces/logs privados.

### Limites e decisão

**M9_BLOCKED_CHARACTER_ASSET_REQUIRED.** Segurança, observabilidade, acabamento técnico e regressão independente verificados; T3 visual e aceite RC de T4 continuam bloqueados pelo asset vetorial/rig Rive reais. Nenhuma personagem improvisada/controller/fallback foi declarada final. Não produzir M9_DONE_RC_READY enquanto isso faltar. Retomada dentro do M9 existente: receber/autorar asset+rig legítimos com ferramenta apropriada, integrar conforme Character Bible, medir runtime/lazy/cleanup/reduced motion e validar o acabamento real; então concluir o aceite de T3/T4.

Limites operacionais preservados: AppCheck depende de configuração/UAT gratuitos; limiter por instância; warning de chunks sem benefício seguro de split demonstrado; métricas lab não são LCP/INP/CLS de campo. Microfone/permissões/browser em aparelho real, rig Rive, Gemini live, produção e UAT humanos não foram comprovados nesta execução. Sem áudio/TTS/live/billing/deploy/main/PR; push autorizado somente feat/gika-integration.

Checkpoint documental final baseado em test/harness `f61734024f853764e6c2939a981c508a1ef86704` e guia `546ec5f`. Estado/tasks preservam T1/T2 done e T3/T4 blocked pelo acabamento real. Nenhum código alterado depois da verificação; confirmar push/local=origin/worktree limpo no encerramento.

## Retomada Character — referência aprovada e autoria Rive

Entrada `e28da58ca6c619d774efb5687ec04aedd6e4c5d5`, feat/gika-integration; fetch/local/origin iguais, worktree limpo antes de alterações. Pedido GIKA_RIVE_PRODUCTION_TO_RC lido; imagem fornecida inspecionada, sem gerar outra personagem. Seis especificações Character lidas na fonte imutável `design/gika-character-foundation@3b3011c8b4ea0a5a19b5d7f18be06eb18767d8db`, sem merge da branch antiga.

**Entregue:** [GIKA_VISUAL_LOCK](character/GIKA_VISUAL_LOCK.md) e [referência original](character/reference/gika-approved-reference.jpg). JPEG1280×960,223809bytes; SHA256 `f2fd8858087f663c473586e79445af8d837fc00296b88215e6975941828b8b05`. Cópia byte a byte, mantendo extensão verdadeira em vez de converter para PNG. Rosto/cabelo/figurino e uma mecha anatômica esquerda (viewer direita frontal) congelados; `VOICE_CAPTURE_STARTED → listening`, `REQUEST_STARTED → thinking`, ack real antes success. Nenhum master/fallback oficial/rig da Gika entregue nesta retomada.

### Ferramenta: resultado factual, distinto do asset

LinuxDebian13/x86_64, Node24.19.0, Inkscape/Blender presentes. Rive CLI **1.3.0** instalado pelo script oficial `https://releases.rive.app/cli/install.sh`, inspecionado integralmente antes de executar: origem oficial, manifest/SHA256, validação dos caminhos do tar, instalação no usuário fora do Leve. Sem plugin callable Rive/editor autenticado nesta execução. Não instalar pacote React/player: ainda não há consumidor legítimo no produto.

Primeira execução `--version/doctor/help` falhou exit127: `libGLESv2.so.2` ausente, inclusive no caminho headless. Não é falha do Leve nem prova de CLI indisponível. Ambiente sem sudo; extraído pacote oficial Debian trixie `libgles2 1.7.0-1+b2`, conferindo SHA256 contra Packages.xz oficial, em `~/.local/share/gika-rive-system-libs`; LD_LIBRARY_PATH somente nos subprocessos de autoria, sem workaround/configuração de produção. Em seguida `rive --version` confirmou1.3.0; analytics desativado.

Provas em `/tmp`, sem login/upload:

| Prova | Resultado |
| --- | --- |
| Scaffold oficial `create`, `--verify` | PASS; zero erros/warnings |
| Scaffold `--once` | PASS; `.riv` unsigned228bytes, artboard/SM padrão vazios |
| Scaffold headless `--screenshot --advance=1` | PASS; PNG500×500 inspecionado, fundo vazio esperado |
| Exemplo oficial `rml_triangle --verify/--once` | PASS; zero erros/warnings, `.riv`394621bytes (inclui fonte do exemplo) |
| Exemplo headless frames1 e30 | PASS; PNGs inspecionados, geometria realmente rotacionou |

Preservadas duas tentativas de flags incompatíveis: `--once --screenshot` exit2 e `--screenshot --format=json` exit2. Referência oficial exige modos separados e JSON somente em verify/once/publish/test; chamadas corrigidas, sem editar produto/binário ou ocultar tentativas. Exemplo/PNGs temporários não versionados: **não são Gika, não provam face rig, fidelidade ou performance da personagem**. Não emitir `RIVE_AUTHORING_TOOL_UNAVAILABLE`: autoria local agora comprovada.

Limitação concreta do fluxo SVG: documentação instalada `docs/assets.md` informa que `SVGAsset` é editor-only/stripped na exportação RML; é necessário converter vetores em shapes RML antes da compilação. Não basta anexar um SVG para obter um rig. Nenhum segundo converter/engine/abstração criado antes de existir master fiel.

### Licença/custo — bloqueio da decisão de runtime

Fontes oficiais consultadas nesta retomada:

- [Pricing](https://rive.app/pricing): “Free exports play a Rive splash screen. Upgrade to remove it.” Free$0 inclui Editor/CLI e exportação com splash; Cadet+ inclui exportação sem splash.
- [CLI getting started](https://rive.app/docs/cli/getting-started): autoria/build/preview locais sem login; `--publish` assina via API e `.rev` exige conta. Web rejeita scripts unsigned; arquivos sem scripts não têm essa restrição técnica.
- [CLI commands](https://rive.app/docs/cli/reference/commands): publicação limpa exige projeto vinculado a arquivo em workspace Cadet+; watermark aplica com ou sem scripts.
- [Overview](https://rive.app/docs/cli/overview), [downloads](https://rive.app/downloads), [agents](https://rive.app/docs/cli/agents), [examples](https://rive.app/docs/cli/examples) acessíveis. Announcement da comunidade retornouHTTP403; não usado como prova. URLs preliminares cli/commands e cli/ai-agents retornaram404; índice oficial apontou as URLs corretas acima.

**`RIVE_ZERO_COST_PRODUCT_BLOCKER`**: uso final sem splash por exportação/publicação oficial não atende R$0 no plano informado. Aceitação humana do splash Free foi solicitada e ainda não recebida; não assumir aceite. A restrição de assinatura não se aplica tecnicamente a builds locais sem scripts, mas isso **não comprova uma exceção de licença/publicação sem splash**. Não usar unsigned como bypass de watermark. Nenhuma assinatura/billing/trial/conta Rive criada, login/export `.rev`/`--publish`/upload executado ou splash removido. Não afirmar que uma exportação Free real foi testada: falta conta/arquivo assinado para essa prova.

Alternativas sem cobrança: manter autoria/preview locais e adiar runtime; ou usar exportação Free com splash após aceite explícito e validação da exportação. SVG estático fiel, quando houver master, pode servir apenas como fallback previsto: não substitui o requisito de rig/motion real. Nenhuma troca de tecnologia autorizada ou realizada.

### Estado e verificação desta retomada

Somente referência, visual lock e documentação/estado/tarefas alterados; package/lock/runtime/UI/domínio/Auth/policy/Rules/commands/receipts/persistência intactos. Verificação focal: igualdade binária/hash/formato, links locais, YAML e estados blocked, diff whitespace e escopo exclusivamente documental. Gates completos anteriores continuam **históricos**, não reexecutados nem apresentados como validação de personagem; o plano exige nova bateria após integração real. Asset QA, Rive state inputs, avatar/fallback, idle+blink, React/lazy/cleanup/30aberturas/performance e matriz de personagem permanecem não executados porque não existe asset/rig da Gika.

Decisão preservada: **M9_BLOCKED_CHARACTER_ASSET_REQUIRED**, com bloqueio adicional `RIVE_ZERO_COST_PRODUCT_BLOCKER`. Visual lock e tool probe concluídos não são Character Foundation concluída. Não declarar VECTOR_ASSET_HUMAN_REFINEMENT_REQUIRED ou VISUAL_IDENTITY_DRIFT sem uma tentativa visual que os demonstre. Próxima ação: decisão de splash/licença, seguida de master fiel/rig e gates reais no M9 existente. Checkpoint documental e backup somente feat/gika-integration; verificar igualdade local/origin e worktree limpo ao encerrar.

### Autorização posterior — Free/Cadet e ensaios visuais

Entrada `78f03ea79fa10b5a0c570d78ca057671a2139773`, fetch/local/origin iguais/worktree limpo. Usuário autorizou Rive Free durante **toda** criação/rig/animação/validação; splash permitido somente no desenvolvimento. Exportação final sem splash obrigatória; Cadet autorizado após asset/rig integralmente aprovados. ADR024 registra essa condição. **RIVE_ZERO_COST_PRODUCT_BLOCKER não bloqueia mais desenvolvimento.** Não criar conta paga/assinatura/trial agora; não mudar tecnologia. Histórico anterior acima permanece verdadeiro para o checkpoint anterior, não é a decisão atual.

Autoria auxiliar tentou reconstrução vetorial a partir da própria imagem, não geração de outra personagem. Ferramentas existentes Potrace1.16/Inkscape1.4/Pillow/SciPy, sem instalar dependência no Leve. Crop de investigação `(0,108)–(362,655)` da pose principal; JPEG original intocado. Máscaras/quantização/tracing e SVGs candidatos só em `/tmp`. Dois renders reais inspecionados lado a lado com a referência:

| Ensaio | Estrutura observada | Gate visual |
| --- | --- | --- |
| [01](character/qa/rejected-vectorization-01.png),48cores |48paths por cor,4669contornos,24301segmentos Bézier,1104623bytes SVG | FAIL: lacunas claras em rosto/contornos, fragmentação do cabelo/roupa, partes da vista vizinha na borda; zero grupos anatômicos de rig |
| [02](character/qa/rejected-vectorization-02.png),36cores/limpeza |35paths por cor,1488contornos,10804segmentos,480558bytes SVG | FAIL: menos ruído mas ainda lacunas, perda de definição/contornos e contaminação lateral; olhos/pálpebras/bocas/membros/mecha não separados de forma útil |

Semântica por cor não é semântica anatômica. Converter um desses traces em RML/.riv não resolveria face rig, pivôs, massas do cabelo ou membros ocultos; inventar essas formas violaria fidelidade se não houver revisão manual. Inspeção **não** demonstra incapacidade absoluta de ferramentas vetoriais: demonstra que a reconstrução testada não atende o master exigido. Registrado **VECTOR_ASSET_HUMAN_REFINEMENT_REQUIRED**, conforme seção5 do plano fornecido, sem aceitar auto-trace automaticamente como produto. Previews de QA deliberadamente rotulados como rejeitados, não assets/fallbacks oficiais; SVGs reprovados não são versionados como `gika-master.svg`. Sem rig/controlador/integracão sobre master reprovado.

Inkscape emitiu warnings ambientais PangoFT2FontMap/GtkRecentManager, exit0 e dois PNGs efetivamente produzidos; reprovação acima é visual/estrutural, não atribuída a esses warnings. Nenhuma chamada Gemini/Rive publish/login/assinatura, script desconhecido ou identidade reinterpretada. Mantidos Rive e layout funcional do Leve.

Verificações focais nesta execução: referência byte a byte/hash original, PNGs válidos, links locais, YAML/estados, whitespace e diff somente docs/QA/estado. Produto/manifest/lock/domínio/Rules/API/commands/UI intactos; não repetir537unit/252integration/100Gika nem chamá-los de novos PASS. Estado **M9_BLOCKED_CHARACTER_ASSET_REQUIRED**, detalhado por VECTOR_ASSET_HUMAN_REFINEMENT_REQUIRED; T3/T4 continuam blocked. Próximo passo é refinamento manual fiel do master a partir da referência, seguido de idle+blink real e gates previstos. A decisão Free/Cadet já está resolvida, não requer nova autorização entre etapas gratuitas.


## Reavaliação híbrida — raster em camadas, meshes e bones

Entrada `1ec660b91da296bd15b021207de78815fe6c7bbb`; feat/gika-integration, fetch/local/origin iguais/worktree limpo. Pedido posterior manda investigar busto fiel e não vetorização integral automática. Nenhum trace novo, nova personagem, geração de pixels ou assinatura realizada. **A reprovação dos dois traces permanece; a inferência de bloqueio humano definitivo/obrigatoriedade de SVG integral é superada (ADR025).**

### Suporte oficial e prova executável

Documentação oficial [meshes](https://rive.app/docs/editor/manipulating-shapes/meshes) descreve deformação de imagens raster por malha/bones; [bones](https://rive.app/docs/editor/manipulating-shapes/bones) inclui deformação de mesh raster. Documentação instalada do CLI1.3.0 (`assets.md`, `rigging.md`, `drawing.md`, `transforms.md`) confirma ImageAsset PNG embutido, Image/Mesh/Skin/Tendon/Weight. Não depende do fluxo SVGAsset editor-only ou de converter milhares de paths.

Fonte: [JPEG intacto](character/reference/gika-approved-reference.jpg), mesmo SHA256 registrado acima. Busto neutro da prancha, crop `(365,377)–(454,481)`, **89×104** nativos. Máscaras manuais dos pixels visíveis partitionam o retrato em12PNGs transparentes; RGB visível preservado, nenhuma pintura/inpainting/upscale/auto-trace. Alfa é extraído do JPEG achatado, não alfa original do ilustrador. RGB de pixels totalmente transparentes zerado para comprimir, sem mudar pixels visíveis. Fonte/hashes em [extraction.json](../../assets/gika/source/hybrid-bust/extraction.json).

Artefato real: [scene.rml](../../assets/gika/rive/hybrid-bust-spike/scene.rml), [build .riv](../../assets/gika/rive/hybrid-bust-spike/gika-hybrid-bust-spike.riv) e [comandos de reprodução](../../assets/gika/rive/hybrid-bust-spike/README.md). **Sem scripts, player, controller ou importação no produto.** Oito artboards são Rest/Idle/BlinkProbe/OcclusionStress × light/dark, não oito estados semânticos prontos. Cada busto:12imagens/12meshes/8bones/108vértices/96triângulos; dois tendons por mesh, pesos somam255. Doze assets PNG compartilhados, sem milhares de paths. Build local unsigned71651bytes, SHA256 `ca9bba7320cb6bce8f0aba041be68a3178061a178d308726fb2222e17a580bbc`. Não representa licença/export final sem splash; ADR024 preservada.

| Prova executada | Resultado/limite |
| --- | --- |
| CLI verify/once; inspect final | PASS,0erros/0warnings/0problems; build versionado byte-idêntico ao renderizado em investigação |
| Rest vs PNG fonte, light/dark | RGB MAE no foreground0,034218/255; erro máximo1nível de arredondamento, preservação fiel da fonte recortada |
| Controle causal sem Skin/Weight, mesmas animações | Sem skinning vs Rest:0pixels diferentes >1nível; com skinning vs controle:4649. Bones/meshes realmente movem o raster |
| Idle4s loop/microgestos | Captura real frame60, light/dark; rosto/mecha/silhueta preservados na inspeção. Não é observação humana prolongada nem aprovação final |
| Blink frame48 | **FAIL**:176pixels do olhoL+152doR expõem fundo por ausência de pele. Não é blink final aceitável |
| Stress frame60, movimento acima do idle | **FAIL diagnóstico**:77pixels interiores expostos, bboxlocal13,10–77,96. Demonstra underlap necessário, não atribuir todos a uma única região ou ao movimento final |
| Mecha no lado anatômico esquerdo | ROI de matiz roxa permanece viewer direita; centroidesX70,30/70,28/70,31/69,36 nos quatro ensaios, eixo facialX50. Nenhum espelhamento |
| Captura em largura64px, dark | Identidade legível; halo claro de matte JPEG ainda requer limpeza. Fonte89×104 não prova acabamento HD240px |
| Bench600frames, nativeCLI89×104 | Advance mean0,012ms/p950,022; render mean1,997ms/p952,354/max18,319. Não mede heap/browser/React/lifecycle/player final |

[Comparação visual real](character/qa/hybrid-bust-comparison.png) amplia3× por nearest para revelar defeitos; [captura64px](character/qa/hybrid-bust-rest-64-dark.png) mostra escala pequena. Fundos light `#fff9f3`/dark `#24212d` são QA, não mudanças de tokens do Leve. Resultados/primeiras tentativas em [proof.json](../../assets/gika/rive/hybrid-bust-spike/proof.json).

Primeiras tentativas preservadas: inspect inicial14warnings editor-only (overlap de artboards/estados e styles ausentes); corrigidos posicionamento/styles, inspect final0problemas. Ao portar o source ao repositório, primeiro verify falhou12arquivos ausentes porque ImageAsset usa atributo `file`, não `path`; paths relativos corrigidos, verify/build PASS. Não são defeitos do adapter/domínio nem motivo para omitir execução inicial.

### Camadas disponíveis versus pixels ocultos

Todas as12camadas visíveis existem no ensaio: eyeL/R, browL/R, mouth_neutral, signature_purple_curl, face_visible, neck_shoulders_visible, hair_front/back_visible e side_curlsL/R_visible. Nomes LEFT/RIGHT seguem anatomia. São recortes da pose neutra, não camadas originais plenamente sobrepostas.

| Camada/ajuste necessário | Lacuna factual e trabalho localizado |
| --- | --- |
| `face_base_clean` | Pele por trás de olhos/sobrancelhas/boca não aparece nesta pose achatada. Partições removem641pixels somados (328olhos/172brows/141boca); reconstruir somente backing compatível, não outro rosto |
| `lid_L_closed`, `lid_R_closed` | A prancha tem olhos fechados em outras expressões; faltam texturas separadas/registradas na perspectiva neutra. Derivar esses detalhes da referência e validar sobre backing limpo; escalaY do olho isolado não resolve |
| Mouth variants / brow motion | Sorrisos/bocas/expressões existem na prancha, mas não são sprites intercambiáveis registrados. Máscaras/registro podem reutilizar os pixels; movimentos que revelem skin exigem backing local. Não segundo parser nem face genérica |
| Hair back/front, side clusters, purple curl | Visíveis já separados, skinning real; faltam estreitas bordas sob as partes sobrepostas ao deslocá-las. Reconstruir/pad apenas underlap necessário, preservar volume e lado da mecha |
| Neck/shoulders | Pescoço oculto pelo queixo e ombro/cabelo não tem pixels completos. Criar overlap mínimo compatível para inclinação, sem rig corporal universal |
| Upper arms / gestures | Não estão visíveis no crop neutro abaixo dos ombros. Outras poses aprovadas fornecem referências para artboards adicionais; não afirmar braços independentes prontos nesta perspectiva. Sem gesto amplo obrigatório no primeiro busto |
| Matte/resolução | JPEG claro produz halos; limpar alfa de borda sem recolorir identidade. Superfícies atuais usam marcas36–64px; não extrapolar crop89×104 como master240px/fullbody. Avaliar referência maior/pose adicional se ampliação for necessária |

Reconstrução de pixels ocultos é trabalho artístico localizado; seleção de máscaras, registro e mesh são trabalho de authoring já factível. Não demonstramos que tudo exige ilustrador externo, nem aprovamos preenchimento automático. O pipeline tecnológico **é suficiente para rig híbrido de busto**; a imagem achatada, sem essas camadas, **não basta para todos os motions finais**. Não emitir bloqueio humano definitivo a partir da ausência de SVG integral.

### Escopo real dos estados

- Idle: microgestos e raster skinning comprovados; matte/QA prolongado ainda necessários.
- Blink/listening: blink requer backing/lids; listening pode usar atenção/microtilt no mesmo rig, mas estado semântico/controller ainda não implementado.
- Thinking/clarify/success/error: usar brow/mouth variantes da própria identidade e backing; não declarados produzidos. Success continua dependente de ack real, nunca narrativa do modelo.
- Offline: pausa/fallback fiel do mesmo busto é compatível; reduced motion/cleanup/integração não provados neste ensaio.

Sem ampliar escopo corporal: gestures/artboards aprovados só se realmente necessários. Sem personagem improvisada CSS/SVG, player sem consumidor, dados privados no rig ou mudança de tecnologia.

### Decisão atual e gates proporcionais

**M9_IN_PROGRESS_CHARACTER_HYBRID_BUST**, não M9_DONE_RC_READY. M9-T3 in_progress; T4 blocked para aceite RC. CHARACTER_ASSET_REQUIRED permanece apenas para acabamento/QA final; inferência VECTOR_ASSET_HUMAN_REFINEMENT_REQUIRED como condição definitiva é retirada. Próximo trabalho localizado descrito acima; repetir idle+blink antes de runtime/controller/estados e gates completos.

Só assets autorais não consumidos, QA e documentação/estado mudaram. Produto/UI/Auth/commands/policy/Rules/receipts/manifest/lock byte-idênticos à entrada. Gates atuais: verify/once/inspect, prova RGB/partição/hashes/skinning, capturas reais light/dark/64px, links/YAML/whitespace e guard arquitetural existente.537unit/252integration/100Gika anteriores continuam históricos, **não reexecutados nem usados como PASS de personagem**. A bateria completa permanece exigida após integração real. Sem login/Rive publish/assinatura/Cadet/live/Gemini/credencial/PR/main/deploy. Backup somente feat/gika-integration.


## Hybrid Bust v2 — verificação da nova fonte, autoria ainda não iniciada

Entrada `cca1a01508f949589e70d3bc412635a35ab2e52e`; branch feat/gika-integration, worktree limpo e fetch/local/origin iguais. Spike aprovado apenas como direção técnica. Pedido exige PNG original de alta qualidade, reconstrução localizada não generativa e nenhuma integração antes do QA.

| Arquivo | Formato efetivo / resolução / bytes | SHA256 |
| --- | --- | --- |
| Referência histórica/spike v1 | JPEG1280×960 /223809 | `f2fd8858087f663c473586e79445af8d837fc00296b88215e6975941828b8b05` |
| [Nova prancha recebida](character/reference/gika-authoring-v2-received.jpg) | **JPEG1280×720** /186821 | `5d91424e00842b2df08515caeba4bb9426bb377fad7bc6520890d865f16efb22` |

Identificação por Pillow e assinatura binária `FF D8 FF E0`, não apenas extensão. Novo anexo preservado byte a byte; original histórico, fontes PNG extraídas v1 e RML/.riv v1 intactos. Os arquivos são diferentes; não tratar como a mesma imagem reencodificada. Nova prancha é referência visual fornecida pelo usuário para v2, sem alterar identidade/Visual Lock. Porém o **arquivo PNG original descrito não foi recebido**. Converter esta JPEG para PNG não recuperaria pixels/perda de compressão.

Inspeção real do crop neutro `(365,319)–(456,409)`91×90px, ampliado4×nearest apenas em/tmp, confirma raster pequeno; crop v1 era89×104. Não houve ganho demonstrado de resolução nativa. Não declarar insuficiência definitiva de toda a tecnologia ou necessidade de redesenho a partir disso; a fonte de alta qualidade solicitada ainda falta para essa avaliação.

**SOURCE_ORIGINAL_PNG_REQUIRED** para executar v2 conforme pedido. Isto é pendência de arquivo de entrada, não VECTOR_ASSET_HUMAN_REFINEMENT_REQUIRED. Ainda não se pode determinar qual camada exige redesenho manual mesmo com o PNG original. As lacunas já demonstradas no v1 permanecem localizadas: face_base_clean sob olhos/brows/boca, closed lids registrados, underlap cabelo/mecha/queixo/pescoço e matte. Nenhuma camada v2 foi inventada ou declarada pronta.

Próxima ação: receber PNG original (preferencialmente dentro de ZIP para preservar formato/bytes), verificar hash/resolução e repetir a autoria/QA. Não continuar com uma fonte comprimida fingindo que a substituição por alta qualidade ocorreu. Não integrar produto, listening/thinking, Controller ou React neste checkpoint. Sem inpainting generativo, novo personagem, nova decisão arquitetural/fase, dependência, login/publish/Cadet/Gemini.

Gates desta verificação: formato/dimensões/hash/binário da fonte e cópia idêntica, comparação visual do crop, YAML/links/diff. Não executar ou declarar QA v2 rest/idle/blink/stress nem gates de produto sem autoria/integração. M9-T3 continua in_progress na mesma tarefa, aguardando fonte; T4/RC permanecem não aprovados.


## Hybrid Bust v2 — fonte correta, backing/lids e QA da mecha permanente

Entrada `6f88e0fcd44e275f235804a1556b2771e8a1d18b`, feat/gika-integration/worktree limpo, local/origin iguais antes da autoria. ZIP fornecido pelo usuário contém PNG RGB1672×941,2183940bytes. [Original primário para autoria](character/reference/gika-authoring-v2-original.png) preservado byte a byte, SHA256 `2aea8b3141c195d9f7ce1851a21d5baa618ad78079dbd2295649168cbf9e2fba`. JPEG histórico `f2fd8858…`, JPEG recebido `5d91424e…` e spikev1 permanecem intactos. **SOURCE_ORIGINAL_PNG_REQUIRED resolvido**, sem confundir conversão JPEG→PNG com este arquivo original.

Pedido proíbe integração no produto e inpainting generativo. Reutilizado source RML v1/CLI1.3.0, ferramentas de autoria existentes Pillow/NumPy/SciPy, nenhuma dependência do Leve adicionada. [Fonte/metadata](../../assets/gika/source/hybrid-bust-v2/extraction.json), [author.py](../../assets/gika/source/hybrid-bust-v2/author.py), [RML](../../assets/gika/rive/hybrid-bust-v2/scene.rml) e [Rive real](../../assets/gika/rive/hybrid-bust-v2/gika-hybrid-bust-v2.riv) reproduzíveis. Crop neutro `(477,417)–(596,534)`,119×117nativos; canvas135×133 inclui8px transparentes para movimentos não cortarem cabelo. Não houve upscale na autoria.

### Reconstrução localizada

- `face_base_clean`:1202pixels ocultos sob olhos/brows/boca; inicializados pelas cores de pele adjacente **da mesma face** e relaxação harmônica somente nessas máscaras. Nenhuma outra fisionomia/pintura integral/ML. As features originais opacas cobrem o backing no rest; RGB visível preservado, à exceção do tratamento de matte na silhueta.
- `lid_L_closed`/`lid_R_closed`: lashes da expressão aprovada **Carinhosa**, cropdoador1413,417–1532,534. Máscaras fechadas e affine registrada nos olhos neutros, parâmetros em metadata. Decontaminação local de borda usa a pele da doadora, sem copiar cabelo/mãos/rosto completo. Olhos abertos contraem durante fechamento e lashes aparecem sobre backing; idle também contém blink de4sloop.
- Underlap oculto de até3px em hairback (1471pixels),2px front/side (114/32/26),4px pescoço (69). Apenas regiões já cobertas por camada superior opaca no rest; não pinta ombro/camisa expostos. Nenhum novo cacho/mecha ou expansão da silhueta para esconder falha.
- Matte:623pixels de borda de1px têm contribuição do fundo removida com cor interna adjacente/alfa; espaços claros neutros fora de rosto/camisa ficam transparentes. Preservados espaços negativos naturais entre contornos dos cachos; não chamar todos de buracos de rig.

### Visual Lock corrigido e QA da assinatura

Ordem atual: pose principal grande→Detalhes da mecha→busto neutro→turnaround geometria→secundárias somente expressão/gesto. Ausência em pose secundária é artefato, não design. Mecha permanente anatômica esquerda quando exposta; oclusão natural respeitada. Master não é substituído pela pose doadora. Neste busto frontal o lado está exposto; [guard QA](../../assets/gika/rive/hybrid-bust-v2/qa.py) verifica assinatura durante transições e pequenos tamanhos, além de rosto/pescoço.

A nova revisão encontrou118pixels canônicos do roxo do cabelo fora da camada própria. Normalizada a máscara da **mecha já existente**, isolando-a antes de olhos/rosto.415/415pixels canônicos agora pertencem a `signature_purple_curl`;0fora,0gerados, sem recolorir outros cachos. Pálpebras transplantadas não importam cabelo nem ausência da mecha. Centroides na ROI roxa X102,23–107,12, à direita do eixo facialX73 em todos52frames;48capturas pequenas também preservam sua presença. Não representa QA de vistas não autoradas nem obrigação de forçar mecha naturalmente oculta.

### Primeiras inspeções e correções preservadas

1. Primeiro render compilou mas **FAIL visual**: padding de pele vazou no ombro no rest. [Captura rejeitada](character/qa/hybrid-bust-v2-rejected-underlap.png) retida; underlap limitado ao que outra camada realmente cobre.
2. Stress mostrou fragmentos da camisa seguindo cabeça por classificação residual como cabelo. Pixels claros existentes foram atribuídos à camada de corpo/pescoço do asset, sem redesenhar roupa.
3. Padding por trás de alfa parcial alterou rest até79níveisRGB em light. Restringido a cobertura opaca; finalerro máximo2 de arredondamento na renderização antialias, não esconder diferença com repaint/threshold de produto.
4. Gate novo da mecha revelou ownership parcial conforme descrito acima; corrigido por máscara/ordem de extração, sem nova mecha. Todas as capturas finais foram refeitas após a correção.

### Gates do ensaio final

| Gate efetivamente executado | Resultado |
| --- | --- |
| PNG fonte/hash/proveniência e regeneração de14camadas/RML | PASS, byte-idênticos; script usa fonte hash-pinned e RML v1 |
| CLI verify/once/inspect no source final | PASS;0erros/0warnings/0problems; oito artboards diagnósticos, sem ScriptAsset |
| Build |95307bytes; SHA256 `cfe4161700a368875464389471e731253c7f17b3e183aa6c6d5b00af8dab672b`; idêntico ao renderizado, unsigned/local |
| Rest vs PNG matte tratado | MAElight0,03897/255,dark0,03035; max2; somente1/2pixels acima de1nível. Fonte não foi substituída por outra face |
| Faces/neck sob transforms de rest/idle/blink/stress |52frames light/dark,0pixels de fundo no interior erodido do rosto transformado/seam do pescoço; transições de blink incluídas |
| Pequenos tamanhos |48capturas24/32/36/48/64/72px, quatro ensaios×duas cores; assinatura presente em todas |
| Inspeção visual real | [Comparação](character/qa/hybrid-bust-v2-comparison.png), [tamanhos reais](character/qa/hybrid-bust-v2-small-sizes.png), [sequência](character/qa/hybrid-bust-v2-blink-sequence.png), [APNG de frames Rive reais](character/qa/hybrid-bust-v2-blink-motion.png); rest/idle/blink PASS como QA autoral, stress sem exposure no rosto/pescoço |

QA mede regiões semânticas: espaços negativos naturais entre os cachos não são classificados automaticamente como falhas. Não promete rig corporal universal. Artefatos/primeiras tentativas em [proof.json](../../assets/gika/rive/hybrid-bust-v2/proof.json), medições/casos em [qa-results.json](../../assets/gika/rive/hybrid-bust-v2/qa-results.json), comandos de reprodução em [README](../../assets/gika/rive/hybrid-bust-v2/README.md). Rodada final100capturas após normalização da mecha PASS; reprodução completa adicional100capturas em diretório temporário novo PASS, exercício do guard autoral versionado, não repetição para ocultar falha.

**HYBRID_BUST_V2_AUTHORING_QA_PASS.** Resolução suficiente para as superfícies pequenas testadas; nenhuma camada demonstrou necessidade de redesenho manual nesse escopo. Não declarar HD240/fullbody, todos os estados semânticos ou aceite humano integral do rig. Listening/thinking e estados restantes ainda pendentes; nenhum Controller/React/SDK/runtime/public/UI integrado neste pedido. M9-T3 continua in_progress e M9/RC não concluídos.

Somente autoria/QA/referências/docs/STATE/TASKS/EVALS alterados. Produto/Auth/commands/policy/Rules/receipts/persistência/manifest/lock/spikev1 intactos. Guard arquitetural existente, links/YAML/whitespace/mesh/weights/hashes validados; regressões técnicas históricas537/252/100 não reexecutadas nem chamadas de PASS de personagem. Gates completos de produto continuam exigidos após integração autorizada. Sem generativeimage/Gemini/live/login/Rivepublish/Cadet/billing/PR/main/deploy. Free/Cadet condicionado à aprovação integral/export final conforme ADR024.


## Character essencial — rig aprovado como direção e integração progressiva

Entrada `aa7690ffdb8eb81c5aa5ececcb65d6e1fecae125`, feat/gika-integration, fetch/local/origin iguais e worktree limpo. O pedido atual autoriza nove estados e integração, sem celebrações/gestos adicionais. [Rig reproduzível](../../assets/gika/rive/essential-bust/README.md), [estados](character/qa/essential-states.png), [movimento de frames reais](character/qa/essential-motion.png), [painel desktop](character/qa/essential-product-desktop.png), [mobile dark](character/qa/essential-product-mobile.png) e [200%](character/qa/essential-product-zoom200.png).

### Entrega e limites

Uma artboard transparente `GikaEssential`, state machine homônima e ViewModel numérico `GikaVisual.mode`: rest0, idle1, blink2, listening3, thinking4, clarify5, success6, error7, offline8. Reset explícito de propriedades impede poses/pálpebras residuais. Idle inclui blink; success é aceno discreto, sem comemoração. CLI oficial1.3.0, 14meshes/10bones, sem scripts/listeners/URLs externos. RIV51586bytes/SHA256 `18295a0cc8a4b9095d235209ae20ca4c35cb796605aa48828fe9c28c0668dc0e`.

As14PNGs aprovadas permanecem byte-idênticas; fonte original hash2aea8b31 e crop119×117 preservados. Nenhum novo rosto/cacho/mecha, pintura generativa ou vetorização. QA144frames nativos+108pequenos, nove estados/light/dark24–72px, rest erroRGB máximo2/255, zero exposição no interior do rosto/seam do pescoço; mecha na direita visual do busto frontal em todos os frames. Asset pequeno, sem alegação HD240 ou rig corporal.

Controller recebe apenas fatos técnicos, sem texto/draft/IDs/áudio ou autoridade de mutação. Listening vem de captação real; thinking de request/execução pendente; clarify de resultado estruturado; success somente de ACK validado existente. Narrativa de criação não gera success, resultado parcial não gera comemoração. Context visual local notifica a mesma UI de confirmação/recorrência/batch depois dos checks existentes, sem mudar qualquer efeito executável.

SDK oficial Canvas2.44.0 pinado, único pacote novo e sem transitivas. Consumidor real lazy, WASM/RIV same-origin; nenhum CDN/fallback remoto. PNG fiel inline no chunk já lazy da Gika, geometria fixa; falha de asset/runtime conserva composer. Perfil e sistema reduced-motion usam estático; offline estático, hidden/close limpam renderer/RAF/ResizeObserver. Reabertura não envia nem executa nada.

CSP anterior foi testada no browser com o renderer real: WASM exige `wasm-unsafe-eval`; decoder das imagens embutidas exige `img-src blob:`. Bloqueio real `CSP_IMG_BLOB_BLOCKED` reproduzido antes da correção mínima. Depois, teste sob a CSP exata de vercel.json pinta todos os nove modos e verifica diferenças entre poses. Não foi adicionado JS unsafe-eval, origin externo, header privado ou nova permissão de microfone.

### Responsividade, a11y e performance observadas

[Dados sanitizados](evidence/character-essential-integration.json): seis viewports390×844/853×1280/1024×768/1366×768/1920×1080/2560×1440 em light/dark, 200%, reduced motion, página oculta, falha/offline e close/reopen. Sem overflow horizontal; composer, navegação e timer preservados. Personagem decorativa aria-hidden; estados funcionais continuam no texto/live region existente, sem narração redundante. Axe nas superfícies Gika/voz/preview e shell conforme gates abaixo.

Zero downloads RIV/WASM antes de abrir painel; fallback/renderer ocupam exatamente56×56desktop,48mobile. Primeiro frame504–931ms local; sem promessa em rede/dispositivo real. Bootstrap estático completo:1219739→1220097bytes (+358); gzip363995→363409. Runtime210823bytes/gzip60270,WASM1992302 e RIV51586 ficam fora do bootstrap. Redistribuição automática dos chunks não deve ser confundida com aumento integral do JS inicial; warning500KB já existente nas duas bases.

20reaberturas observadas mais60ciclos com GC: heap32,89→33,04→32,84MB aos20/40/60, backing23,498MB estável; RAFzero depois de close/hidden. Evidência de ausência de crescimento monotônico nessa amostra, não garantia universal contra leaks/dispositivos. Sem áudio/Gemini/log de transcrição/persistência privada/telemetria de personagem.

### Primeiras execuções preservadas

- Primeira integração concorrente ao focal: conflito de porta de emulador, falha operacional; retry com emuladores novos252/252PASS.
- Primeiro Character focal2PASS/1FAIL: teste exigia canvas retido após import abortado; ErrorBoundary corretamente mantinha PNG e composer. Corrigida apenas observação do fallback real. Segunda Character+voz10/10PASS.
- Pattern inicial `gika*.spec.ts` selecionou apenas14casos:13PASS/1FAIL seletor antigo do ícone de header removido intencionalmente. Atualizado para personagem, mantendo cardinalidade.
- Amplas Gika e shell iniciadas simultaneamente compartilharam test-results: arquivos trace desapareceram no browserContext.close. Shell16/1ENOENT; Gika36PASS/2ENOENT/1interrompido/65não executados. Interrupção deliberada preservada, causas técnicas de artefato comprovadas. Nenhuma deadline/retry alterada; gates seguintes serializados.
- Primeira ampla serial contém falhas M8 antes de abrir painel: fixture deixa duas pendentes de hoje de outros cenários e adiciona quatro, superando cap5. Comparação com entrada e execução focal fresh registradas abaixo quando concluídas. Não chamar essa ampla verde nem modificar policy para fazer o fixture passar.

### Licença e revisão

Rive local unsigned/scriptless é artefato de desenvolvimento/revisão. Não é prova de export final de produção licenciado sem splash, nem bypass de plano comercial. Free no desenvolvimento e Cadet somente após aprovação integral do asset/rig conforme ADR024. Esta entrega para na revisão dos nove estados; M9/RC continuam não concluídos até esse aceite/export final. Sem gestos extras, novo milestone/closure, Rivepublish/Cadet/login/live/deploy/PR/main.

### Feedback visual intermediário do usuário

Após integração técnica em andamento, a composição foi explicitamente **não aprovada como design final**: busto central pequeno/recorte colado/espaço vazio e duplicação do header. Gate registrado no Visual Lock: presença adaptativa, busto expressivo idle, meia-altura quando semanticamente pertinente, escala/hierarquia, enquadramento natural e limpeza de halo/corte. Não compensar por upscale de raster pequeno nem redesenhar painel/identidade. Capturas de produto documentam a implementação técnica em revisão, não aceite final. Testes face/neck/purple-curl não substituem QA humano de cabelo/ombros/camiseta/enquadramento. M9-T3/Character seguem in_progress por esse acabamento e T4/RC blocked; estados essenciais/Controller preservados.

### Diagnóstico de regressão e ajuste mínimo após feedback

Primeira ampla serial104:95PASS/9FAIL em21,3min, nunca declarada verde. Sete M8 falham em fixture/antes de abrir Gika: dois cenários de complete deixam duas tarefas de hoje, fixture M8 cria quatro e o hint corretamente rejeita seis acima de cap5. Entrada aa7690ff em cópia byte-idêntica, processos/emuladores novos, sequência conventional-edit + logout-complete + M8 reproduziu o mesmo count6/hint ausente. Comparação5casos:4PASS/1FAIL esperado na fixture M8; update-logout/voice-reconnect passaram nessa comparação.

Logout amplo falhou por pointer intercept do launcher sobre Sair no footer com26pendentes. Diagnóstico na entrada, sem Character/SDK, usando26criações convencionais sintéticas e o mesmo open/pending/close: hit-test real do centro de Sair encontrou o launcher, bboxY637–684. Confirma defeito preexistente do launcher/footer sob agenda longa; não foi corrigido fora do escopo nem classificado como funcionamento correto. Primeira tentativa desse diagnóstico foi interrompida por cwd direcionando edição à cópia temporária; restaurada byte a byte antes da prova válida. Não houve alteração da base de produto por essa tentativa.

Voz ampla51,6s falhou em reabilitar o botão após reconnect, sem command/request extra observado no cenário. Focal nova e entrada nova passaram; **NOT_REPRODUCED**, causa física não atribuída a latência/baseline. Sem correção especulativa em offline/Auth/voz. Focal clean posterior Character4+M8sete+update-logout+voice-offline:13/13PASS em2min. Todos os guards de domínio/segurança e deadlines/retries mantidos.

Feedback visual acionou correção local de duplicação: uma única instância/presença da personagem, no centro enquanto conversa vazia, depois no header. Centro agora usa o mesmo idle/blink reais; header vazio usa o ícone Leve existente. Mesmas dimensões já usadas64/52centro e56/48header, sem upscale ou desenho novo; não é solução da escala/enquadramento final. Regressão focal existente exige um único ator e localização correta antes/depois de enviar. Busto expressivo grande/meia-altura, silhueta inferior natural/halo/cortes e aprovação da composição permanecem QA visual obrigatório; não declarar M9/Character concluídos.

### Gates finais desta integração técnica

| Gate | Resultado atual |
| --- | --- |
| Production audit omitdev/high e JSON |0critical/0high/0moderate, PASS |
| Lint + guard AST existente | PASS,47fontes; nenhum model/router/character → persistência/command |
| Typechecks web/server | ambos PASS |
| Build | PASS; warning de chunk já existente, métricas completas acima |
| Unit completo, após presença única |545/545PASS |
| Integração completa Auth/Rules/domain/commands/receipts |252/252PASS; backend/domain/Rules não modificados desde essa execução |
| Rive verify/once/inspect + captures |0errors/warnings/problems;252capturasPASS |
| Ampla Gika serial primeira |95PASS/9FAIL,21,3min; classificação/comparações acima, NÃO integralmente verde |
| Focal clean de diagnóstico |13/13PASS,2min; Character/M8/logout/voz |
| Depois de presença única |9/9PASS,1,4min; Character4, M8opt-in+Axe, reschedulepreview/ack desktop/mobile, voz → texto → envio consciente |
| Scroll/composer/uma personagem |1/1PASS,22,2s |
| Shell/responsive completo |17/17PASS,40s; Axe0 e seis larguras |
| Browser final manual |12combinações viewport/theme +200%; sem overflow/pageerror/overlay; reduced-motion estático; RAF0 fechado/hidden |

Última medição com uma presença: fallback e ready64×64desktop/52mobile, idênticos; primeira abertura1411ms local. Heap pósGC20/40/60ciclos32,88/33,34/33,42MB; crescimento0,54MB entre20e60, backing23,4995MB praticamente constante. A primeira amostra anterior foi estável; esta variação está registrada e não autoriza garantia de ausência universal de leaks. Zero RAF depois de close/hidden demonstrado tanto pelo teste quanto pela medição. Agent-browser CLI ausente: verificação equivalente usou Playwright já instalado, navegador real, conteúdo/elementos/overlay/pageerror/screenshot; nenhuma dependência adicional para tooling.

Arquivos protegidos server/packages/platform/identity/Rules sem diff; mesmas14camadas/fonte hash-pinned. Única dependência runtime oficial necessária, nenhuma nova coleção/writer/outbox/signer/policy/receipt engine. Screenshots históricos gerados restaurados e capturas descartáveis removidas. Testes novos cobrem risco novo real (apresentação/ACK/fallback/cleanup/CSP), não reimplementam a matriz funcional M0–M8. Não aumentados deadlines/retries nem removidas asserções de segurança.

**Integração técnica essencial entregue para revisão; COMPOSITION_NOT_APPROVED_ADAPTIVE_PRESENCE_QA_REQUIRED.** M9-T3 permanece in_progress pelo acabamento visual; T4/RC blocked. Uma presença corrigida não resolve nem aprova escala/busto grande/meia-altura/halo/ombros/enquadramento. Sem export final/licença sem splash neste checkpoint. Resultado anterior blocked e as falhas atuais/primeiras execuções permanecem explícitos; não declarar todos os gates E2E verdes.
