process.env.FIREBASE_PROJECT_ID = 'demo-leve';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const { auth, db } = await import('../server/platform/firebase.ts');

async function waitForEmulator(url) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try { await fetch(url); return; }
    catch { await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  throw new Error(`Emulador indisponível em ${url}`);
}

await Promise.all([
  waitForEmulator('http://localhost:9099/emulator/v1/projects/demo-leve/config'),
  waitForEmulator('http://localhost:8080/'),
]);
const email = 'leve.local@example.test';
const password = 'leve-local-123';
const registrationEmail = 'cadastro.local@example.test';
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
await db.doc('serviceControls/global').set({ mode: 'normal' }, { merge: true });
console.log(`Dados locais preparados.\nE-mail: ${email}\nSenha: ${password}\nCadastro E2E: ${registrationEmail}`);
