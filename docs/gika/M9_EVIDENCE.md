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
