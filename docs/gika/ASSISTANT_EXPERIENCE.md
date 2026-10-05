# Gika: interpretação, conversa e voz

## Contrato

Gika ajuda com agenda e organização pessoal. O propósito semântico distingue um pedido de
organização de uma pergunta de conhecimento geral; nomes de assuntos podem aparecer em
títulos de tarefas sem liberar respostas enciclopédicas. Não há blacklist por assunto.

Uma interpretação estruturada propõe domínio, intenção atual e ferramentas. Ela não é
uma autorização. O servidor valida schemas fechados, datas civis, cardinalidade, leitura
completa, alvo exato, identidade, membership, revisões e policy. Comandos continuam sendo
a única camada de escrita. Gemini não recebe acesso ao Firestore. Reagendamento, rotina e
lote continuam sujeitos aos contratos de prévia/HMAC já existentes.

A conversa anterior ajuda a resolver referências e campos faltantes. Não é fonte de UID,
ID, revisão, consentimento para confirmação ou sucesso de execução. Pedidos atuais explícitos
prevalecem. Um "sim" não substitui o botão de confirmação. Contexto projetado não inclui
IDs, tokens, receipts ou descrições privadas das atividades; só informação mínima de tarefas
já mostrada à pessoa, limitada a cinco itens por consulta. Continua sendo dado não confiável.

## Personalidade

PT-BR natural, calorosa e prática; respostas breves que acompanham o pedido. Perguntar apenas
o campo realmente ausente. Não repetir apresentação, não terminar todo turno com a mesma
pergunta, não julgar produtividade e não prometer automações inexistentes. Conversa social
breve é bem-vinda, sem transformar Gika em assistente geral. Resultado só é anunciado após ACK.

## Limites e motivo

| Recurso | Contrato |
|---|---|
| Modelo / thinking | `gemini-3.5-flash-lite` / MEDIUM; sem alteração de plano/billing |
| Mensagem atual | 2.000 caracteres; mantido, adequado a pedidos de agenda e voz curta |
| Resposta | 1.000 caracteres; mantido para conversa curta, cards carregam dados estruturados |
| Corpo respond | 12 KiB UTF-8; mantido e calculado após serialização |
| Escolha de recorrência | Parser de 24 KiB para pedido original de até 12 KiB + token de até 8.192 caracteres; não amplia o limite do pedido original |
| Histórico enviado | Até 12 turnos (seis pares), 1.000 caracteres/turno; antes seis turnos apenas conversacionais |
| Mensagens visíveis | Até 120 em memória por conta; antes 40; não persistidas nem todas enviadas ao modelo |
| Interpretação comum | Uma chamada upstream em vez de classificar + interpretar |
| Organização | Segunda chamada somente após leitura autorizada/bounded; também consome quota |
| Quota por UID | Até seis reservas upstream em 60s e três em 10s; transação Firestore |
| Configuração de minuto | `GIKA_MINUTE_LIMIT` opcional, inteiro 1–6; ausente = 6; inválido falha fechado |
| Diário | `GIKA_DAILY_LIMIT` opcional, inteiro positivo; agora conta reservas upstream; ausente não impõe teto diário interno |
| Deadline | 10s por chamada upstream; 25s por operação (duas fases + 5s de servidor), cliente 30s; antes operação 15s incompatível com duas chamadas válidas de 8s |
| Read / batch / tools | 50 itens por consulta, sete dias por intervalo, até cinco itens em lote e três ferramentas; mantidos |
| Campos e datas | Título até 120 caracteres; datas propostas dentro de ±366 dias do contexto civil; mantidos como guardas da interpretação, sem ampliar busca histórica |
| Voz | Gesto explícito; PT-BR; prévia parcial; revisão e envio manual; sem upload de áudio pelo Leve |
| Deadlines da voz | 15s para iniciar, 45s de captação, 10s para finalizar a transcrição; evitam captura travada e preservam o rascunho |

O teto anterior permitia três pedidos × duas chamadas = seis chamadas upstream por minuto.
A nova contagem mantém esse envelope máximo, distribui melhor as interações curtas e cobra
também o planejamento. Burst curto impede disparo simultâneo de seis chamadas. Não existe
quota em memória como autoridade. Um único documento por UID é sobrescrito, sem crescimento
por minuto/dia; sua remoção segue a exclusão de conta. Falha ou corrupção do contador fecha o
acesso. Confirmações e receipt replay não chamam Gemini nem gastam quota de modelo.

Free tier depende das quotas e do billing configurados pelo provedor; limites do app não são
garantia financeira global ou proteção contra DDoS volumétrico. Nenhum billing é habilitado
por esta mudança. `GIKA_MINUTE_LIMIT=3` pode conservar o teto conservador anterior de pedidos,
agora em chamadas. A configuração diária existente pode ficar mais restritiva em organização
porque a segunda chamada passa a ser contada; não há aumento silencioso do teto diário.

## Chat e voz

Novas respostas acompanham a rolagem somente perto do fim. Ao ler acima, a pessoa escolhe
"Ver resposta". "Parar resposta" interrompe a espera e preserva o rascunho; não promete
reverter um comando já enviado. Retry conserva identidade da tentativa lógica.

A voz mostra estado, tempo e transcrição parcial real. A transcrição entra no rascunho
somente no final e nunca é enviada automaticamente. Cancelar/regravar preserva o texto
anterior. Deadlines encerram reconhecimento travado; offline, fechamento e troca de conta
abortam a captura. A disponibilidade do reconhecimento depende do navegador.

## Compras: contrato disponível na Gika

O pedido “Crie uma lista de compras com o nome Jantar” expôs uma lacuna real: o Leve
possuía `shoppingList.create`, mas a Gika não tinha ferramenta, descriptor nem bridge
para esse domínio. Uma lista não deve virar tarefa nem receber uma pergunta genérica
de agenda. A continuação autorizada adiciona `create_shopping_list` (somente título,
até 100 caracteres) e `get_shopping_lists` (sem seletor de conta/IDs do modelo).

Criação exige ação explícita e certa, uma proposta por turno e policy específica de
lista normal. Não pergunta data/horário, pois não são campos da lista. Falta de nome
deve gerar apenas a pergunta pelo nome; o contexto pode completar esse campo. O
provider interpreta o pedido, sem regex por frase ou blacklist por assunto.

O bridge deriva `shoppingList.create` com `{title,listKind:'regular',cycleKey:null}`,
`entityId=operationId=requestId`, `expectedRevision=0` e hash do texto original. Usa
`sendCommand` autenticado/online, sem outbox automática de proposta IA. O servidor
valida envelope canônico, estoque de 50 listas, quota de comandos e modo normal;
guarda snapshot mínimo no receipt transacional existente. Recuperação de resposta
perdida precede provider/quota e exige UID, texto, descriptor, hash e ACK consistentes.
Nenhum sucesso antes de ACK conferido. Troca de conta/abort descarta o resultado.

Consulta retorna só metadados das listas/modelos ativos do UID autenticado: nome,
tipo, revisão e contadores. Uma query limitada a 50, sem ler itens em subcoleções;
saturação ou registro inválido sinaliza `partial`, sem anunciar ausência completa.
O contexto envia até cinco nomes/tipos/contadores, sem IDs, revisões ou receipts.
Links do resultado abrem a lista convencional e fecham/cancelam o dialog da Gika.

| Capacidade | Gika nesta versão |
|---|---|
| Agenda | Consulta, criação simples, conclusão, renomeação, reagendamento e organização com guardas existentes |
| Compras | Criar uma lista normal vazia e consultar listas/modelos ativos |
| Itens, modelos e ciclos de compras | Gerenciar pela tela Compras; a Gika explica a limitação, sem criar tarefa no lugar |
| Notas, categorias, import/export e administração de conta | Continuam nas telas próprias; nenhuma tool de escrita genérica |
| Conhecimento geral | Fora do domínio, mesmo quando o assunto pode aparecer em título de tarefa/lista |

Não há nova permissão Firestore, migration, dependência, configuração Firebase/Vercel,
alteração de billing, modelo/thinking ou ampliação de quota. As operações convencionais
continuam independentes da Gika. O usuário fará a validação real do provider depois;
os gates locais provam contratos e efeitos emulados, não precisão semântica do Gemini.

Para validar depois no Preview da branch, usando somente conta/dados de teste:

1. “Crie uma lista de compras com o nome Jantar”: lista normal criada e aberta em Compras,
   sem tarefa extra nem pergunta por data/horário.
2. “Quais listas de compras eu tenho?”: listas reais da conta, tipos/contadores coerentes;
   indicação de consulta parcial se aplicável.
3. “Cria uma lista de compras” e depois “Feira”: perguntar só o nome e completar o pedido
   pelo contexto. Uma nova intenção explícita de tarefa deve prevalecer sobre esse contexto.
4. “Põe arroz nessa lista”: explicar a capacidade atual e orientar a abrir Compras,
   sem criar tarefa/item fictício nem anunciar sucesso.
5. “Cria duas listas, Jantar e Feira” ou “Cria Jantar já com arroz”: não executar apenas
   metade do pedido nem inventar batch/item tool.
6. “Me ensina uma receita de jantar”: fora do domínio; “agenda preparar jantar amanhã às
   sete da noite”: tarefa válida às19:00, sem confundir título/assunto com conhecimento geral.
7. Reagendar uma tarefa: prévia, cancelar e confirmação/HMAC seguem o fluxo existente;
   “sim” em conversa não substitui o botão assinado.

O dataset opt-in de provider em `scripts/evals/gika-cases.mjs` contém 61 pedidos sintéticos,
incluindo oito paráfrases novas de criação de listas, três consultas, follow-up de nome,
pedido incompleto, itens não suportados e negação. Frases de teste não são regras lexicais
do produto. O runner restringe host/audiência a Preview, não executa comandos e registra
somente IDs técnicos/status/resultados; esses casos ainda **não foram executados ao vivo**.

## Evidência

Testes determinísticos de contratos e fixtures não demonstram compreensão real do provedor.
Resultados de unit/integration/E2E e avaliação real devem ser registrados separadamente no
ExecPlan, sem chamar mocks de eval semântica ao vivo. Prompts, credenciais e respostas privadas
não devem ser registrados nos artefatos de avaliação.

Checkpoint local: CI audit/lint/typecheck/build, 745 unit, 306 integration e oito fluxos críticos
PASS. Ampla UI 110 PASS/6 FAIL; seis casos afetados corrigidos e reexecutados PASS. Quatro eram
contratos antigos do harness; dois detectaram resultado confirmado tratado como prévia pendente.
O resultado verificado agora prevalece no estado visual. Guardas/timing e primeiras evidências
preservados. A avaliação de Gemini real é separada e aguarda acesso ao Preview protegido; não
considerar estes números prova de compreensão do provedor nem autorização de release.

No runtime `afd313259b62b23e97925671d7fda2b7063b86a7`, ciclo completo final: **116 E2E PASS,
zero falhas, 25.2 minutos**; mesmos tempos/retries/guardas. CI desse SHA confirma todos os
gates acima. Glass check/selftest PASS. Não houve alteração de runtime durante esse ciclo.
Avaliação real ainda bloqueada por Deployment Protection do Preview (SSO302/API401Vercel),
sem credencial disponível; dataset de 42 casos e cinco fluxos de ação/contexto pronto em
`scripts/evals`. Main e produção permanecem sem estas mudanças até completar essa validação.

## Checkpoint local de compras — 2026-10-05

Runtime estável durante o ciclo completo: SHA256
`cc7de6dac63b445e289a8c129fac5470b45ba336dc804d23fce1701e3021317f`.
Audit produção: zero vulnerabilidades; lint, typecheck web/server, build e Glass
check/selftest PASS. **802 unit, 320 integration e 123 Gika E2E PASS**, zero falhas
no ciclo E2E completo (33.8min), sem aumentar timeout/retry ou enfraquecer guardas.
Inclui sete novos shopping E2E, desktop/mobile-dark/200%/Axe, criação/reload,
isolamento, recuperação de ACK, cancelamento ao navegar, voz e HMAC existentes.

Primeiras falhas foram preservadas: contrato de compras ausente (bridge1FAIL e
schema2FAIL); fixture do bridge corrigida; fullunit797PASS/2FAIL por allowlists
exatas antigas, atualizadas mantendo consulta sem escrita. Resultado final802PASS.
Artefatos visuais atuais permanecem no cache local; imagens históricas M1 restauradas.

Não executado: Gemini real, microfone físico ou smoke hospedado deste checkpoint.
O usuário assumiu essa validação posterior; o dataset opt-in agora tem61casos.
Lógica local entregue em `feat/gika-assistant-experience`; sem merge main, deploy,
alteração de Firebase, configuração externa ou produção.
