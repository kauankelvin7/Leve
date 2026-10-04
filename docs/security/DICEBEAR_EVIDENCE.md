# DiceBear security patch

Entrada a922594 limpa/branch chore/security-hardening. Somente @dicebear/core e @dicebear/avataaars9.4.2→9.4.3, versões exatas/lock integrity registry. Pequena normalização npm de metadado libc em pacotes opcionais dev foi descartada para preservar bytewise demais entradas. Nenhuma dependência Firebase alterada nesta etapa.

GHSA-gcr2-9v8m-gq45 eliminado: audit omitdev13→12 (4high/9moderate→4high/8moderate). Rotação maliciosa produz script markup na versão9.4.2 (RED observado sem executar script),9.4.3 não injeta (GREEN/teste regressão). As seis opções padrão têm SVG SHA256 idêntico antes/depois, hash público de fixture avatar-baseline.json, sem dados pessoais. Licenças core/code MIT/Avataaars design livre pessoal/comercial intactas.

Lint exit0, build/dois TS exit0,325 unit/41 arquivos PASS. Dois E2E novos desktoplight/mobile-dark: imagensSVG/dataURI realmente carregadas/naturalWidth>0; refresh opções, escolher seed, profile.update convencional/ack applied e persistência/imagem idêntica após reload. Auth/API/Firestore reais emulados demo-leve, somente fixtures. Nenhum pageerror, screenshot/trace privado versionado, provider/chave/live ou alteração de UI/policy/domínio/Rules.

Commit atômico separado para DiceBear inclui inventário/plano/provas/estado. Hardening Firebase/Google continua separado, não M5-T2. Baselines restantes não ocultados; aguardam etapa seguinte.
