# M8 — proatividade controlada

Entrada44b8928e26b0a01385efd6b2b5138f93fe5fdae6, feat/gika-integration local/origin/fetch iguais e worktree limpo. M7 aprovado; T1→T2 autorizado, Ponytail/full/Caveman/full/humanizer local aplicados.

## T1

Today já tem três querieslimit50 e flags loading/error/partial/cache. Nenhuma nova leitura. buildDailyBrief não reutilizado: conta eventos e inclui titles/descriptions/notas/TTS; seu comportamento permanece intacto. daySuggestion usa apenas facts de tasks pending/dueDate hoje, não deleted, seleção civil hoje; leitura carregada sem erro/partial, até150entries. Threshold4–5 respeita GIKA_BATCH_LIMIT5; mais5 não trunca/não sugere plano impossível. Somente esse caso é suportado, sem atraso/histórico/semana/humor inferido.

Fingerprint ordenado dia/ID/horário, sem título/notas/revision; edição cosmética não dispara insistência. Nenhum IO/model/commands/log/storage/timer na regra, guard unit. Cached autorizado existente pode gerar sugestão local, mas nunca request automático.

Primeiro lint PASS; primeiras tentativas build/typecheck FAIL por fixture incompatível com tipo Activity normalizado: disambiguation compatible não existe, dueTime/deletedAt obrigatórios ausentes. Corrigido somente fixture paraenumearlier/nulls, sem alterar domínio/asserções. Gates T1 finais lint/doisTS/build/533unit53arquivos PASS,11casos novos rule/boundaries/fingerprint/guard. Sem alteração servidor/commands/Rules/dependências; integração redundante não executada nesta etapa client-only. T2 segue automaticamente após commit T1.
