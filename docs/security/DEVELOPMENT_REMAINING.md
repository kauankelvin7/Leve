# Vulnerabilidades restantes no tooling de desenvolvimento

Audit completo28→14 (high11→6/moderate17→8); audit de produção13→0. Todas as14 entradas restantes já constavam no audit de a922594, mesmas versões/ranges/advisories e nodes devOnly comprovados em development-advisories.json. Não foram ocultadas e CI não foi alterado.

| Pacote/severidade | Versões | Cadeia (dev, versão afetada) | Advisory ou herança |
|---|---|---|---|
|@google-cloud/pubsub/moderate|5.3.1|firebase-tools@15.30.0 → @google-cloud/pubsub@5.3.1|@opentelemetry/core|
|@opentelemetry/core/moderate|1.30.1|firebase-tools@15.30.0 → @google-cloud/pubsub@5.3.1 → @opentelemetry/core@1.30.1|https://github.com/advisories/GHSA-8988-4f7v-96qf|
|basic-ftp/high|5.3.1|firebase-tools@15.30.0 → proxy-agent@6.5.0 → pac-proxy-agent@7.2.0 → get-uri@6.0.5 → basic-ftp@5.3.1|https://github.com/advisories/GHSA-c475-qrg2-pj4r|
|brace-expansion/high|1.1.18, 2.1.4|eslint-plugin-import@2.32.0 → minimatch@3.1.5 → brace-expansion@1.1.18|https://github.com/advisories/GHSA-6j4f-fj2g-mc7p, https://github.com/advisories/GHSA-q2hr-2g5m-vwhr, https://github.com/advisories/GHSA-qhr7-859c-m2p7|
|csv-parse/moderate|5.6.0|firebase-tools@15.30.0 → csv-parse@5.6.0|https://github.com/advisories/GHSA-8cw4-87c7-c6xx|
|express/moderate|4.22.2|firebase-tools@15.30.0 → express@4.22.2|qs|
|fast-uri/moderate|3.1.7|firebase-tools@15.30.0 → ajv@8.20.0 → fast-uri@3.1.7|https://github.com/advisories/GHSA-hrr3-gc8f-f4qj|
|firebase-tools/high|15.30.0|firebase-tools@15.30.0|@google-cloud/pubsub, csv-parse, proxy-agent, stream-json|
|get-uri/high|6.0.5|firebase-tools@15.30.0 → proxy-agent@6.5.0 → pac-proxy-agent@7.2.0 → get-uri@6.0.5|basic-ftp|
|ip-address/moderate|10.7.0|firebase-tools@15.30.0 → @modelcontextprotocol/sdk@1.30.0 → express-rate-limit@8.7.0 → ip-address@10.7.0|https://github.com/advisories/GHSA-h3mg-xc3c-68pw, https://github.com/advisories/GHSA-j6r3-76f7-8jcv|
|pac-proxy-agent/high|7.2.0|firebase-tools@15.30.0 → proxy-agent@6.5.0 → pac-proxy-agent@7.2.0|get-uri|
|proxy-agent/high|6.5.0|firebase-tools@15.30.0 → proxy-agent@6.5.0|pac-proxy-agent|
|qs/moderate|6.15.3|firebase-tools@15.30.0 → express@4.22.2 → qs@6.15.3|https://github.com/advisories/GHSA-4mjr-xmp4-gh2g, https://github.com/advisories/GHSA-x5fp-wj9c-mxmx|
|stream-json/moderate|1.9.1|firebase-tools@15.30.0 → stream-json@1.9.1|https://github.com/advisories/GHSA-528h-pc64-c93x|

## Alcance e motivo técnico de adiamento

São transitivas de ferramentas dev, sobretudo firebase-tools15.30.0 (CLI/emuladores/deploy tooling) e eslint-plugin-import/minimatch/glob (lint/padrões), não imports/bundle/backend de produção. A presença devOnly no lockfile e audit omitdev0 não significa segurança absoluta da estação: CLI ainda pode processar dados/configurações/rede adversariais. Nesta tarefa só fixtures confiáveis/local emulators; não deploy nem credenciais reais.

- basic-ftp/get-uri/pac-proxy-agent/proxy-agent: superfície de obtenção de URLs/proxy/PAC/FTP no CLI. Tratar proxy/configuração/servidor remoto malicioso como risco real do tooling; não classificar como impossível.
- brace-expansion: expansão de padrões glob em archiver/superstatic/glob; inputs/padrões excessivos podem afetar disponibilidade do processo CLI.
- csv-parse/stream-json/fast-uri: parsing/import/URI pelo CLI, potencial disponibilidade/integridade quando fontes são adversariais; não há novo caminho de produção Gika.
- ip-address: parsers/endereço utilizados pelo proxy tooling, incluindo riscos dos dois advisories públicos listados.
- qs/express interno do firebase-tools: parsing HTTP/objetos no CLI/emuladores. Não é o Express5.2.1 da API; manter emuladores locais não elimina todo risco de inputs adversariais.
- @opentelemetry/core/@google-cloud/pubsub: propagação/contexto/telemetria do CLI; não foram adicionados analytics na Gika.

Motivo de não corrigir nesta etapa: alvo autorizado eram as13 entradas de produção, eliminadas com dois patches/overrides auditados. Correção dessas cadeias exige análise de firebase-tools15.32.1 e/ou upgrades parser/glob/proxy transitivos, com regressões próprias de CLI/import/hosting/proxy além dos gates atuais. Não aplicar um override major genérico nem misturar upgrade de tooling amplo para zerar outro contador. Algumas correções são compatíveis segundo audit, mas precisam ser avaliadas como tarefa separada, sem ignorar CI/audit. Os fixAvailable e cadeias completas estão no JSON para essa próxima revisão.
