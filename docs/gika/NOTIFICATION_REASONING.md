# Agendamento com aviso automático — 07/10/2026

## Diagnóstico

O hotfix e3caf7f interceptava palavras de notificação antes de chamar o Gemini.
O pedido completo sobre feira recebia um exemplo fixo de academia, sem ação.
Depois, a validação exigia verbo de criação mesmo em uma resposta completa à
pergunta “O que você gostaria de agendar?”. Sete regressões novas falharam antes
da correção; os casos não dependem de uma hipótese sobre o provider.

## Decisão e pesquisa

[Documentação oficial de function calling](https://ai.google.dev/gemini-api/docs/function-calling),
consultada em 07/10/2026: o modelo propõe nome/argumentos, a aplicação executa.
O Leve mantém esse desenho: Gemini interpreta a finalidade completa em
respond_turn; o servidor confere dados, autorização e política; comandos
transacionais executam; a interface só confirma após ACK.

Retirado o atalho notificationCapability. Modelo, thinking MEDIUM, quota, limite
de contexto, ferramentas e confirmações de recorrência/lote permanecem iguais.
Sem novos provedores, infraestrutura, pacotes, credenciais ou cobrança.

## Cenários cobertos

- Agendamento completo com “preciso que me notifique”: preserva o título real.
- “Me lembre de”, “me avise de”, “me notifique para”: aviso no horário não é
  outra operação nem um lembrete antecipado.
- Resposta completa à pergunta de agendamento: não precisa repetir “agende”.
- Histórico só indica que é resposta ao esclarecimento; não fornece título,
  data/hora ausentes, alvo, autorização ou consentimento para outras mutações.
- “Sim” ou só um horário não permitem inventar o resto da tarefa.
- Pedido de notificação sem hora pergunta somente o horário, sem criar tarefa
  que não poderá gerar o aviso solicitado. Horas numéricas e “sete da noite”
  seguem a resolução civil existente.
- Avisos contínuos, antecipados, posteriores e opt-out: proposta que omita
  essas condições vira esclarecimento, nunca criação parcial silenciosa.
- Perguntas sobre capacidade continuam sendo interpretadas pelo modelo.
- Sucesso mostra horário do aviso e condiciona entrega às notificações ativas
  no aparelho; não afirma envio nem permissão verificada. Desfazer retira essa
  indicação para não sugerir que a atividade removida ainda será avisada.

Criação usa activity.create existente. Uma tarefa com horário gera o job
automático at-time no writer existente; retry não duplica tarefa/job. Dia inteiro
sem horário não gera disparo pontual; avisos contínuos não são suportados.

## Evidência e limites

Testes usam transporte Gemini controlado, não respostas hardcoded na aplicação.
Auth, Firestore, policy, command e ACK são reais nos emuladores. Playwright passa
pelo adapter/router reais com o mesmo transporte controlado.

Gemini real NOT_RUN: GEMINI_API_KEY ausente. Não se afirma precisão universal,
que todos os pedidos em linguagem natural foram resolvidos, nem entrega de push
em aparelho real. Evals live e confirmação no aparelho são validação posterior.

Gates: 826 unitários PASS, integração ampla323/323 PASS, focal final9/9 PASS,
lint/boundaries/typechecks/build PASS. Playwright crítico8/8 PASS e gate novo2/2
PASS: mobile390, pedido misto, resposta completa, aviso at-time único, condição
de aviso contínuo sem criação extra, desfazer e presença/ausência na agenda.
O build mantém o aviso preexistente de chunks grandes; não é erro de compilação.

Primeiras falhas: sete regressões novas antes da mudança; integração nova usou
path de job incorreto na asserção (corrigido para reminderJobs/reminderSpecId);
uma asserção existente dependia do esclarecimento genérico (texto preservado).
Primeiro Playwright novo: caso direto PASS, continuação atingiu quota porque a
conta era compartilhada. Testes agora usam contas fictícias distintas, sem mudar
quota. Primeiro gate crítico externo interrompido após duas falhas de assinatura:
servidor iniciado manualmente não compartilhava HMAC com o worker. Reexecução usa
webServer do playwright.local.config com segredo efêmero compartilhado, sem
credenciais persistidas ou assinatura relaxada.
Revisão adicional de desfazer flagrou que a indicação de aviso continuava visível
após a remoção; a condição de apresentação usa outcome undone, com regressão E2E.
Nenhuma política, timeout ou negativa de segurança foi relaxada para passar.
