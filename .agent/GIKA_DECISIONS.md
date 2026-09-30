# Gika — Decision Log

Registre decisões que alterem arquitetura, contratos, segurança, UX ou estratégia de rollout.

Formato:

## ADR-GIKA-XXX — Título

- Data:
- Status: proposed | accepted | superseded | rejected
- Contexto:
- Decisão:
- Alternativas consideradas:
- Consequências:
- Arquivos/contratos afetados:

---

## ADR-GIKA-001 — IA não acessa persistência diretamente

- Data: bootstrap
- Status: accepted
- Contexto: A Gika precisa consultar e modificar a agenda sem permitir que o LLM determine livremente operações de banco.
- Decisão: O modelo só pode solicitar ferramentas tipadas. Ferramentas passam por policy/validation e chamam a camada de comandos/regra de negócio existente.
- Alternativas consideradas: acesso direto ao Firestore; geração de queries pelo modelo.
- Consequências: maior previsibilidade, segurança, testabilidade e facilidade de troca de provedor.

## ADR-GIKA-002 — Repositório como memória persistente

- Data: bootstrap
- Status: accepted
- Contexto: sessões de agentes podem terminar, trocar de modelo ou perder contexto.
- Decisão: progresso, decisões, bloqueios, tarefas e evidências devem ser persistidos e versionados no repositório.
- Consequências: retomada determinística e menor dependência do histórico de conversa.

## ADR-GIKA-003 — Paralelismo conservador

- Data: bootstrap
- Status: accepted
- Contexto: múltiplos agentes alterando estado compartilhado elevam risco de conflitos e regressões.
- Decisão: subagentes são preferidos para leitura, auditoria, revisão, segurança, testes e ownership disjunto. Implementações dependentes são serializadas pelo orquestrador.
- Consequências: menos conflitos e integração mais previsível.

## ADR-GIKA-004 — Preservar a fundação e as instruções do Leve

- Data: 2026-09-30
- Status: accepted
- Contexto: checkout contém AGENTS.md e CONTINUAR.md anteriores ao pacote; HEAD real f6b21b6 é posterior ao HEAD mencionado em CONTINUAR.
- Decisão: manter integralmente AGENTS.md original e anexar instruções Gika; pedido atual autoriza branch/commits Gika, sem iniciar Fase 7 sazonal/deploy. Memória Gika em .agent; CONTINUAR aponta para ela.
- Alternativas consideradas: sobrescrever AGENTS e perder regras de custo/domínio; reiniciar plano sazonal.
- Consequências: regras compatíveis coexistem; instrução mais recente do usuário continua prioritária; ausência de humanizer-br precisa ser resolvida antes de criar textos de UI.
- Arquivos afetados: AGENTS.md, CONTINUAR.md, .agent/*.

## ADR-GIKA-005 — Integração por Activity e comandos existentes

- Data: 2026-09-30
- Status: accepted
- Contexto: React/Vite, Express e schemas Zod; comando idempotente com revisão e outbox já presentes. 'Rotina' não é entidade separada.
- Decisão: Gika UI em Shell autenticado, mock no M1; provedor/allowlist/leituras somente no servidor em M2; bridge de mutações simples por sendCommand/activity.create/update/setStatus. Policy cresce desde a primeira ferramenta. Alto impacto só após confirmação server-side no M5.
- Alternativas consideradas: SDK cliente com segredo; acesso do modelo ao Firestore; CRUD paralelo; tool genérica de comando.
- Consequências: preserva auth, revisão e offline; tool output requer validação runtime; queued não é applied; handler de série precisa revisão antes de exposição.
- Arquivos/contratos: ARCHITECTURE.md, SECURITY_AND_POLICY.md; caminhos novos planejados gika.ts, features/gika, server/gika.

## ADR-GIKA-006 — Contexto limitado e rollout sem custo obrigatório

- Data: 2026-09-30
- Status: accepted
- Contexto: lists <=50, partial/cached existentes, custo obrigatório R$ 0 e nenhum provedor escolhido.
- Decisão: dia/semana (<=7 dias), dados mínimos, sem descrição/notas/compras por padrão, chat inicialmente em memória por uid. Provider M2 depende de escolha humana compatível com gratuidade e credencial servidor; M1 mock não depende disso.
- Alternativas consideradas: enviar todo histórico, esconder partial, assumir provedor pago, armazenar chat automaticamente.
- Consequências: consultas parciais não geram afirmações de completude nem lote; logout cancela contexto; indisponibilidade da IA não desmonta agenda.
- Arquivos/contratos: ARCHITECTURE.md, execplan, gika tool result.

## ADR-GIKA-007 — Respeitar limites de recorrência e batch

- Data: 2026-09-30
- Status: accepted
- Contexto: updateFuture divide série e recria IDs; batch transacional genérico não existe; microphone bloqueado no deploy atual.
- Decisão: occurrence/future reais; sem edição de série inteira fictícia; batch M6 exige contrato atomicamente executável ou semântica explícita de progresso parcial aprovada antes de habilitar. Voz M7 exige revisar Permissions-Policy.
- Alternativas consideradas: Promise.all chamado de transação, scope inventado, captura de áudio sem fallback.
- Consequências: invalidar proposals após split/conflito; novos contratos precisam emuladores e E2E; nenhuma mudança antecipada de backend em M0.
- Arquivos/contratos: server/commands/content.ts (existente), vercel.json (existente), gates futuros M5/M6/M7.

## ADR-GIKA-008 — humanizer-br local oficial

- Data: 2026-09-30
- Status: accepted
- Contexto: skill externa ausente bloqueava textos M1; usuário forneceu conteúdo integral e autorizou implementação local explícita.
- Decisão: versionar exatamente o conteúdo fornecido em .agent/skills/humanizer-br/SKILL.md, ler integralmente e usá-lo como fonte oficial para todo texto de interface Gika. A autorização manual supriu apenas a ausência externa; não é exceção às regras de domínio/segurança/qualidade do Leve.
- Alternativas consideradas: permanecer bloqueado; substituir a skill silenciosamente (rejeitado).
- Consequências: M1-T1 desbloqueada; checklist local de linguagem/acessibilidade aplicado por revisão manual. Não se simula instalação global de plugin. skill-creator não está disponível no harness; criação literal autorizada pelo usuário, sem gerar conteúdo alternativo.
- Arquivos afetados: .agent/skills/humanizer-br/SKILL.md, GIKA_STATE.md, GIKA_TASKS.yaml, GIKA_EXECPLAN.md e docs/gika.

## ADR-GIKA-009 — Gemini gratuito em M2

- Data: 2026-09-30
- Status: accepted — instrução explícita do usuário
- Decisão: Gemini Developer API com gemini-3.5-flash-lite explícito, thinking_level medium; só Free Tier, sem habilitar/vincular billing, cartão ou fallback pago. Segredo exclusivamente servidor GEMINI_API_KEY. Implementação e testes locais não dependem de segredo; somente smoke real será bloqueado pela ausência.
- Consequências: adapter intercambiável, M2 somente leitura; tratar missing env, 429/quota, 503, timeout, resposta inválida e malformed function call sem interromper a agenda. Disponibilidade/cota reais só podem ser comprovadas no smoke.

## ADR-GIKA-010 — Refinement de M1 antes de M2

- Data: 2026-09-30
- Status: accepted — instrução explícita do usuário
- Decisão: adicionar M1-T4 ao fechamento de M1: viewport de conversa, símbolo próprio discreto, composer expansível no rodapé, chips e estados estruturados exclusivamente mock. Preservar tokens/fontes Leve, sem copiar identidade externa.
- Consequências: M2-T1 depende de M1-T4 aprovado; voz é apenas indicação visual, confirmações/undo nesta etapa nunca acessam domínio ou persistência. Repetir gates e revisão desktop/mobile antes de declarar M1 concluído.

- Refinamento final de ADR-010: usuário pediu polimento de aviso, empty state, composer/microfone/envio, densidade e título mobile; permanece M1-T4, sem avançar lógica IA nesta tarefa.

## ADR-GIKA-011 — interpretação isolada e resposta ancorada em leituras

- Data: 2026-09-30; accepted.
- Uma requisição Gemini por pergunta, sem retry/fallback; três tools de leitura, no máximo três chamadas, dez segundos e resposta limitada. O provider recebe somente pergunta e contexto civil mínimo; nunca uid, credencial Firebase, tarefas, descrições ou resultados Firestore.
- O router valida/politiza chamadas antes de consultar. Resultados tipados são apresentados deterministicamente, sem segundo roundtrip nem afirmações livres geradas pelo modelo. Sem chamada válida, pedir esclarecimento; nenhuma narrativa de sucesso de mutação é exibida.
- Interface ModelAdapter não importa persistência ou comandos. DI de transport nos testes não requer chave Gemini fictícia. REST generateContent usa thinkingConfig.thinkingLevel MEDIUM (equivalente ao thinking_level medium solicitado).
- Documentação oficial consultada: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite (estável, function calling/thinking); https://ai.google.dev/gemini-api/docs/pricing (Standard Free Tier input/output gratuitos); https://ai.google.dev/api/generate-content (REST). Sem billing, grounding, caching, batch ou serviço pago. Smoke real permanece pendente da credencial de projeto sem billing; código não pode comprovar o estado financeiro de uma credencial ausente.
