# ADR — Fundação E00/E01

Data: 11/09/2026. Estado: aceita para implementação local; homologação visual e prova online pendentes. Decisões baseadas no relatório v2.0 e no prompt da raiz.

## Contexto

O diretório continha somente três Markdown e `.qodo/`. Não havia código de aplicativo, lockfile, tokens nem referência visual auditável. O Git resolvia para `C:/Users/Kauan`, fora da raiz do projeto: não inicializamos repositório, criamos branch ou commit, nem alteramos esse Git. Antes do primeiro commit, definir um repositório próprio para evitar incluir arquivos pessoais por engano.

## Escolha

1. React/Vite/TypeScript e npm workspace simples, preservando a estrutura proposta `apps/web`. Não acrescentar orquestrador de monorepo. Dependências exatas e lockfile; bibliotecas de domínio, Firebase, editor e PWA entram apenas quando usadas.
2. `/demo/*` carrega um módulo separado sob demanda. Apenas esse módulo cria fixtures, em estado React. Rotas de conta encaminham para a indisponibilidade explícita do login. Essa fronteira é organizacional; a autorização real obrigatória será no backend/regras da E02.
3. Tokens reconstruídos dos valores da seção 9, com uma fonte JSON. Não criar uma cópia apresentada como protótipo original. Fontes Fontsource hospedadas junto ao build, mantendo licenças dos pacotes. Vidro apenas nos suportes e fallback sólido por preferência e media query.
4. Calendário demonstrativo manipula strings civis e usa UTC somente como suporte interno de aritmética/apresentação dessas strings. `todayCivil` consulta o fuso do navegador. Essas funções não calculam prazos UTC, recorrência ou eventos com DST; o domínio real exigirá biblioteca e schemas próprios em E03/E07.
5. Infraestrutura proposta continua Vercel Hobby, Firebase Spark sem Cloud Billing, FCM e Cloudflare Workers Free. Sem provisionamento ou deploy nesta etapa. Revisão de cotas é evidência documental, não prova de integração.
6. Não incluir service worker ou cache privado prematuramente: RF-22 pertence a E08. Não implementar persistência fictícia em lugar do backend.

## Alternativas e consequências

Uma landing page de marketing não atende a abertura direta da agenda; a tela inicial atual é um estado temporário de acesso indisponível. Usar arrays na conta mascararia a falta de autenticação, portanto fixtures ficam exclusivamente na demo. A reconstrução permite trabalho local mesmo sem o protótipo, mas bloqueia a declaração de fidelidade visual verificada.

A CSP será revisada ao integrar Auth; o fallback de SPA será ensaiado na Vercel. No frontend não há segredos nem SDK Admin. Ao criar API, validar ID token, uid derivado, membership e accountState em cada comando: Admin SDK ignora Security Rules. Recibo e mutação deverão ser atômicos.

## Reabrir esta decisão

Se o protótipo divergir, atualizar tokens/composição e registrar a comparação. Se a prova exigir cobrança, registrar impedimento e revisar arquitetura com o mantenedor antes de alterar custo ou escopo. Não promover E00 ou release só porque o build passa.
