# Gika — decisão técnica de animação e arquitetura

**Status de entrada:** `feat/gika-integration @ d66da17e0655e546a20eb62f48faa0b102cdd938`

## Decisão

**Manter Rive como engine principal. Não trocar agora.**

O problema demonstrado não foi incapacidade do Rive, e sim a matéria-prima: uma prancha raster achatada foi tratada como se fosse um asset rig-ready. Isso obrigou recortes/overlays e gerou aparência de colagem.

Rive já fornece o conjunto que precisamos: skeletal animation, meshes, binding/weights, constraints, IK, animation mixing, nested artboards, State Machines e runtime React/Web.

## Como produtos grandes fazem

O padrão de produção observado é:

1. arte preparada para rig;
2. separação modular de cabeça, corpo, face, cabelo, membros e props;
3. rig/skeleton com joints, meshes, weights e underlaps;
4. timelines pequenas e reutilizáveis;
5. State Machine misturando cabeça, corpo, face e gestos;
6. engenharia conduzindo estados com dados;
7. inputs/contratos documentados;
8. QA visual humano antes da integração final.

No case oficial da Lily, do Duolingo, a equipe separou head/body em nested artboards e combinou 8 animações de cabeça com 8 de corpo, gerando mais de 64 variações neutras. O workflow também separa motion/timelines, State Machine e integração de engenharia.

Para a Gika: **Codex não deve inventar anatomia ausente**. Ele pode implementar rig, timelines, controller e integração, mas precisa receber uma fonte visual realmente preparada.

## Alternativas

| Opção | Pontos fortes | Limitações | Decisão |
|---|---|---|---|
| **Rive** | State Machine nativa, React/Web runtime, meshes+bones+weights+IK, mixing, nested artboards | exige fonte rig-ready | **Principal** |
| **Spine Professional** | skeletal animation madura, IK, weighted meshes, attachment swaps, mixing/crossfade | custo e refatoração de runtime | **Plano B técnico** |
| **Live2D Cubism** | excelente deformação 2D com PSD separado | também exige arte preparada; pipeline diferente | **Plano B artístico** |
| **Lottie** | ótimo para motion pré-composto | não é character rig modular interativo | **Não usar como engine principal** |

## Critério de troca de engine

Rive só deve ser abandonado se, **com um Rig-Ready Master aprovado**, um spike limitado não conseguir entregar:

1. `idle` — respiração/blink sem deformar identidade;
2. `think_chin` — braço articulado sobe ao queixo e retorna, sem pop/recorte;
3. `wave` — braço/mão articulados, com transição limpa;

em 96/120/160 px, light/dark e reduced motion, sem teleport, juntas abertas ou mudança de identidade.

Se a causa for arte, corrigir o master. Se for limitação comprovada da engine, avaliar Spine. Se a prioridade migrar para deformação facial/upper-body extremamente orgânica, avaliar Live2D.

## Conclusão

**Não trocar de Rive. Trocar o pipeline de arte.**

Fluxo:

`master → rig → 3-motion spike → revisão humana → motion library → integração → regressão M9`

Sem master válido, nenhum agent deve voltar a recortar poses da prancha aprovada.

## Referências de pesquisa

- Rive — Duolingo/Lily: https://framer.rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life
- Rive — Creative technologists: https://framer.rive.app/blog/creative-technologists-duolingo-s-solution-to-the-designer-to-developer-handoff
- Rive — Features: https://rive.app/features
- Rive — PSD + raster mesh deformation: https://rive.app/blog/new-features-released-mesh-deformation-and-psd-support
- Rive — Mobile apps: https://rive.app/use-cases/mobile-apps
- Rive — Pricing: https://rive.app/pricing
- Spine — Runtimes: https://esotericsoftware.com/spine-runtimes
- Spine — In Depth: https://esotericsoftware.com/spine-in-depth
- Spine — Purchase: https://esotericsoftware.com/spine-purchase
- Live2D — PSD import: https://docs.live2d.com/en/cubism-editor-manual/psd-import/
- Live2D — Preparing illustration: https://docs.live2d.com/en/cubism-editor-tutorials/import/
- Live2D — SDK for Web: https://docs.live2d.com/en/cubism-sdk-manual/cubism-sdk-for-web/
