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

Build antes: entry577,02KB gzip175,22; api Firebase chunk604,89KB gzip178,89; Three522,06KB gzip129,57 jálazy/condicional desktoppointerfine/no reducedmotion; GikaPanel53,71KB gzip14,31 lazy. Plugin de medição temporário /tmp atribuiu entry ReactDOM/Temporal/router/Zod e apiFirestore/Auth/RE2; Three renderer/core. Experimento mínimo de destructuring importThree reduziu só13bytes (gzip7), aumentou entry284bytes (gzip99); descartado/restaurado. Não criar divisão artificial sópara silenciarwarning; não alterar threshold. Índices API/core necessários offline/Auth/commands, converter para carregamento síncrono tardio mudaria arquitetura sem benefício demonstrado. Warning registrado como limite conhecido, panelpersonagemnão pesa bootstrap.
