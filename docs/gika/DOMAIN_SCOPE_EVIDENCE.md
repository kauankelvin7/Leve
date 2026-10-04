# Gika — fronteira conversacional de domínio

Base: `main@58119bc9929e55d4c562ccf350c94b667495bad6`. Validação em 2026-10-04. Correção autorizada em main; sem Gemini live, dados reais ou alterações de configuração Firebase/Vercel.

## Causa

O contrato anterior dizia explicitamente `CONVERSATION/GENERAL` e autorizava perguntas gerais. A saída conversacional era limitada estruturalmente, mas não ao domínio de agenda e organização pessoal. A segurança de mutações não tornava essa amplitude de produto desejável.

## Fronteira implementada

Uma classificação semântica Gemini precede agenda reads/planner/interpretação de ações. Sua saída estrita contém `intent`, `certain` e `reply`; classes: SOCIAL, GIKA_META, AGENDA_QUERY, AGENDA_ACTION, ORGANIZATION_CONVERSATION, OUT_OF_SCOPE. Não há lista de palavras para decidir escopo. O classificador recebe somente pedido, contexto civil e histórico geral limitado; não recebe dados da agenda, identidade ou ferramentas de agenda.

- SOCIAL/GIKA_META/ORGANIZATION_CONVERSATION retornam resposta curta, dentro do domínio, sem interpretação adicional, agenda reads ou descriptors.
- OUT_OF_SCOPE retorna copy definida no servidor. Não exibe conhecimento/código gerado, não consulta agenda nem oferece um efeito executável.
- Classificação incerta, ausente ou inválida nunca libera a interpretação da agenda. Resposta inválida do adapter é rejeitada; ausência/incerteza produz esclarecimento neutro.
- AGENDA_QUERY expõe somente ferramentas read-only e esclarecimento no payload; o dispatcher também rejeita qualquer proposta mutável.
- AGENDA_ACTION libera somente o fluxo existente. Sua classificação não substitui validators, resolução server-side, policy, confirmation, expectedRevision, command layer ou receipts. Metadado `domainIntent` registra a classe validada; não é autoridade fornecida pelo cliente.

Ensinar Python é fora de escopo; estudar Python pode ser assunto de tarefa ou consulta de disponibilidade. `Reserve 1 hora amanhã para eu estudar Python` é intenção de ação, mas não inventa uma duração/horário sem contrato: se a interpretação não couber nos comandos existentes, esclarece sem criação. Este hotfix não acrescenta um tipo de tarefa/duração novo.

A quota interna é consumida uma vez por pedido novo antes do provider. Consulta/ação pode usar duas chamadas provider, classificação + interpretação, sob os deadlines existentes. Isso acrescenta custo de tokens e consumo da quota externa do provider; não altera o modelo, tier, limites internos ou infraestrutura. Retry/receipts recuperam efeito original; confirmação não chama o Gemini. Controles de serviço e reautorização continuam obrigatórios. Nenhum writer, Rule, coleção, dependência, segredo ou hotfix de timezone/voz foi alterado.

## Regressões e gates

Os 12 exemplos solicitados têm cobertura determinística de classificação/schema/adapter e dispatcher HTTP em `tests/unit/gika-domain-routing.test.ts`, e de Auth/Firestore emulados em `tests/integration/gika.test.ts`. As fixtures fornecem decisões semânticas explícitas; não se apresentam como prova de acurácia live do Gemini.

| Gate | Resultado final |
|---|---|
| Audit produção, moderate | Zero vulnerabilidades |
| Lint/AST | PASS; 51 fontes |
| Web/server typecheck e build | PASS; aviso histórico de chunk grande preservado |
| Unit completo | 619/619 PASS, 60 arquivos |
| Integration completa | 287/287 PASS, oito arquivos |
| E2E focal Gika | 10/10 PASS, processos/emuladores fresh e serializados |
| Axe | Zero violações nas jornadas conversacionais focais |

E2E cobre saudação/meta/organização/redirecionamento, histórico geral → consulta, limpeza após logout, zero commands na conversa, double-submit, logout durante request, confirmação/lost ACK precommit, tampering target/patch, fallback de voz sem suporte/permissão e troca de UID. Timezone interno e remoção de microcopy de áudio continuam verificados.

Primeiras falhas preservadas:

1. O arquivo unitário novo importava o router e, indiretamente, inicializava Firebase sem configuração. Corrigida a fixture com mock explícito da plataforma, como os testes unitários de router existentes; nenhuma configuração de produção adicionada. Rodada focal: 20/20 PASS.
2. Após restringir as declarations da consulta, TypeScript não fazia narrowing da união com `includes` no dispatcher. Substituída por comparação explícita das três classes conversacionais, sem cast ou afrouxamento de schema. Typechecks/build foram repetidos.

3. A integração posterior ao repasse de `agendaIntent` teve 286 PASS / 1 FAIL: a asserção estrita do contexto ainda esperava o payload anterior sem a classe. Atualizada a fixture de consulta para AGENDA_QUERY e a igualdade exata para incluir somente esse metadado público; mantidas as assertions de ausência de conteúdo privado, outras contas, mutações e receipts.

Primeira integração completa: 274/274 PASS; depois da matriz autenticada adicional: 287/287 PASS. A última integração confirma os ajustes de metadados e narrowing. Primeira rodada E2E: 10/10 PASS. Nenhuma deadline/retry/assertion de domínio ou segurança foi relaxada.

## Limitações

- A classificação é semântica do provider. Os gates provam validação/roteamento fail-safe e isolamento, não precisão universal de classificação em produção.
- Não houve smoke Gemini live. Deploy e variáveis Vercel não foram certificados; o escopo disponível retornou 403 na investigação anterior.
- A consulta de disponibilidade usa agenda read-only; não promete cálculo de capacidade ou horários livres que o domínio não forneça.
