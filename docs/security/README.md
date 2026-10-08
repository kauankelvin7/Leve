# Segurança: fontes e evidências

Esta pasta preserva relatórios, planos e artefatos de auditorias específicas. Os registros descrevem seus próprios commits, dependências e escopos; não certificam o estado atual automaticamente.

| Tipo | Fonte | Uso |
|---|---|---|
| POLICY | [Política raiz](../../SECURITY.md) | Escopo, tratamento e relato responsável de vulnerabilidades. |
| POLICY especializada | [Segurança e política Gika](../gika/SECURITY_AND_POLICY.md) | Limites de identidade, confirmação, privacidade e uso da Gika. |
| ARCHITECTURE | [Autenticação e autorização](../architecture/authentication-authorization.md) | Fronteiras atuais descritas a partir do código. |
| AUDITS / EVIDENCE | [SECURITY-AUDIT](SECURITY-AUDIT.md), [REPORT](REPORT.md), [INVENTORY](INVENTORY.md), [Google](GOOGLE_EVIDENCE.md), [DiceBear](DICEBEAR_EVIDENCE.md), [remaining](DEVELOPMENT_REMAINING.md) e arquivos `.json`/`.txt` | Auditorias e evidências datadas; conferir escopo antes de reutilizar conclusões. |
| HISTORICAL | [Plano de hardening](HARDENING_EXECPLAN.md) e relatórios vinculados | Plano e resultado de etapas anteriores, sem autoridade para indicar mudança aplicada nesta base. |

Não há um threat model independente nesta árvore. As políticas e a arquitetura acima registram controles e limites nos seus escopos; este índice não cria avaliação nova. Para comunicar vulnerabilidade, siga a política raiz. Não inclua credenciais, dados pessoais, prompts ou payloads privados em relato público.
