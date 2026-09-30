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
