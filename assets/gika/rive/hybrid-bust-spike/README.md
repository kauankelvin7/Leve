# Gika — ensaio híbrido de busto

Fonte fiel e editável para investigação, **não asset de produção aprovado**. Doze PNGs transparentes vêm exclusivamente do busto neutro da referência aprovada; origem/máscaras/hashes em `../../source/hybrid-bust/extraction.json`. RML contém imagens com meshes, bones e pesos. Sem auto-trace, scripts, UI, controller ou persistência.

Quatro ensaios em light/dark: Rest, Idle (microgestos), BlinkProbe e OcclusionStress. Os oito artboards **não são oito estados semânticos finalizados**. BlinkProbe/Stress mostram lacunas e são reprovados deliberadamente; fundos são apenas QA. Não carregar este arquivo no produto.

Com Rive CLI oficial 1.3.0, neste diretório:

```sh
rive --verify
rive --once
rive inspect --summary
rive --screenshot=/tmp/gika-idle.png --artboard=GikaHybridIdleDark --advance=60 --viewport=89x104 --fit=contain
rive --screenshot=/tmp/gika-blink.png --artboard=GikaHybridBlinkProbeDark --advance=48 --viewport=89x104 --fit=contain
```

Linux desta execução precisou de `LD_LIBRARY_PATH=$HOME/.local/share/gika-rive-system-libs/usr/lib/x86_64-linux-gnu` no subprocesso; não é requisito/configuração do produto. `build/` é saída descartável. `.riv` versionado é o build local sem scripts, idêntico ao inspecionado; não é export final/licença para remover splash. Free/Cadet seguem ADR024.

`proof.json` registra medições, primeiras tentativas e limites. QA e regiões que exigem reconstrução localizada estão em `docs/gika/M9_EVIDENCE.md`. Próxima autoria: face limpa, pálpebras/expressões registradas, underlap/matte; repetir idle+blink antes de integração. Nenhuma vetorização integral necessária demonstrada.

Controle causal reproduzível: copiar o projeto para um diretório temporário, remover somente os filhos `Skin` de cada `Mesh` e `Weight` dos vértices, manter bones/keyframes e renderizar IdleLight no frame60. Comparar com RestLight e com a captura original: resultados observados em `proof.json`. Não usar controle sem skinning como asset.
