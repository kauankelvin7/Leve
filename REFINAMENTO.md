 Leve — Refinamento de produção

## Stack obrigatória (não mudar sem nova ADR)
- Frontend: SPA React + TypeScript + Vite hospedada na Vercel Hobby
- Auth: Firebase Authentication (email/senha + Google)
- Banco: Firestore (NoSQL, plano Spark, sem billing ativo)
- Backend: Vercel API Routes (serverless, sem Express persistente)
- Cron/Jobs: Cloudflare Workers Free (mínimo possível, ≤10ms CPU/invocação)
- Push: Firebase Cloud Messaging (HTTP v1)
- Relatório de referência: Leve-Relatorio-de-Engenharia.md (você já tem acesso)

## RESTRIÇÃO INEGOCIÁVEL
Custo zero absoluto. Não instalar Redis, Cloud Functions, Cloud Tasks,
Firebase Storage, Workers Paid, Vercel Pro ou qualquer pacote que exija
serviço com faturamento. Verificar antes de qualquer `npm install`.

Analise toda a base de código antes de implementar qualquer item.
Para cada bloco: documente o que encontrou, o que implementou
e justifique por escrito quando decidir não implementar algo.

---

## BLOCO 1 — Autenticação quebrada [PRIORIDADE 1, FAZER PRIMEIRO]

### 1.1 Verificação de e-mail Firebase
O usuário não consegue entrar no sistema.

Rastreie o fluxo completo:

**No registro (createUserWithEmailAndPassword):**
- `sendEmailVerification(user)` está sendo chamado imediatamente após criar a conta?
- Se não, implemente chamando logo após o registro com ActionCodeSettings
  que aponta para a URL do app (`url: window.location.origin`)
- Exibir mensagem clara: "Confirme seu e-mail para continuar. Verifique sua caixa
  de entrada e spam."
- Botão "Reenviar e-mail" com cooldown de 60s (evitar abuso da cota do Firebase)

**No login (signInWithEmailAndPassword):**
- Após autenticar, checar `user.emailVerified`
- Se `false`: chamar `await auth.signOut()` imediatamente e retornar erro
  com mensagem clara + opção de reenviar confirmação
- Se `true`: prosseguir normalmente para criação/ativação de membership

**Na API (todas as Vercel API Routes protegidas):**
- Verificar `decodedToken.email_verified === true` após
  `admin.auth().verifyIdToken(idToken)`
- Se `false`: retornar `{ error: "E-mail não verificado", code: "EMAIL_NOT_VERIFIED" }`
  com HTTP 403
- Esta verificação deve ser parte do middleware `withAuth` (ver Bloco 4)

**Testar com Firebase Auth Emulator antes de apontar para produção.**
O Emulator permite simular verificação de e-mail sem envio real.

### 1.2 Proteção de rotas no frontend
- Toda rota da SPA que exige sessão deve verificar `user.emailVerified === true`
- Usuário autenticado mas sem e-mail verificado: redirecionar para tela de
  "Confirme seu e-mail", não para a agenda
- Usuário não autenticado: redirecionar para login

---

## BLOCO 2 — Sanitização e Segurança (XSS)

### 2.1 Frontend
- Instalar `dompurify` + `@types/dompurify`
- Aplicar `DOMPurify.sanitize()` em qualquer campo que renderize HTML de usuário
  (ex: notas com grifo, descrições de atividade com formatação)
- Nunca usar `dangerouslySetInnerHTML` sem passar pelo DOMPurify
- O editor de notas (Tiptap/ProseMirror) deve ter schema explícito que rejeite
  nós e atributos não declarados — o schema é a primeira linha de defesa

### 2.2 Backend (API Routes)
- Sanitizar todos os campos de texto antes de persistir no Firestore:
  remover HTML onde texto puro é esperado (título, nomes, categorias),
  limitar tamanho por tipo de campo conforme limites do relatório
- Para campos que aceitam rich text (nota, descrição): serializar apenas o
  schema aprovado do editor, nunca aceitar HTML arbitrário da requisição

### 2.3 Firestore Security Rules
Adicionar validação de tipo e tamanho nas Rules para cada coleção:

// Exemplo para activities
allow create: if request.auth != null
&& request.auth.token.email_verified == true
&& request.resource.data.title is string
&& request.resource.data.title.size() > 0
&& request.resource.data.title.size() <= 200
&& request.resource.data.uid == request.auth.uid;

O cliente nunca deve escrever diretamente no Firestore —
confirmar que todas as coleções exigem autenticação do servidor
e bloqueiam escrita direta do cliente onde o relatório especifica "Não".

### 2.4 Headers de segurança via vercel.json
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://apis.google.com; connect-src 'self' https://*.googleapis.com https://*.firebase.io wss://*.firebaseio.com; frame-src https://accounts.google.com"
        },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```
Ajustar a CSP para não quebrar Firebase, Google OAuth e FCM —
testar no browser com o console de erro de CSP aberto.

---

## BLOCO 3 — Rate Limiting (custo zero, sem Redis)

A coleção `usageBuckets/{uid_period}` já está prevista no modelo de dados.
Implementar usando ela:

### 3.1 Lógica de rate limit
```typescript
// Janela de 1 minuto: chave "uid_2026-09-12T14:35"
// Janela de 1 dia: chave "uid_2026-09-12"
async function checkRateLimit(uid: string): Promise<void> {
  const minuteKey = `${uid}_${currentMinuteISO()}`
  const dayKey = `${uid}_${currentDateISO()}`
  
  await db.runTransaction(async (tx) => {
    const minuteRef = db.collection('usageBuckets').doc(minuteKey)
    const dayRef = db.collection('usageBuckets').doc(dayKey)
    
    const [minuteDoc, dayDoc] = await Promise.all([
      tx.get(minuteRef), tx.get(dayRef)
    ])
    
    const minuteCount = minuteDoc.exists ? minuteDoc.data()!.count : 0
    const dayCount = dayDoc.exists ? dayDoc.data()!.count : 0
    
    if (minuteCount >= 60) throw new RateLimitError('Limite por minuto excedido')
    if (dayCount >= 1000) throw new RateLimitError('Limite diário excedido')
    
    tx.set(minuteRef, { count: FieldValue.increment(1), uid, expiresAt: endOfMinute() }, { merge: true })
    tx.set(dayRef, { count: FieldValue.increment(1), uid, expiresAt: endOfDay() }, { merge: true })
  })
}
```

### 3.2 Rate limit de login por IP
Para `/api/auth/*`: usar o header `x-forwarded-for` (Vercel injeta automaticamente)
como chave de rate limit: `usageBuckets/ip_{ip}_login_{currentMinute}`.
Limite: 10 tentativas de login por 15 minutos por IP.
Retornar HTTP 429 com header `Retry-After: 900` quando excedido.

### 3.3 Proteção contra listener em loop
Auditar todos os `onSnapshot` no frontend:
- Todo `onSnapshot` deve ter o unsubscribe armazenado e chamado no
  `return` do `useEffect`
- Verificar se há listeners duplicados registrados por re-render
- Um listener em loop pode esgotar as 50k leituras/dia sozinho

---

## BLOCO 4 — Middlewares para Vercel API Routes

Vercel API Routes são serverless — não há Express. Criar padrão de composição:

```typescript
// server/middleware/index.ts

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>

// Verificar token Firebase + email_verified + membership ativa
export function withAuth(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Não autenticado', code: 'UNAUTHENTICATED' })
    
    const decoded = await admin.auth().verifyIdToken(token)
    if (!decoded.email_verified) {
      return res.status(403).json({ error: 'E-mail não verificado', code: 'EMAIL_NOT_VERIFIED' })
    }
    
    const membership = await getMembership(decoded.uid)
    if (!membership?.active) {
      return res.status(403).json({ error: 'Conta inativa', code: 'ACCOUNT_INACTIVE' })
    }
    
    req.user = { uid: decoded.uid, email: decoded.email! }
    return handler(req, res)
  }
}

// Rate limit usando usageBuckets
export function withRateLimit(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    try {
      await checkRateLimit(req.user!.uid)
      return handler(req, res)
    } catch (e) {
      if (e instanceof RateLimitError) {
        return res.status(429).json({ error: e.message, code: 'RATE_LIMITED' })
      }
      throw e
    }
  }
}

// Sanitizar req.body antes de chegar no handler
export function withSanitize(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    req.body = sanitizeBody(req.body) // remover HTML de campos texto puro
    return handler(req, res)
  }
}

// Capturar todo erro e retornar JSON — nunca stack trace em produção
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    try {
      return await handler(req, res)
    } catch (e) {
      const isDev = process.env.NODE_ENV === 'development'
      console.error(JSON.stringify({ error: e, path: req.url, uid: req.user?.uid }))
      return res.status(500).json({
        error: 'Erro interno',
        code: 'INTERNAL_ERROR',
        ...(isDev && { detail: String(e) })
      })
    }
  }
}

// Uso em cada route:
export default withErrorHandler(withRateLimit(withSanitize(withAuth(handler))))
```

Aplicar essa cadeia em TODAS as API Routes protegidas.
Para rotas públicas (ex: healthcheck): apenas `withErrorHandler`.

---

## BLOCO 5 — Firebase Admin: Singleton Pattern

Em serverless, Firebase Admin DEVE ser inicializado uma vez por cold start:

```typescript
// server/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!))
  })
}

export const db = getFirestore()
export const adminAuth = getAuth()
```

Verificar se o projeto já faz isso — se não, corrigir imediatamente.
Cada API Route que não usa esse singleton está abrindo nova conexão
por invocação, aumentando latência e risco de esgotar recursos.

Credenciais do service account sempre via variável de ambiente
`FIREBASE_ADMIN_SERVICE_ACCOUNT` (JSON stringificado) — nunca em arquivo commitado.

---

## BLOCO 6 — Equivalente ao N+1 no Firestore

Auditar todos os lugares com `getDoc` dentro de loop ou `.map` assíncrono:

```typescript
// ERRADO — N documentos = N leituras separadas, não aproveita batching
const activities = await Promise.all(ids.map(id => getDoc(doc(db, 'activities', id))))

// CERTO — Uma query só (limite: 30 IDs por 'in')
const q = query(collection(db, 'activities'), where('__name__', 'in', ids))
const snapshot = await getDocs(q)

// Para mais de 30 IDs: chunkar em grupos de 30
const chunks = chunk(ids, 30)
const results = await Promise.all(chunks.map(chunk => getDocs(
  query(collection(db, 'activities'), where('__name__', 'in', chunk))
)))
```

Verificar também:
- `getDocs` repetido para a mesma query na mesma sessão sem aproveitar
  o cache offline do SDK
- Listeners `onSnapshot` que buscam sub-coleção por documento filho
  um a um — usar `collectionGroup` query quando adequado

---

## BLOCO 7 — Índices Firestore

**ANÁLISE ANTES DE CRIAR — índices aumentam custo de escrita:**

Listar todas as queries compostas no código (múltiplos `where` + `orderBy`).
Para cada uma, verificar se já existe índice em `firestore.indexes.json`.

Criar índice composto SOMENTE se:
1. A query lança erro no console pedindo índice explicitamente, OU
2. A coleção tem projeção de crescimento acima de 1.000 documentos

NÃO criar índice em:
- Campos booleanos (`completed: true/false`)
- Campos de status com 2-3 valores possíveis
- Coleções com menos de 200 documentos esperados
- Campos de baixa cardinalidade em geral

Índices que PROVAVELMENTE são necessários (verificar antes de criar):
- `users/{uid}/activities` por `[uid, date ASC]` — busca do dia
- `users/{uid}/activities` por `[seriesId, occurrenceKey ASC]` — gestão de série
- `invites` por `[hash, state]` — validação de convite
- `usageBuckets` por `[uid, expiresAt ASC]` — limpeza de janelas expiradas

Documentar no `firestore.indexes.json` o motivo de cada índice criado.

---

## BLOCO 8 — Atomicidade e Transações Firestore

Firestore não suporta pessimistic locking. Usa otimismo com retry automático.
**Não implementar pessimistic locking — não existe na API do Firestore Spark.**

Identificar e garantir transações corretas nos cenários críticos:

**Cenário 1 — Consumo de convite (última vaga):**
```typescript
await db.runTransaction(async (tx) => {
  const inviteRef = db.collection('invites').doc(inviteId)
  const invite = await tx.get(inviteRef)
  
  if (!invite.exists) throw new Error('Convite não encontrado')
  if (invite.data()!.state !== 'pending') throw new Error('Convite já usado')
  if (invite.data()!.expiresAt < Date.now()) throw new Error('Convite expirado')
  
  const membershipRef = db.collection('memberships').doc(uid)
  const existing = await tx.get(membershipRef)
  
  // Idempotente: se membership já existe, retorna ela
  if (existing.exists) return existing.data()
  
  tx.update(inviteRef, { state: 'used', usedBy: uid, usedAt: FieldValue.serverTimestamp() })
  tx.set(membershipRef, { uid, active: true, createdAt: FieldValue.serverTimestamp() })
})
```

**Cenário 2 — Operações com `revision` (conflito de edição):**
Toda atualização de entidade deve verificar `revision` atual antes de escrever.
Se `revision` no banco for diferente do enviado pelo cliente: retornar
HTTP 409 Conflict com a versão atual para o cliente resolver.

**Usar `writeBatch()` para operações que atualizam múltiplos documentos
de forma atômica** (ex: excluir atividade + invalidar jobs de lembrete associados).
Limite: 500 operações por batch.

---

## BLOCO 9 — Cache nas API Routes

Para rotas com dados raramente alterados:
```typescript
res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
```

Para dados do usuário autenticado:
```typescript
res.setHeader('Cache-Control', 'private, no-store')
```

Para auth e comandos:
```typescript
res.setHeader('Cache-Control', 'no-store')
```

Verificar se `enableMultiTabIndexedDbPersistence()` está ativo no Firestore
client — reduz leituras repetidas ao navegar entre abas. Se não estiver, habilitar.
Documentar para a usuária quando algo está salvo apenas localmente (spec princípio 8).

---

## BLOCO 10 — PWA: Auto-atualização sem perder trabalho

**Detecção de nova versão:**
```typescript
// Em platform/serviceWorker.ts
export function registerSW() {
  if (!('serviceWorker' in navigator)) return
  
  navigator.serviceWorker.register('/sw.js').then(registration => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing!
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Verificar se há operações pendentes no outbox antes de recarregar
          const hasPending = checkOutboxPending()
          showUpdateBanner({
            hasPending,
            onConfirm: () => {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          })
        }
      })
    })
  })
}
```

O banner de atualização:
- Deve ser não-bloqueante e dismissível
- Se houver itens no outbox: avisar "Você tem alterações não sincronizadas.
  Atualizar agora pode descartá-las. Sincronize antes de atualizar."
- Nunca forçar reload automático sem consentimento da usuária

**No Service Worker, estratégia de cache:**
- Shell da SPA (HTML, JS, CSS): `StaleWhileRevalidate` com verificação de versão
- Assets com hash no nome: `CacheFirst` (Vite gera hash por padrão — verificar
  se não foi desabilitado com `build.rollupOptions.output.entryFileNames`)
- Chamadas de API: `NetworkFirst` com fallback offline apenas para leituras

**Header de versão nas API Routes:**
```typescript
res.setHeader('X-App-Version', process.env.npm_package_version ?? 'unknown')
```

---

## BLOCO 11 — Migrations Firestore

Firestore é schema-less, mas mudanças de estrutura exigem migração de dados:

- Criar `/scripts/migrations/` com scripts numerados
  ex: `001-add-membership-field.ts`, `002-rename-category-key.ts`
- Cada script deve ser idempotente:
  verificar se o campo já existe antes de escrever
- Scripts rodam manualmente via
  `npx ts-node --project tsconfig.scripts.json scripts/migrations/001-...ts`
  com Admin SDK — NUNCA automaticamente no boot
- Padrão de evolução de schema (do relatório, seção 20.4):
  expandir → compatibilizar → migrar → remover
  Uma migration não pode quebrar a versão anterior do frontend
- Versionar `firestore.rules` com comentário de data e change ao topo:

// firestore.rules v12 — 2026-09-12
// Adicionado: validação de tamanho em notes.content

- Testar mudanças de rules com Firebase Emulator antes de publicar:
  `firebase emulators:start --only firestore`

---

## BLOCO 12 — Deploy e Variáveis de Ambiente

### 12.1 Variáveis de ambiente — auditoria
Nenhum valor de configuração no código. Criar/atualizar `.env.example`:
Firebase (público — prefixo NEXT_PUBLIC_ ou VITE_)

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

Firebase Admin (servidor — nunca expor ao browser)

FIREBASE_ADMIN_SERVICE_ACCOUNT= # JSON inteiro do service account, stringificado

Versão (injetada pelo CI, não pelo desenvolvedor)

VITE_APP_VERSION=

Cloudflare Worker

CLOUDFLARE_WORKER_SECRET= # Shared secret para validar chamadas do Worker

CORS

ALLOWED_ORIGINS=https://leve.vercel.app,http://localhost:5173


No Vercel Dashboard: configurar todos os valores em Settings > Environment Variables,
separados por ambiente (Production / Preview / Development).

### 12.2 "Blue/Green" no Vercel Hobby
Vercel Hobby não suporta blue/green tradicional. Equivalente seguro:

**Processo de deploy:**
1. Push para branch `preview` → Vercel gera URL única automaticamente
2. Testar os fluxos críticos na URL de preview: login, criação de atividade,
   verificação de e-mail, rate limit, offline
3. Se aprovado: merge para `main` → Vercel deploya em produção automaticamente
4. Se houver problema: Vercel Dashboard > Deployments > selecionar última versão
   estável > "Redeploy" (Instant Rollback — sem downtime)

Documentar em `DEPLOY.md`:
- Checklist de validação na preview antes de cada merge
- Procedimento de rollback
- Como verificar que a migração de dados está compatível com a versão anterior

### 12.3 Health check
Implementar `GET /api/health` (sem auth):
```typescript
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.json({
    status: 'ok',
    version: process.env.VITE_APP_VERSION ?? 'unknown',
    timestamp: new Date().toISOString()
  })
}
```

---

## BLOCO 13 — Teste de Carga

**ATENÇÃO: Nunca rodar carga contra produção no Spark.**
Uma sessão de k6 pode esgotar a cota diária de 50k leituras.
Usar Firebase Emulator para todos os testes de carga.

**Setup:**
```bash
firebase emulators:start --only auth,firestore
```

**Scripts k6 em `/tests/load/`:**
- `login.js`: 20 usuários simultâneos, 60s — endpoint de auth
- `create-activity.js`: 10 usuários, 60s — POST /api/commands
- `fetch-day.js`: 30 usuários, 60s — GET /api/activities?date=hoje

Thresholds mínimos:
- p95 < 800ms
- error rate < 2%

Rodar via `npm run test:load` (configurar script no package.json apontando
para Emulator, não para produção).

---

## Regras gerais para toda a implementação

1. Nenhuma dependência paga ou com billing — verificar package.json antes
   de adicionar qualquer lib
2. Toda credencial via variável de ambiente — zero hardcode
3. Todo erro de API retorna JSON `{ error: string, code: string }` — nunca HTML,
   nunca stack trace em produção
4. Logs em produção são JSON estruturado — nunca `console.log("texto")` em API Routes
5. Testar em Firebase Emulator antes de qualquer mudança em Rules, Auth ou Firestore
6. O Cloudflare Worker permanece mínimo — apenas tick/fetch, dentro de 10ms CPU
7. Documentar cada decisão de NÃO implementar algo com justificativa em
   `/docs/adr/` seguindo o formato existente no relatório
8. Após completar cada bloco: rodar `firebase emulators:exec --only auth,firestore
   "npm test"` para validar que nada quebrou