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
