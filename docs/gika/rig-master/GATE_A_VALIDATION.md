# Gate A — validação do master

**Resultado: RIG_READY_MASTER_ART_SOURCE_BLOCKED.** Nenhum master rig-ready aprovado ou pronto para revisão humana foi produzido. O bloqueio é de fidelidade artística demonstrada, não ausência de editor nem limitação do Rive.

Entrada `2306314151bfb518321ed64999de50ef79d61d55`; feat/gika-integration atualizada por fast-forward de d66da17, local=origin/worktree limpo antes de trabalhar. Somente Gate A; Gate B e M9 não iniciados/retomados.

## Ferramentas verificadas

| Tool | Available | Can author layers? | PSD/SVG support | Suitable? |
|---|---|---|---|---|
| Krita | Não | — | — | Não disponível |
| GIMP | Sim,3.0.4 | Sim, editor raster | PSD; export de um master estruturado não testado | Adequado para autoria humana raster; presença do editor não garante fidelidade |
| Inkscape | Sim,1.4 | Sim, grupos/layers semânticos | SVG nativo; não PSD | Adequado; candidato manual efetivamente renderizado |
| Blender | Sim,4.3.2 | Objetos/camadas de cena | Não é fonte PSD 2D equivalente | Não escolhido; sem motivo para pipeline3D |
| ImageMagick | Sim,7.1.1-43 | Composição técnica | PSD/PNG listados; SVG não listado neste build | QA/export auxiliar; não desenha anatomia fiel sozinho |
| Pillow | Sim,12.3.0 | Composição programática | PNG; não writer PSD em layers | Usado somente para inspeção/comparação/alpha |
| psd-tools | Não | — | — | Não instalado; não resolveria desenho/fidelidade |
| XML/SVG tooling | Sim,lxml/stdlib | Estrutura semântica editável | SVG | Usado para uma tentativa manual; sem tracing automático |
| Rive CLI | Sim,1.3.0, fora do projeto | Não substitui fonte de ilustração | Referência histórica somente | Engine preservada; somente version consultado, nenhum rig/build Rive criado |

Nenhuma ferramenta/dependência instalada. SVG era alternativa tecnicamente viável; falta de PSD não foi usada como justificativa para bloquear.

## Fonte e anatomia ausente

PNG original RGB1672×941/2183940bytes, SHA256 `2aea8b3141c195d9f7ce1851a21d5baa618ad78079dbd2295649168cbf9e2fba`; JPEGs históricos preservados. Nenhuma fonte PSD/PSB/KRA/XCF/ORA foi encontrada entre os arquivos disponíveis do repositório. [Inspeção nativa](qa/gate-a-source-inspection.png).

- Pose principal: inspeção464×647, mão sobre mandíbula/pescoço e joelho sobre torso/camiseta. Não contém esses desenhos completos por trás das oclusões.
- Turnaround: região593×307 com cinco vistas; guia de geometria, não cinco personagens em alta resolução/layers. Braços/mãos continuam pequenos e parcialmente ocluídos.
- Busto neutro:119×117nativos; camadas históricas têm canvas135×133. Não são torso/braços/mãos/pernas completos nem fonte raster2048px.
- Expressões e nove poses corporais são regiões da mesma prancha achatada; referências de intenção, não peças do novo master. Nenhum overlay rejeitado reaproveitado.

O baixo tamanho raster sozinho não impede um SVG manual; por isso foi tentado um redesenho vetorial, em vez de classificar ferramenta indisponível ou simplesmente ampliar a prancha.

## Única tentativa manual e reprovação

**Formato do candidato: SVG manual, não um master aceito.**84paths explícitos,69grupos semânticos,0imagens raster embutidas,0IDs duplicados/0scripts. Render real do Inkscape786×2048 transparente. Não Potrace, quantização, auto-trace ou recortes/overlays. Candidato e script preservados somente em `/tmp/gika-gate-a`, não importados/versionados como asset da personagem.

[Comparação corporal reprovada](qa/gate-a-rejected-manual-comparison.png) e [comparação com Neutral Master](qa/gate-a-neutral-identity-comparison.png): referência à esquerda ampliada com nearest somente para inspeção; candidato à direita. A inspeção demonstrou:

1. Face/olhos/mandíbula não preservam a fisionomia aprovada.
2. Cabelo tem massas excessivamente simplificadas e outra leitura da silhueta/volume.
3. Relações cabeça/torso/pernas e roupa não correspondem suficientemente ao turnaround/autoridade visual.

A mecha permanece única à direita frontal/anatômica esquerda, mas esse item isolado não compensa a perda de identidade. Isso seria uma personagem reinterpretada, não a masterização fiel solicitada. **Rejeitado antes de qualquer rig.** Uma correção localizada não resolveria face+cabelo+corpo; exigiria segundo redesenho amplo.1tentativa principal/0correções, sem terceira reconstrução ou retorno aos overlays.

## Resultado por requisito

| Requisito | Resultado |
|---|---|
| Mesmo rosto/cabelo/proporções/estilo | FAIL no candidato; blocker principal |
| Estrutura SVG semanticamente editável | Verificada no candidato, não valida a identidade |
| Resolução e transparência |786×2048, alpha0..255,747861pixels totalmente transparentes; sem upscale raster |
| Hidden anatomy/underlaps prontos para produção | NÃO CERTIFICADOS: formas do candidato não são anatomia aprovada |
| Mãos neutra/wave/chin, face modular e hair backing aprovados | NÃO ENTREGUES em master fiel |
| Exploded/hidden-anatomy/theme matrix do master | Não criados: não existe master válido para esses gates |
| PSD/source SVG de produção | Não criados; nenhum PNG renomeado como PSD/master |
| Preview/master human review ready | NÃO; comparação é QA reprovado, não preview oficial |

Faltam artwork fiel de face/cabelo, pescoço/ombros/torso/camiseta ocultos, upper arms/forearms/wrists/hands completos e articulações com continuidade, além de anatomia/pants/legs coerentes quando incluídos. O candidato técnico comprova capacidade de estruturar/renderizar SVG; não comprova capacidade de completar esse artwork com a fidelidade exigida nesta execução.

## Verificação e escopo

[Registro de hashes/alpha/estrutura](qa/gate-a-validation.json). PNGs abertos/inspecionados; SVG do candidato parseado; referências e baseline histórico intactos. Alpha e nomes são prova técnica do candidato, não PASS visual ou master rig-ready. Theme matte/exploded não usados para mascarar falha de identidade.

Somente evidência QA/documentação/estado. Produto, Neutral Master anterior, Rive/scene/bones/SM/controller/runtime, Auth/Rules/commands/policy/receipts/voice/Gemini e dependências permanecem byte-idênticos à entrada. Sem build/configuração, regressão M9, rig, animações, integração, deploy, PR, main, Cadet/export/publicação final. Rive continua engine principal; nenhuma decisão Spine/Live2D/Lottie reaberta.

**PARADO em Gate A.** Não emitir GIKA_RIG_READY_MASTER_HUMAN_REVIEW_REQUIRED/GIKA_RIG_READY_MASTER_APPROVED; não iniciar Gate B.
