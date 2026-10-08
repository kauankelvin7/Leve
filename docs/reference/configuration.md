# Configuração e ambiente

Os nomes abaixo aparecem em [`.env.example`](../../.env.example) ou são lidos pelo código. O arquivo de exemplo não contém valores utilizáveis. Não publique valores de credenciais e não trate variáveis `VITE_` como segredos: Vite expõe as variáveis selecionadas ao cliente.

| Grupo | Nomes | Uso documentado no código |
|---|---|---|
| Cliente Firebase | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MEASUREMENT_ID` | Configuração Firebase web, notificação e valores permitidos pela configuração Vite. Alguns nomes aparecem apenas no exemplo/configuração. |
| Web e release | `VITE_APP_VERSION`, `PUBLIC_RELEASE`, `VITE_USE_EMULATORS` | Versão pública e seleção do modo Emulator no cliente. |
| Firebase Admin | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` | Identidade do projeto e credencial Admin ou hosts Emulator, conforme o runtime. |
| Servidor | `LOG_LEVEL`, `CORS_ORIGINS`, `ALLOWED_ORIGINS`, `NODE_ENV` | Nível de log, origens e modo de execução; verifique o consumidor antes de configurar. |
| Tarefas agendadas e Gika | `SCHEDULER_HMAC_SECRET`, `GEMINI_API_KEY` | Assinatura do tick e acesso ao provedor Gika nos fluxos que usam essas variáveis. São segredos. |
| Scripts locais | `LEVE_EPHEMERAL`, `JAVA_HOME`, `LEVE_RESET_SEED` | Persistência temporária, localização Java e reset dos dados sintéticos. |

Para desenvolvimento, prefira `npm run dev`, que configura o projeto demo e emuladores. Veja [scripts](scripts.md) e [guia local](../guides/local-development.md). Não copie segredos para o cliente, screenshots ou commits.
