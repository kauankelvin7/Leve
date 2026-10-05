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
| Histórico enviado | Até 12 turnos (seis pares), 1.000 caracteres/turno; antes seis turnos apenas conversacionais |
| Mensagens visíveis | Até 120 em memória por conta; antes 40; não persistidas nem todas enviadas ao modelo |
| Interpretação comum | Uma chamada upstream em vez de classificar + interpretar |
| Organização | Segunda chamada somente após leitura autorizada/bounded; também consome quota |
| Quota por UID | Até seis reservas upstream em 60s e três em 10s; transação Firestore |
| Configuração de minuto | `GIKA_MINUTE_LIMIT` opcional, inteiro 1–6; ausente = 6; inválido falha fechado |
| Diário | `GIKA_DAILY_LIMIT` opcional, inteiro positivo; agora conta reservas upstream; ausente não impõe teto diário interno |
| Deadline | 10s por chamada upstream; 25s por operação (duas fases + 5s de servidor), cliente 30s; antes operação 15s incompatível com duas chamadas válidas de 8s |
| Read / batch / tools | 50 itens por consulta, sete dias por intervalo, até cinco itens em lote e três ferramentas; mantidos |
| Voz | Gesto explícito; PT-BR; prévia parcial; revisão e envio manual; sem upload de áudio pelo Leve |

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
