# Gika — identidade visual aprovada

Fonte: **user-approved visual reference**, imagem `46737.jpg` anexada pelo usuário ao pedido GIKA_RIVE_PRODUCTION_TO_RC. A referência visual prevalece sobre descrições históricas; não autoriza uma nova personagem.

[Referência original](reference/gika-approved-reference.jpg): JPEG, 1280×960, 223.809 bytes. SHA-256: `f2fd8858087f663c473586e79445af8d837fc00296b88215e6975941828b8b05`. Cópia byte a byte: preservamos `.jpg`, em vez do `.png` sugerido, para não re-renderizar nem identificar incorretamente o formato. Não é um master vetorial ou asset de runtime.

## Autoridade visual e mecha permanente

Ordem de autoridade: **pose principal grande → painel Detalhes da mecha → busto neutro aprovado → turnaround para geometria → expressões/poses secundárias somente para expressão e gesto**.

A ausência da mecha em algumas poses secundárias é inconsistência da prancha, não decisão de design. `signature_purple_curl` é permanente no lado anatômico esquerdo. Quando esse lado estiver exposto, normalizar a camada conforme a referência principal; quando a perspectiva/cabelo o ocultar naturalmente, não forçar visibilidade.

Ao derivar expressões/gestos, reutilizar a camada do master quando geometricamente compatível, preservando forma, volume e lado anatômico. Não copiar ausência acidental, gerar outra mecha por IA ou recolorir outros cachos. Extração de pálpebras/bocas não pode substituir o cabelo/mecha do master pela pose doadora.

**Gate de QA:** avaliar exposição/oclusão real em cada pose/estado; verificar mecha permanente no lado correto quando exposto, coerência com pose principal/Detalhes e ausência de mechas extras/recoloração. Gate obrigatório também nos frames de transição, não apenas no rest. Turnaround orienta geometria sem sobrepor inconsistências à identidade.

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

Fonte editável em camadas semânticas; o pedido posterior autoriza busto híbrido: PNGs transparentes fiéis + meshes/bones Rive, com vetores somente onde necessários. Separar face/olhos/pálpebras/sobrancelhas/bocas, hair back/front/clusters e signature_purple_curl, pescoço/ombros e braços mínimos quando disponíveis. Definir pivôs/pesos e reconstruir somente regiões ocultas necessárias. Não exigir SVG integral nem rig corporal universal. Imagem achatada sem rig, auto-trace não revisado e personagem genérica continuam insuficientes.

Fallbacks avatar/busto/estático devem derivar desse mesmo master. Validar 24/32/48/72/120/240 px e turnaround frente/3⁄4/perfil/3⁄4 costas/costas; preservar mecha anatômica e proporções em cada vista. Antes de demais motions, comparar idle+blink renderizados com a referência, incluindo rosto/cabelo/mecha/olhos e observação prolongada. A revisão deve detectar espelhamento; o ensaio híbrido executável já preserva o lado da mecha, mas não é rig final aprovado.

## Contrato de movimento preservado

Estados semânticos previstos: idle, hello, listening, thinking, clarify, confirm, success, celebrate, attention, error, offline, resting. Predominam microgestos discretos; celebração rara; animação nunca bloqueia interação. Reduced motion/fallback devem preservar identidade.

- `VOICE_CAPTURE_STARTED → listening`: somente captura de voz real.
- `REQUEST_STARTED → thinking`: envio textual não é listening.
- Success somente após ack real; confirmar não chama Gemini nem a personagem executa comandos.
- UI/evento técnico tipado → controller determinístico → adapter visual → rig. Nenhum UID/ID/título/prompt/resposta/transcrição/áudio/token/receipt entra no controller ou rig; Gemini não escolhe animação.

Não criar runtime/controller antes de master/rig e spike funcionais. GikaMark atual permanece até existir substituto legítimo; sua permanência não conclui a Character Foundation.

## Fontes e aceite pendente

As seis especificações históricas estão em `design/gika-character-foundation@3b3011c8b4ea0a5a19b5d7f18be06eb18767d8db`: CHARACTER_SCOPE e character/{CHARACTER_BIBLE,MOTION_SYSTEM,TECHNICAL_ARCHITECTURE,INTEGRATION_PLAN,ACCEPTANCE_CRITERIA}. A ordem antiga anterior ao M6 e o gatilho histórico input-enviado/listening são superados pelo pedido atual; não integrar aquela branch cegamente.

Visual lock é concluído; master, fallbacks oficiais, rig da Gika, motions e QA no produto **não**. Ferramenta/licença/ensaios atuais são registrados em [M9_EVIDENCE](../M9_EVIDENCE.md). Não declarar `M9_DONE_RC_READY` sem esses artefatos e gates.

Autorização posterior do usuário (ADR024): Rive Free durante criação/rig/animação/validação, splash permitido somente no desenvolvimento. Produção sem splash obrigatória; Cadet autorizado na exportação final **após** asset/rig integralmente aprovados. Sem assinatura antecipada nem troca de tecnologia. A decisão financeira não bloqueia desenvolvimento.

Os [ensaios 01](qa/rejected-vectorization-01.png) e [02](qa/rejected-vectorization-02.png) são QA **reprovado**, não master/avatar/fallback. Auto-trace auxiliar deixou lacunas/fragmentação e componentes de outra vista, sem anatomia editável adequada ao rig. A reprovação permanece; a conclusão histórica `VECTOR_ASSET_HUMAN_REFINEMENT_REQUIRED` não é impedimento definitivo: o pipeline raster+mesh+bone foi comprovado depois (ADR025). Ensaio em assets/gika/rive/hybrid-bust-spike; rest/idle mantêm a referência, blink evidencia falta de backing de pele. Reconstrução localizada, registro de expressões e matte/underlap ainda necessários; não aceitar ensaio como personagem final.


## Histórico — primeira fonte recebida para Hybrid Bust v2

O usuário aprovou o spike como direção técnica, **não a integração**, e forneceu nova prancha como fonte visual primária para autoria. [Arquivo recebido v2](reference/gika-authoring-v2-received.jpg) preservado byte a byte: JPEG real1280×720,186821bytes, SHA256 `5d91424e00842b2df08515caeba4bb9426bb377fad7bc6520890d865f16efb22`. Não é o PNG original de alta qualidade descrito no pedido. JPEG anterior permanece intacto para proveniência do spike v1; não renomear/converter JPEG como se fosse fonte PNG original. Nenhuma identidade/mecha/contrato muda.

Naquele checkpoint, autoria v2 aguardava o arquivo original descrito; não há conclusão de redesenho manual obrigatório nem tentativa generativa. Recorte de inspeção da pose neutra `(365,319)–(456,409)`,91×90px, não demonstra ganho de resolução sobre89×104px anteriores. Somente depois da fonte correta: backing localizado/closed lids registrados/underlap/matte, QA rest+idle+blink+stress light/dark e pequenos tamanhos. Integração proibida neste pedido; listening/thinking condicionados ao gate visual idle/blink, sem Controller/React antecipado.


## Hybrid Bust v2 — PNG original recebido e autoria validada

[Fonte PNG primária para autoria](reference/gika-authoring-v2-original.png), recebida dentro de ZIP: RGB1672×941,2183940bytes, SHA256 `2aea8b3141c195d9f7ce1851a21d5baa618ad78079dbd2295649168cbf9e2fba`. JPEGs e spikev1 intactos para proveniência. A pendência SOURCE_ORIGINAL_PNG_REQUIRED acima é histórica/resolvida, não um bloqueio atual.

Busto neutro119×117nativos;14camadas, backing localizado/pálpebras da Carinhosa registradas/underlap apenas oculto/matte. Master da mecha completo isolado antes de olhos/rosto:415pixels canônicos de roxo do cabelo pertencem à camada própria, sem recolorir ou gerar pixels. Donor transmite somente lashes, nunca cabelo ou ausência acidental de mecha. Inspeção do ensaio rest/idle/blink/stress em light/dark e24–72px,52frames de transição/motion+48capturas pequenas; mecha sempre à direita frontal, sem exposure holes no interior do rosto/pescoço.

QA de autoria v2 PASS, distinto de aprovação integral humana do asset/rig/estados e QA no produto. Fontes em assets/gika/source/hybrid-bust-v2 e rig em assets/gika/rive/hybrid-bust-v2. Não integrado; demais motions/Controller/React não concluídos. Detalhes/primeiras falhas em M9_EVIDENCE. Resolução suficiente para o busto pequeno testado; não presumir masterHD240/corpo universal.
