# Leve — Setup de agentes e plugins

Este documento registra como preparar o ambiente de desenvolvimento assistido por agentes sem copiar plugins externos para dentro do codigo do Leve.

## Objetivo

O repositorio usa `AGENTS.md` como politica global de trabalho. Skills e plugins complementam essa politica, mas nao a substituem.

A prioridade e manter:

- seguranca dos dados;
- isolamento por conta;
- verificacao antes de conclusao;
- mudancas pequenas e reversiveis;
- dependencias externas sob controle;
- ausencia de credenciais no repositorio.

## Superpowers

O `Superpowers`, de Jesse Vincent/obra, esta disponivel no marketplace oficial do Codex. O plugin fornece workflows de brainstorming, planejamento, TDD, depuracao sistematica, revisao e verificacao.

### Instalacao no Codex App

1. Abra `Plugins` na barra lateral do Codex.
2. Procure `Superpowers` na categoria de desenvolvimento/coding.
3. Selecione o plugin e conclua a instalacao.
4. Abra uma nova sessao do repositorio depois da instalacao.

### Instalacao no Codex CLI

1. Abra a interface de plugins com:

```text
/plugins
```

2. Pesquise por:

```text
superpowers
```

3. Selecione `Install Plugin`.
4. Reinicie a sessao se o plugin nao aparecer imediatamente.

## Por que nao vendorizamos o plugin no Leve

O Leve nao mantem uma copia de `obra/superpowers` dentro do repositorio.

Motivos:

- o Codex ja oferece o plugin por um marketplace oficial;
- uma copia local ficaria desatualizada em relacao a correcoes upstream;
- copiar dezenas de arquivos externos aumenta superficie de revisao e manutencao;
- a instalacao pelo marketplace mantem autoria, versao e atualizacoes separadas do codigo do produto;
- remover ou atualizar o plugin nao deve alterar a arvore de producao do Leve.

## Relacao com AGENTS.md

Quando Superpowers estiver instalado, seus workflows devem respeitar `AGENTS.md`.

Em particular:

- nenhuma skill pode liberar escrita direta no Firestore;
- nenhuma skill pode ignorar `expectedRevision` ou conflito de revisao;
- nenhuma skill pode criar worktree, branch, commit, merge ou PR sem autorizacao quando isso contrariar a politica corrente do repositorio;
- nenhuma skill pode instalar dependencia sem revisar licenca, privacidade, bundle e necessidade;
- nenhuma skill pode declarar teste ou deploy aprovado sem evidencia real.

As regras especificas do Leve prevalecem sobre convencoes genericas de qualquer plugin.

## Privacidade e telemetria

O manifest oficial do plugin Superpowers para Codex declara capacidades interativas de leitura e escrita e nao declara apps conectados ou servidores MCP. O projeto upstream documenta uma telemetria opcional associada ao recurso de companion visual.

Para um ambiente de desenvolvimento orientado a privacidade, mantenha esse recurso desativado. Quando o ambiente permitir variaveis de processo, use:

```text
SUPERPOWERS_DISABLE_TELEMETRY=1
```

O upstream tambem documenta compatibilidade com variaveis gerais de desativacao de telemetria do harness.

Nao grave tokens, chaves, cookies, credenciais Firebase Admin, arquivos `.env` reais ou segredos em configuracoes de skills/plugins.

## Fluxo esperado no Leve

### Nova funcionalidade

1. compreender o problema;
2. conferir documentacao e dominio existentes;
3. definir comportamento e criterios de aceite;
4. criar plano curto e reversivel;
5. testar a regra antes ou junto da implementacao;
6. implementar a menor mudanca correta;
7. rodar validacoes proporcionais ao risco;
8. revisar seguranca, acessibilidade e regressao;
9. atualizar documentacao somente depois da prova.

### Bug

1. reproduzir;
2. coletar evidencia sem registrar dados privados;
3. localizar causa raiz;
4. escrever teste de regressao quando aplicavel;
5. corrigir no modulo dono do comportamento;
6. validar o fluxo completo afetado;
7. evitar workaround permanente se a causa raiz puder ser corrigida.

### Alteracao sensivel

Mudancas envolvendo autenticacao, Firestore Rules, comandos, concorrencia, importacao/exportacao, exclusao de conta, notificacoes ou offline devem incluir testes de integracao com emuladores antes de serem consideradas concluidas.

## Codex Security

Quando disponivel no ambiente, `Codex Security` pode complementar a revisao do repositorio com scans e investigacao de seguranca. Ele e complementar: nao substitui Rules, testes de integracao, revisao manual nem as politicas de `AGENTS.md`.

## Atualizacao

Nao fixe uma versao copiada do Superpowers neste repositorio. Atualize o plugin pelo mecanismo oficial do Codex e mantenha este documento apenas com regras de integracao que sejam especificas do Leve.
