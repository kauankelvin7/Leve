# Rotas reais de produção

Fonte: `apps/web/src/app/App.tsx`, React Router. O harness não modifica o router.

| Rota | Contexto de QA |
|---|---|
| /entrar | Público, login/erro/recuperação por navegação existente |
| /registrar | Público, formulário |
| /recuperar | Público, formulário |
| /privacidade | Público, texto/teclado |
| /apoie | Público, apoio via GitHub Sponsors e Pix configurável |
| /hoje | Conta sintética, agenda/launcher/Gika/cronômetro |
| /calendario | Conta sintética, Mês/Semana/Dia e sheet móvel |
| /atividade/:id | Atividade sintética, editor/detalhe/timer |
| /notas | Conta sintética, editor/lista |
| /notas/:id | Nota sintética, leitura longa |
| /compras | Conta sintética, lista/formulário |
| /compras/:id | Lista sintética, itens |
| /revisao | Conta sintética, revisão |
| /buscar | Conta sintética, campo/resultados |
| /configuracoes | Conta sintética, seções/formulários |
| /lixeira | Conta sintética, lista/restauração/dialog |
| / | Redirect existente para /hoje |
| desconhecida | Status404 existente |

`/demo/*` existe como referência histórica; não é autoridade visual do Glass. `/dev/gika-character` é somente autoria dev e não integra as capturas de rotas Glass.

Preview4173 serve o build real para público/PWA/isolamento. As rotas privadas são verificadas com Vite dev5174 + Auth9099/Firestore8080/API8788, arquitetura de teste já existente. Produção continua sem emuladores: `DEV && VITE_USE_EMULATORS`; nenhuma chave real é necessária. Essa diferença de execução é explícita, não uma simulação das telas.

Capturas before/after usam as mesmas dimensões, temas, títulos sintéticos e estados; IDs internos são software-owned e não aparecem no manifesto/relatório. Fontes e carregamento semântico são aguardados; não usar sleep arbitrário para esconder problemas.
