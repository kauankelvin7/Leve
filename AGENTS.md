# Leve — mapa e limites para agentes

Este arquivo resume as fontes e os contratos que não podem ser quebrados. Leia a documentação da área antes de mudar seu comportamento.

## Por onde começar

- [CONTINUAR.md](CONTINUAR.md): retomada geral; confira a seção e a data do domínio em que vai trabalhar.
- [Estado, tarefas e plano da Gika](.agent/GIKA_STATE.md), [.agent/GIKA_TASKS.yaml](.agent/GIKA_TASKS.yaml) e [.agent/GIKA_EXECPLAN.md](.agent/GIKA_EXECPLAN.md): estado operacional Gika.
- [Portal de documentação](docs/README.md): arquitetura, decisões, operação, segurança, Gika e evidências.
- [Contribuição e convenções](CONTRIBUTING.md): ambiente, fluxo, contratos e documentação.
- [Testes e verificações](CONTRIBUTING.md#comandos-de-verificação): comandos disponíveis e escopo dos gates.
- [Política de segurança](SECURITY.md): escopo e relato responsável.

Se fontes divergirem, prevalece o pedido mais recente do usuário, seguido pelo checkpoint operacional mais recente e específico. Preserve registros históricos; não os trate como estados simultâneos.

## Guardrails

- Auth verificado, UID e associação ativa são obrigatórios para acesso a dados privados. Firestore Rules e servidor devem manter isolamento por conta.
- Alterações de domínio passam pela API e pelos comandos existentes. Não escreva diretamente nas coleções de domínio do cliente.
- Preserve `operationId`, recibos/idempotência e `expectedRevision`; conflitos devem ser explícitos e preservar a intenção da pessoa usuária.
- Não registre nem versione segredos, credenciais, tokens, cookies, conteúdo pessoal, prompts ou payloads privados.
- Offline é opt-in e usa o cache/outbox existentes. Não crie persistência paralela nem fila offline para a Gika.
- Use emuladores e dados sintéticos para desenvolvimento. Não ative cobrança, recurso pago, deploy, publicação ou alteração em `main` sem autorização explícita.
- Não declare testes, evidências, serviço externo ou aprovação visual que não tenham sido executados e registrados.

## Referências técnicas

- [Arquitetura factual do Leve/Gika](docs/gika/ARCHITECTURE.md)
- [ADRs](docs/adr/)
- [Políticas de segurança da Gika](docs/gika/SECURITY_AND_POLICY.md)
- [Runbooks e validação](docs/runbooks/)
- [Guia de contribuição](CONTRIBUTING.md)
