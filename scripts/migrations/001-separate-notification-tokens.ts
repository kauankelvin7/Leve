import { FieldValue } from 'firebase-admin/firestore';

type LegacyDevice = { uid?: unknown; deviceId?: unknown; token?: unknown; state?: unknown; createdAt?: unknown; updatedAt?: unknown };

async function migrate() {
  if (!process.argv.includes('--apply')) throw new Error('Execucao exige --apply em ambiente autorizado.');
  const { db } = await import('../../server/platform/firebase.ts');
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let migrated = 0;
  while (true) {
    let query = db.collection('notificationDevices').orderBy('__name__').limit(400);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (!page.size) break;
    for (const document of page.docs) {
      const changed = await db.runTransaction(async transaction => {
      const tokenRef = db.doc(`notificationTokens/${document.id}`);
      const [current, tokenRecord] = await transaction.getAll(document.ref, tokenRef);
      const legacy = current?.data() as LegacyDevice | undefined;
      if (!legacy || typeof legacy.uid !== 'string' || !document.id.startsWith(`${legacy.uid}_`) || !Object.hasOwn(legacy, 'token')) return false;
      const deviceId = typeof legacy.deviceId === 'string' ? legacy.deviceId : document.id.slice(`${legacy.uid}_`.length);
      if (!tokenRecord?.exists && typeof legacy.token === 'string') transaction.set(tokenRef, {
        uid: legacy.uid, deviceId, token: legacy.token, state: legacy.state === 'active' ? 'active' : 'revoked',
        createdAt: legacy.createdAt ?? new Date().toISOString(), updatedAt: legacy.updatedAt ?? new Date().toISOString(),
      }, { merge: true });
      transaction.update(document.ref, { deviceId, token: FieldValue.delete() });
      return true;
      });
      if (changed) migrated++;
    }
    if (page.size < 400) break;
    cursor = page.docs.at(-1);
  }
  console.log(JSON.stringify({ migration: '001-separate-notification-tokens', migrated }));
}

void migrate().catch(() => {
  console.error('Migracao nao concluida. Verifique o ambiente autorizado e --apply; a retomada preserva tokens existentes.');
  process.exitCode = 1;
});
