# Hybrid Bust v2 — autoria, fora do produto

Fonte primária PNG original em `docs/gika/character/reference/gika-authoring-v2-original.png` (hash em extraction.json). V1/JPEGs preservados.14texturas RGBA: backing de pele localizado, olhos abertos, lashes fechadas registradas da expressão Carinhosa, brows/boca, cabelo e mecha própria. Sem ML/geração/trace. RML reutiliza o rig v1; idle agora inclui blink. Quatro ensaios×dois fundos de QA; não são estados finais/renderer do produto.

Fontes em `assets/gika/source/hybrid-bust-v2`; reconstrução determinística em author.py. Pillow/NumPy/SciPy são ferramentas de autoria já presentes no ambiente, **não dependências do Leve**. Rive CLI oficial1.3.0.

Na raiz do repositório:

```sh
python assets/gika/source/hybrid-bust-v2/author.py /tmp/gika-v2
python assets/gika/rive/hybrid-bust-v2/qa.py /tmp/gika-v2 --capture
```

O segundo comando usa `rive` do PATH; opcional `GIKA_RIVE_CLI` aponta para o binário oficial. Linux desta execução precisou de LD_LIBRARY_PATH dos libsGLES locais no subprocesso (mesmo ambiente do v1). Não alterar produto por essa configuração. QA captura52frames nativos+48tamanhos e checa backing, seam, identidade espacial da mecha e rest contra fonte; gera sheets/APNG para inspeção. Capturas não substituem avaliação artística.

Neste diretório: `rive --verify`, `rive --once`, `rive inspect --summary`. `.riv` versionado é byte-idêntico ao build inspecionado, unsigned/sem ScriptAsset, não export final sem splash. Fundos são QA; sem consumidor/public/UI/React/controller. Free/Cadet conforme ADR024.

QA24/32/36/48/64/72px light/dark e sequência de blink em docs/gika/character/qa; proof.json registra falhas iniciais/correções. Mecha permanente conforme ordem de autoridade do Visual Lock: nunca copiar ausência de pose doadora nem forçar visibilidade em perspectiva naturalmente oculta. Este busto é frontal, lado esquerdo exposto e sempre verificado.

Não declara HD240/fullbody, demais motions, browser lifecycle/performance, integração ou Character Foundation concluídos. Listening/thinking seguem após gate idle/blink; nenhuma integração autorizada neste v2.
