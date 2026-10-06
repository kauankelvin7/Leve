# Revisão de composição e navegação

Data: 06/10/2026. Base: `main@1ebe813cfe92e1c19ef338a57d579b82ec1aee8c`.
Branch: `refine/mobile-layout-and-navigation`.

## Pedido e direção

Revisar todas as telas com liberdade criativa, corrigir o menu mostrado na captura
Android e integrar na main depois da revisão e dos testes. Preservadas as fontes
Nunito/DM Sans, as paletas, a identidade das notas e os recursos existentes.

A composição prioriza o conteúdo salvo, usa cabeçalhos proporcionais e reduz a
altura dos resumos. A auditoria percorreu as oito páginas autenticadas em desktop
1366 × 768 e mobile 390 × 844, além de acesso/cadastro/recuperação, Privacidade,
Termos, 404 e Demo. Detalhes, formulários e Gika foram revistos nos fluxos do browser.

## Mudanças

| Área | Resultado |
| --- | --- |
| Navegação | Cabeçalho móvel em uma linha; barra inferior com nomes; links de Mais em linhas completas de 44 px ou mais. |
| Menu Mais | Regras globais de nav limitadas à sidebar; componente próprio; fecha por Escape, toque fora e navegação; painel ancorado ao cabeçalho móvel. |
| Meu dia e Calendário | Cabeçalhos menores; resumo do dia com acesso direto à Revisão; controles e planner preservados. |
| Compras | Três métricas compactas em todas as larguras; listas antes do formulário; ações de criar/editar levam o foco ao campo; feedback junto ao formulário. |
| Notas | Busca e biblioteca antes do editor; foco por ref; editor permanece montado com drafts, autosave e conflitos existentes. |
| Revisão | Tempo e anel na mesma linha no celular; métricas em linhas compactas; nenhuma alteração nos cálculos. |
| Preferências | Links quebram em linhas e continuam visíveis; menu estático no mobile; avatar e ações de categorias mais compactos. |
| Busca | Lista contínua com divisórias; linha clicável e foco visível; títulos podem quebrar. |
| Lixeira | Títulos e prazos quebram; data em português; exclusão continua sujeita à confirmação. |
| Legal | Cartões usam toda a largura do grid; contato ocupa faixa completa; composição móvel com margem de leitura. |
| Recurso indisponível | Estado próprio dentro do shell, com retorno e tentativa novamente quando há falha; aplicado a nota, atividade e lista. |

## Arquitetura e revisão

- `SecondaryNavigation` possui os listeners e cleanup do menu.
- `Shopping.module.css` possui o resumo; foram retiradas suas regras antigas e
  concorrentes de refinements/editorial/theme-runtime.
- Detalhe de Compras lê o documento alvo diretamente. A listagem mantém seu limite
  de consulta e o estoque de 50 listas continua igual.
- `useUserDocument` vincula o estado a UID+path e limpa conteúdo ao falhar: uma
  assinatura anterior não pode aparecer como resultado do recurso atual.
- O foco de rota aguarda o título aparecer depois de carregamento/lazy rendering.
- Nenhuma mudança em commands, Rules, esquemas, outbox, serviço de IA ou dependências.

A revisão independente encontrou feedback distante dos formulários, foco após
carregamento, menu sticky em texto ampliado, contadores longos e estado documental
antigo. Os ajustes foram aplicados e os casos relevantes entraram na validação.

## Evidências e validação

Os snapshots canônicos de `frontend-v3-visual.spec.ts` e `public-pages.spec.ts`
foram atualizados após inspeção. `mobile-refinement.spec.ts` protege linhas do
menu em 320/390/1366 px, Escape, foco, toque fora, temas verde/claro e terracota/escuro,
nomes da navegação, conteúdo antes do composer, edição, foco assíncrono, troca de ID,
retorno de recurso inexistente e contadores longos com texto a 200%.

| Gate | Resultado |
| --- | --- |
| `npm run lint` | PASS, incluindo os limites entre camadas. |
| `npm run build` | PASS, com typecheck do cliente e servidor. |
| `npm test` | 802 testes em 70 arquivos, PASS. |
| Integração com Auth/Firestore Emulator | 320 testes em 10 arquivos, PASS. |
| `npm run test:e2e` | 17 testes do shell de produção, PASS. |
| `npm run test:e2e:local` | 181 PASS em 32,5 min; 1 falha na expectativa antiga do tamanho do retrato da Gika. |
| `gika-launcher.spec.ts` após ajuste | 2/2 PASS: rótulo visível, retrato dentro do botão, área de toque >= 44 px, abrir/fechar/foco e ações alcançáveis. |
| Comparação final com Chromium 153 do Playwright | 7/7 PASS em execução sem atualizar snapshots: frontend V3, navegação, conteúdo, recursos indisponíveis, launcher e páginas públicas. |
| Auditoria de dependências de produção | Zero vulnerabilidades. |

Integração foi executada com `FIREBASE_PROJECT_ID=demo-leve`,
`FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` e
`FIRESTORE_EMULATOR_HOST=localhost:8080`, usando
`npm run test:integration:inside`. A suíte funcional ampla e o shell foram
executados com `LEVE_CHROMIUM_EXECUTABLE=/usr/bin/chromium` (151.0.7922.173).
A configuração local inicia seu próprio servidor com o segredo de teste
compartilhado entre API e workers.

Todos os 182 cenários únicos tiveram resultado final observado PASS. A repetição
focal usa o mesmo código de aplicação da execução ampla, com a expectativa do
retrato atualizada. Os 44 px continuam exigidos para o botão; o retrato decorativo
agora compartilha esse espaço com o nome da Gika.

O CI executa os testes críticos existentes e passa a proteger também
`mobile-refinement.spec.ts`, `public-pages.spec.ts` e `gika-launcher.spec.ts`.
Em falha, preserva capturas e traces como artefatos por sete dias.

### Navegador das referências visuais

O primeiro CI do PR #19 encontrou diferenças ao comparar referências capturadas
com Chromium 151 contra o Chromium 153.0.8010.12 distribuído pelo Playwright 1.63.
O mesmo navegador reproduziu localmente os 2.325 pixels divergentes do menu.
Os diffs foram inspecionados; as referências afetadas foram recapturadas e
comparadas novamente, com as tolerâncias existentes.

Para comparação visual reproduzível, instalar o Chromium vinculado ao lockfile e
usar a configuração padrão. No workspace com cache em `/tmp`:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/leve-playwright-browsers npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/tmp/leve-playwright-browsers LEVE_CHROMIUM_EXECUTABLE= npm run test:e2e:local -- frontend-v3-visual.spec.ts mobile-refinement.spec.ts public-pages.spec.ts gika-launcher.spec.ts
```

As tentativas iniciais registraram: menu fora da tela em 320px; landmark ausente;
teste que clicava no título coberto pelo popover; espera ausente antes de medir um
resumo carregado de forma assíncrona; fixture impossível de 51 listas;
e colisão da execução simultânea de integração e browser sobre o mesmo projeto
emulado. Foram corrigidos layout/semântica e as premissas do harness. Integração
e browser passam a ser executados sequencialmente; nenhum limite de produto ou
assertion de segurança foi reduzido.

## Limites

Revisão e testes usam dados fictícios e Chromium. Instalação do PWA em aparelho
físico e leitor de tela externo não foram repetidos nesta revisão. O aviso de
chunks grandes no build já existia e permanece registrado.
