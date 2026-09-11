process.env.FIREBASE_PROJECT_ID = 'demo-leve';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const [{ auth, db }, { hashValue }] = await Promise.all([
  import('../server/platform/firebase.ts'),
  import('../server/commands/identity.ts'),
]);

async function waitForEmulator(url) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { await fetch(url); return; }
    catch { await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  throw new Error(`Emulador indisponível em ${url}`);
}

await Promise.all([
  waitForEmulator('http://127.0.0.1:9099/emulator/v1/projects/demo-leve/config'),
  waitForEmulator('http://127.0.0.1:8080/'),
]);
const email = 'leve.local@example.test';
const password = 'leve-local-123';
const inviteId = 'convite-local';
const inviteSecret = 'convite-local-seguro-123456789';
const registrationEmail = 'cadastro.local@example.test';
const registrationInviteId = 'cadastro-local';
const registrationInviteSecret = 'cadastro-local-seguro-123456789';
const existing = await auth.getUserByEmail(email).catch(() => null);
if (existing) await auth.updateUser(existing.uid, { password, emailVerified: true });
else await auth.createUser({ email, password, emailVerified: true, displayName: 'Conta local' });
const previousRegistration = await auth.getUserByEmail(registrationEmail).catch(() => null);
if (previousRegistration) {
  await Promise.all([
    auth.deleteUser(previousRegistration.uid),
    db.recursiveDelete(db.doc(`users/${previousRegistration.uid}`)),
    db.doc(`memberships/${previousRegistration.uid}`).delete(),
  ]);
}
await Promise.all([
  db.doc('serviceControls/global').set({ admissionsOpen: true, registeredAccounts: 0, accountLimit: 5, mode: 'normal' }, { merge: true }),
  db.doc(`invites/${inviteId}`).set({ state: 'pending', secretHash: hashValue(inviteSecret), email, expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(), createdAt: new Date().toISOString() }),
  db.doc(`invites/${registrationInviteId}`).set({ state: 'pending', secretHash: hashValue(registrationInviteSecret), email: registrationEmail, expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(), createdAt: new Date().toISOString() }),
]);
console.log(`Dados locais preparados.\nE-mail: ${email}\nSenha: ${password}\nConvite: ${inviteId}.${inviteSecret}\nCadastro E2E: ${registrationEmail}`);
