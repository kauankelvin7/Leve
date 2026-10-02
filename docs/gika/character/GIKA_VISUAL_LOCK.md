# Gika — identidade visual aprovada

Fonte: **user-approved visual reference**, imagem `46737.jpg` anexada pelo usuário ao pedido GIKA_RIVE_PRODUCTION_TO_RC. A referência visual prevalece sobre descrições históricas; não autoriza uma nova personagem.

[Referência original](reference/gika-approved-reference.jpg): JPEG, 1280×960, 223.809 bytes. SHA-256: `f2fd8858087f663c473586e79445af8d837fc00296b88215e6975941828b8b05`. Cópia byte a byte: preservamos `.jpg`, em vez do `.png` sugerido, para não re-renderizar nem identificar incorretamente o formato. Não é um master vetorial ou asset de runtime.

## Identidade congelada

- Mulher jovem parda/morena; cartoon 2D limpo, caloroso, humano e autoral, equilibrando delicadeza e maturidade. Brasileira sem caricatura cultural.
- Rosto, proporções dos olhos escuros, sobrancelhas, nariz, boca/sorriso e relação cabeça/corpo seguem a referência. Expressões e vistas devem continuar reconhecíveis como a mesma pessoa.
- Cabelo castanho escuro, cacheado e volumoso. Preservar silhueta/massa com clusters animáveis, sem textura fotográfica ou milhares de fios.
- **Uma assinatura roxa principal no lado anatômico esquerdo da Gika: à direita de quem vê a imagem frontal.** Camada própria `signature_purple_curl`; não espelhar, trocar de lado, adicionar outras mechas ou espalhar highlights roxos. Vistas laterais seguem o lado anatômico, não uma posição fixa na tela.
- Camiseta off-white com acabamento roxo e símbolo discreto do Leve, calça ampla ameixa, tênis claros/lilás e brincos dourados simples. Sem novos acessórios.
- A pose sentada principal, as cinco vistas do turnaround, expressões e gestos são referências da mesma identidade; não substituir por nova prancha gerada.

Paleta nomeada na prancha: roxo `#5B2A86`, lilás `#A46CCE`, creme `#FFF4E8`, pele `#B66A43`, cabelo `#3A241B`; apoio `#3E1B58`, `#7E4DB8`, `#F7D6E8`, `#E9DFFF`, `#FFB84D`. Esses valores orientam a personagem, não substituem tokens do Leve nem autorizam recolorir o JPEG aprovado.

Reprovar: outra fisionomia, mudança de anatomia/proporções/volume do cabelo entre estados, mecha espelhada ou extra, mãos deformadas, infantilização/chibi, sexualização, anime genérico, robô, pele plástica, 3D brilhante, sombras fotográficas, expressão exagerada constante ou motion frenético.

## Master e rig: critérios, ainda não entregues

Master SVG editável com camadas semânticas: HEAD (face/orelhas/sobrancelhas/olhos/pálpebras/nariz/bocas), HAIR (massas/clusters/mecha própria), BODY (pescoço/torso/braços/antebraços/mãos), CLOTHING, ACCESSORIES e SHADOWS. Definir pivôs coerentes. Raster encapsulado, auto-trace não revisado e vetor genérico não atendem ao requisito.

Fallbacks avatar/busto/estático devem derivar desse mesmo master. Validar 24/32/48/72/120/240 px e turnaround frente/3⁄4/perfil/3⁄4 costas/costas; preservar mecha anatômica e proporções em cada vista. Antes de demais motions, comparar idle+blink renderizados com a referência, incluindo rosto/cabelo/mecha/olhos e observação prolongada. A revisão deve detectar espelhamento; ainda não há asset executável para testar essa regressão.

## Contrato de movimento preservado

Estados semânticos previstos: idle, hello, listening, thinking, clarify, confirm, success, celebrate, attention, error, offline, resting. Predominam microgestos discretos; celebração rara; animação nunca bloqueia interação. Reduced motion/fallback devem preservar identidade.

- `VOICE_CAPTURE_STARTED → listening`: somente captura de voz real.
- `REQUEST_STARTED → thinking`: envio textual não é listening.
- Success somente após ack real; confirmar não chama Gemini nem a personagem executa comandos.
- UI/evento técnico tipado → controller determinístico → adapter visual → rig. Nenhum UID/ID/título/prompt/resposta/transcrição/áudio/token/receipt entra no controller ou rig; Gemini não escolhe animação.

Não criar runtime/controller antes de master/rig e spike funcionais. GikaMark atual permanece até existir substituto legítimo; sua permanência não conclui a Character Foundation.

## Fontes e aceite pendente

As seis especificações históricas estão em `design/gika-character-foundation@3b3011c8b4ea0a5a19b5d7f18be06eb18767d8db`: CHARACTER_SCOPE e character/{CHARACTER_BIBLE,MOTION_SYSTEM,TECHNICAL_ARCHITECTURE,INTEGRATION_PLAN,ACCEPTANCE_CRITERIA}. A ordem antiga anterior ao M6 e o gatilho histórico input-enviado/listening são superados pelo pedido atual; não integrar aquela branch cegamente.

Visual lock é concluído; master, fallbacks oficiais, rig da Gika, motions e QA no produto **não**. Ferramenta e licença atuais são registradas em [M9_EVIDENCE](../M9_EVIDENCE.md). Não declarar `M9_DONE_RC_READY` sem esses artefatos e gates. R$0 permanece obrigatório; splash oficial do plano Free exige decisão humana antes da integração final, conforme seção 4.2 do plano fornecido.
