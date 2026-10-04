# Trabalhar na Gika

A Gika é uma especialização do Leve com política e fluxos próprios. Comece por [arquitetura da Gika](../gika/ARCHITECTURE.md), [segurança e política](../gika/SECURITY_AND_POLICY.md), [estado operacional](../../.agent/GIKA_STATE.md), tarefas e plano em `.agent/`.

A visão compartilhada permanece em [arquitetura geral](../architecture/README.md). A Gika envia operações pela API de comandos, exige confirmação conforme a política e não grava diretamente no Firestore. Uma operação nova requer conexão; ela não é enfileirada na outbox convencional para execução ao reconectar ([offline](../architecture/offline-sync.md)).

Preserve UID, membership, confirmação, escopo e recibos definidos pelo código. Use emuladores e fixtures sintéticas. Não registre prompts, conversas, tokens ou conteúdo pessoal em logs e evidências. Antes de mudar contrato ou política, confira ADRs e checkpoints mais recentes; não trate um relatório antigo como estado atual.
