# Segurança no Leve

Esta política descreve como relatar vulnerabilidades e quais informações são úteis para avaliá-las. Ela não declara uma certificação ou programa formal de resposta.

## Versões e escopo

O repositório fixa Node.js 24.x no campo `engines` e npm 11.19.1 em `packageManager`; essa é a linha de desenvolvimento documentada. O projeto não publica aqui uma matriz independente de versões suportadas para todos os serviços de hospedagem ou navegadores. Ao revisar uma vulnerabilidade, indique o commit ou versão afetada, ambiente e componentes envolvidos.

Relate problemas que possam afetar confidencialidade, integridade ou disponibilidade do Leve, incluindo autenticação e isolamento de contas, API, Firestore Rules, comandos, dependências e publicação de artefatos. Um achado de ferramenta de desenvolvimento deve informar se alcança o produto ou apenas o ambiente de desenvolvimento.

## Como relatar

Se a função de **Private vulnerability reporting** ou **Security advisories** estiver habilitada nas configurações deste repositório GitHub, use-a para enviar o relato em privado. A disponibilidade dessa função depende da configuração do repositório. Não há endereço de e-mail nem SLA de resposta publicado neste arquivo. Se o canal privado não estiver disponível, não publique detalhes exploráveis ou dados de usuários; procure um meio privado já publicado pelo mantenedor antes de compartilhar a reprodução.

Inclua, quando possível:

- uma descrição curta e o impacto observado;
- commit/versão, configuração e passos mínimos para reproduzir;
- evidência sanitizada ou uma correção sugerida.

Não inclua senhas, chaves, tokens, cookies, dados pessoais, conteúdo real de agenda/notas, nem arquivos `.env`. Remova identificadores e payloads privados de logs e capturas.

## Tratamento e divulgação

O mantenedor avaliará o escopo, buscará reproduzir o problema com dados sintéticos e coordenará a correção e a divulgação com quem relatou. Não há prazo fixo de confirmação, correção ou publicação. Evite divulgar publicamente detalhes que permitam explorar a falha enquanto correção ou mitigação estiver sendo preparada; combine uma divulgação responsável com o mantenedor quando houver canal privado disponível.

## Proteções documentadas

O produto usa Firebase Authentication, regras do Firestore e uma API de comandos para operações de domínio. Os detalhes e limites conhecidos estão em [segurança e política da Gika](docs/gika/SECURITY_AND_POLICY.md), [auditorias de dependências](docs/security/) e [instruções de contribuição](CONTRIBUTING.md).
