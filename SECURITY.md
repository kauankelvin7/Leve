# Política de segurança

A segurança do Leve inclui autenticação, isolamento por conta, validação de comandos, regras do Firestore, proteção de segredos e controles de deploy. Relatos responsáveis ajudam a corrigir falhas sem expor usuários.

## Versões suportadas

O desenvolvimento ocorre na branch `main`. Correções de segurança são direcionadas à versão publicada atual e ao código vigente em `main`.

## Como relatar uma vulnerabilidade

Não abra uma issue pública com detalhes de uma vulnerabilidade, credenciais, tokens, dados pessoais ou passos de exploração.

Prefira o fluxo privado **Security → Report a vulnerability** deste repositório, quando ele estiver disponível. Se o botão não estiver habilitado, use um canal privado indicado no perfil do mantenedor no GitHub e informe apenas o necessário para estabelecer contato.

Inclua, quando possível:

- componente ou rota afetada;
- impacto observado;
- pré-condições necessárias;
- passos mínimos para reproduzir;
- ambiente e versão;
- evidência sanitizada, sem segredos ou dados reais.

## Processo de tratamento

O relato será triado antes de qualquer divulgação pública. A correção deve preservar os contratos de autenticação, autorização por UID/membership, idempotência, revisão esperada e escrita somente pela camada de comandos.

Evite testar contra contas ou dados reais de terceiros. Não execute carga, negação de serviço, exfiltração, engenharia social ou qualquer ação que amplie o impacto de uma falha.

## Escopo técnico relevante

Os principais controles versionados incluem:

- Firebase Authentication e autorização server-side;
- Firestore Rules com negação padrão;
- validação de entrada com Zod;
- CSP e headers de segurança;
- CORS por allowlist;
- HMAC para o scheduler;
- auditoria de dependências de produção no CI;
- testes unitários, integração com emuladores e E2E.

Documentos técnicos e evidências adicionais estão em `docs/security/`.

## Divulgação responsável

Depois que a correção estiver disponível, a vulnerabilidade poderá ser documentada de forma proporcional ao risco, sem publicar segredos, dados pessoais ou detalhes que facilitem exploração desnecessária.
