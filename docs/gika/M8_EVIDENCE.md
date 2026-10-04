# M8 — proatividade controlada

Entrada44b8928e26b0a01385efd6b2b5138f93fe5fdae6, feat/gika-integration local/origin/fetch iguais e worktree limpo. M7 aprovado; T1→T2 autorizado, Ponytail/full/Caveman/full/humanizer local aplicados.

## T1

Today já tem três querieslimit50 e flags loading/error/partial/cache. Nenhuma nova leitura. buildDailyBrief não reutilizado: conta eventos e inclui titles/descriptions/notas/TTS; seu comportamento permanece intacto. daySuggestion usa apenas facts de tasks pending/dueDate hoje, não deleted, seleção civil hoje; leitura carregada sem erro/partial, até150entries. Threshold4–5 respeita GIKA_BATCH_LIMIT5; mais5 não trunca/não sugere plano impossível. Somente esse caso é suportado, sem atraso/histórico/semana/humor inferido.

Fingerprint ordenado dia/ID/horário, sem título/notas/revision; edição cosmética não dispara insistência. Nenhum IO/model/commands/log/storage/timer na regra, guard unit. Cached autorizado existente pode gerar sugestão local, mas nunca request automático.

Primeiro lint PASS; primeiras tentativas build/typecheck FAIL por fixture incompatível com tipo Activity normalizado: disambiguation compatible não existe, dueTime/deletedAt obrigatórios ausentes. Corrigido somente fixture paraenumearlier/nulls, sem alterar domínio/asserções. Gates T1 finais lint/doisTS/build/533unit53arquivos PASS,11casos novos rule/boundaries/fingerprint/guard. Sem alteração servidor/commands/Rules/dependências; integração redundante não executada nesta etapa client-only. T2 segue automaticamente após commit T1.

## T2 — interação e primeira execução

T1 commit571b6bfe9b3d685ca8295de14b66d0e24b99f14f. Reutilizados panel/daily-brief, GikaMark, botões e padrão CustomEvent do tutorial. Today passa facts brutos, não optimisticStatus. Uma sugestão por vez, últimas8 dismissals em memória keyed UID; renomeação/revision não insistem, mudança real de task/time reavalia. Navegar/reload encerra contexto e pode reapresentar; não há persistência de dismissal/conversa ou execução automática.

Pedir sugestão apenas abre Gika e prepara texto editável; rascunho existente permanece. Nenhum request antes do envio manual. O pedido passa pelo adapter/M6 originais, preview/confirm pelo mesmo contrato batch e command layer; três receipts/acks reais no E2E e item preservado byte-equivalente. Clique inicial não confirma mutação. Offline mostra conexão necessária sem lazy panel/fila; reconectar não envia. UID estranho/logout rejeitam handoff; nenhum modelo/sugestão fala ou ativa microfone.

Primeiros gates T2 lint/doisTS/build/533unit/audit0 PASS. Primeira focal6/6 PASS53,8s; primeira regressão37/37 PASS5,8min (voz7, M1shell14, readonly6, organização10); shell/responsive/Axe17/17 PASS46,7s. Sem falhas omitidas/retry/deadline alterado. UI real Meu dia inspecionada por screenshots desktop1366x768 light e mobile390x844 dark; teclado/foco/reducedmotion/zoom200/Axe0/overflow0 comprovados. Nada de /demo novo, personagem, CSS override ou simplificação de tela.

Revisão encontrou defeito concreto novo: cancelar Suspense antes da importação lazy completar conservava handoff, e abertura comum posterior inseria pedido antigo. Adicionado somente teste reproduzível desse risco: primeira execução1FAIL (esperado draft vazio, recebido pedido antigo, deadline existente10000ms); não classificado como baseline. Correção mínima no launcher: close zera handoff, contador monotônico separado preserva identidade das próximas intenções. Primeira execução após correção1PASS10,2s; inclui duas novas intenções após fechamento. Nenhum comando/model extra ou draft do usuário apagado.

Integração server completa não repetida: nenhum server/domain/command/Rules/header/policy/Auth provider/receipts alterado. E2E usa emuladores demo, comandos convencionais reais e fixtures provider/confirmation atuais, sem credencial/Gemini live. Teste de voz não usa hardware. Logs/artifacts temporários não versionados; somente metadados/resultados sanitizados aqui. Limites: regra apenas hoje4–5 pending, >5 não truncado; contexto de dismiss montado/memória8; cache legitimamente disponível pode sugerir localmente, não provar completude do servidor offline; nenhuma mudança TTS convencional DailyBrief.

## Gates finais e encerramento

Após a correção: lint PASS; typecheck web/server e build PASS; 533/533 unit em53arquivos PASS; audit omitdev high e JSON PASS0 critical/0 high/0 moderate/0 total. Focal proatividade7/7 PASS1min; regressão crítica Gika37/37 PASS5,7min; shell/responsive17/17 PASS50,2s, incluindo viewports390/853/1024/1366/1920/2560, teclado/zoom/lightdark e Axe das superfícies. Gates finais todos verdes, primeira reprodução negativa preservada acima. Nenhum timeout/retry/asserção relaxado; sem live, mudança server/commands/Auth/Rules/dependências/harness. Artefatos históricos M1/auth gerados restaurados/removidos seletivamente, screenshots novos apenas /tmp. Revisão React e segunda revisão read-only confirmaram cancel/sequence/draft/UID/cleanup e nenhuma mutação automática.

M8-T1 e M8-T2 concluídos. M9 todo, Character/TTS/TQA/PR/main/deploy não iniciados. Commit funcional T2 inclui UI/testes/evidências/estado; checkpoint documental seguinte registra SHA funcional e backup somente feat/gika-integration. Confirmar igualdade HEAD local/origin e worktree limpo após push.

## Checkpoint M8

T1: `571b6bfe9b3d685ca8295de14b66d0e24b99f14f`. T2 funcional: `4799b833daeb37a4c2af4b1f810c9976434c5d81`; worktree limpo após commit, critérios/gates documentados. Este checkpoint é somente documental; publicar feat/gika-integration e verificar HEAD local/origin/ls-remote iguais/worktree limpo no encerramento. M8 done, M9 todo; aguardar revisão.
