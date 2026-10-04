# Gika — Rig-Ready Master Asset Specification

## Objetivo

Criar **uma única fonte visual de produção** da Gika preparada para rigging. Ela deve eliminar a necessidade de recortar partes de poses prontas.

O master precisa permitir avatar compacto, portrait/busto, presença maior, head turns sutis, blink, eye tracking, thinking com mão no queixo, wave, explain, focused/reading, success, error/offline, celebrate raro e secondary motion de cabelo.

O runtime não deve inventar partes ausentes.

## Formato-fonte

### Preferido
**PSD rig-ready com transparência e layers nomeadas**, mantendo cada parte visual em sua própria layer/grupo.

Razões:
- preserva a arte raster aprovada;
- Rive pode trabalhar com raster/meshes;
- mantém aberta uma eventual avaliação de Live2D;
- evita auto-trace destrutivo.

### Alternativa
SVG/vetor manualmente redesenhado e semanticamente separado, somente se a reconstrução for fiel.

### Não aceitar
- PNG achatado;
- sprite sheet como fonte primária;
- auto-trace com milhares de paths;
- JPEG;
- recortes de poses secundárias colados no master;
- partes espelhadas quando a assimetria da Gika for visível.

## Resolução

Se raster:
- canvas de trabalho sugerido: **2048 px de altura ou maior para corpo completo**;
- personagem deve ocupar a maior parte útil do canvas;
- nenhuma layer essencial deve nascer de crop de ~100 px;
- trabalhar substancialmente acima do maior uso de produto;
- background 100% transparente.

Uso previsto:
- 48–64 px compact;
- 96–140 px portrait;
- 160–240 px presence.

## Visual Lock

Imutável:
- jovem parda/morena;
- cabelo castanho escuro, cacheado, muito volumoso;
- **uma única mecha roxa permanente no lado anatômico esquerdo**;
- olhos/sobrancelhas expressivos;
- sorriso característico;
- brincos dourados simples;
- camiseta off-white com detalhe Leve;
- calça roxo/plum quando corpo estiver visível;
- identidade consistente em close-up, busto e corpo.

Ausência da mecha em imagens secundárias históricas é artefato, não variação.

## Hidden anatomy

Toda parte que pode ser descoberta durante uma animação precisa existir por baixo da parte que a cobre.

Exemplos:
- pescoço completo atrás da cabeça;
- ombros completos sob cabelo;
- torso completo sob braços;
- braço inteiro mesmo quando dobrado;
- antebraço completo sob mão;
- cabelo traseiro continua atrás do rosto;
- face base completa atrás de eyes/brows/mouth;
- hair backing suficiente para head tilt;
- camiseta continua sob antebraços e props.

Nenhum buraco pode depender da pose default para ficar escondido.

## Hierarquia recomendada

```text
GIKA_MASTER
├── HEAD
│   ├── hair_back
│   ├── neck_back_overlap
│   ├── ear_L / ear_R
│   ├── face_base
│   ├── cheek_tint
│   ├── eye_L
│   │   ├── sclera
│   │   ├── iris
│   │   ├── pupil
│   │   ├── highlight
│   │   ├── lid_upper
│   │   └── lid_lower
│   ├── eye_R
│   ├── brow_L / brow_R
│   ├── nose
│   ├── mouth
│   │   ├── neutral
│   │   ├── smile_closed
│   │   ├── smile_open
│   │   ├── clarify
│   │   └── concern
│   ├── earring_L / earring_R
│   ├── hair_front
│   ├── curl_clusters
│   └── signature_purple_curl
├── BODY
│   ├── neck
│   ├── torso_skin_underlay
│   ├── shirt_base
│   ├── shoulder_L_underlap
│   ├── shoulder_R_underlap
│   ├── arm_L
│   │   ├── upper_arm
│   │   ├── elbow_overlap
│   │   ├── forearm
│   │   ├── wrist_overlap
│   │   └── hand
│   ├── arm_R
│   ├── pelvis
│   ├── pants
│   ├── leg_L
│   │   ├── thigh
│   │   ├── knee_overlap
│   │   ├── calf
│   │   └── foot/shoe
│   └── leg_R
└── PROPS
    ├── tablet
    ├── phone
    ├── mug
    └── heart
```

## Mãos e braços

Mãos:
- esquerda e direita completas;
- dedos legíveis em 120–160 px;
- punhos completos;
- overlap de pulso;
- mesma âncora/pivot entre variants.

Variantes possíveis:
- open/wave;
- relaxed;
- chin/rest;
- point/explain;
- grip.

Braços:
- upper arm completo;
- forearm completo;
- mão;
- articulação visual de cotovelo;
- underlap acima/abaixo do cotovelo;
- pivôs anatômicos coerentes.

Nunca fundir braço e camiseta se o braço precisar mover independentemente.

## Cabelo

Separar em:
- hair_back mass;
- hair_front mass;
- 3–6 curl clusters secundários;
- signature_purple_curl;
- pequenos locks opcionais.

Não transformar cada cacho em uma layer.

A mecha:
- é layer própria;
- fica no lado anatômico esquerdo;
- nunca duplica;
- nunca é recolorida por tema;
- pode sofrer oclusão natural em perfil, mas não sumir frontalmente.

## Face

`face_base` deve existir limpa e completa por trás de eyes/brows/mouth/blush.

Olhos:
- pupils independentes;
- lids separados;
- clipping seguro;
- espaço para lookX/lookY.

Boca:
- variants consistentes com a mesma mandíbula;
- landmarks fixos;
- nunca trocar a cabeça inteira para sorrir.

## Props

Tablet, phone, mug e heart:
- layers próprias;
- podem ser ligados/desligados;
- não devem conter dedos pintados no mesmo asset se a mão animar;
- pivôs definidos;
- draw order planejado.

## Pivôs

Obrigatórios:
- neck/head;
- shoulders;
- elbows;
- wrists;
- hips;
- knees;
- ankles;
- major hair clusters.

O pivô coincide visualmente com a articulação, não com o centro da bounding box.

## Temas

A personagem tem **RGBA idêntico** em light/dark.

Tema pode mudar container, halo, background e UI.

Tema não muda pele, cabelo, roupa, mecha, olhos ou brincos.

## Asset QA antes do rig

### Anatomia
- nenhum braço termina escondido sob roupa;
- nenhum pescoço termina no queixo;
- torso existe sob braços;
- todas as juntas têm overlap.

### Identidade
- face fiel à referência aprovada;
- mecha correta;
- cabelo mantém volume;
- roupa/paleta corretas.

### Transparência
Renderizar sobre branco, cinza, Leve light, Leve dark e ciano diagnóstico.

Sem matte claro/preto.

### Separação
Mover manualmente cada layer 20–50 px no editor. Se revelar buraco indevido, asset falha.

## Deliverables do master

Obrigatórios:

```text
gika-rig-ready-master.psd
gika-rig-ready-preview.png
gika-rig-ready-layer-map.md
gika-rig-ready-validation.md
```

Opcional:
```text
gika-rig-ready-master.svg
```

O preview não substitui o PSD.

## Gate humano

Antes de rig, mostrar:
- master neutro;
- exploded view das layers;
- braços/mãos isolados;
- hidden anatomy;
- light/dark.

Somente após aprovação:
`GIKA_RIG_READY_MASTER_APPROVED`.

Sem isso, Codex não inicia bones/meshes.
