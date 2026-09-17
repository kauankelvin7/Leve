import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-leve';
let rules: RulesTestEnvironment;

async function seedAccount(uid: string, membershipState: 'active' | 'suspended' = 'active') {
  await rules.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await Promise.all([
      setDoc(doc(database, 'memberships', uid), { state: membershipState }),
      setDoc(doc(database, 'users', uid), { accountState: 'active' }),
      setDoc(doc(database, `users/${uid}/activities`, 'activity-1'), {
        title: `Private activity for ${uid}`,
        schedule: { type: 'task', dueDate: '2026-09-20' },
      }),
    ]);
  });
}

beforeAll(async () => {
  rules = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: 'localhost',
      port: 8080,
      rules: await readFile('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await rules.clearFirestore();
  await Promise.all([seedAccount('user-a'), seedAccount('user-b')]);
});

afterAll(async () => {
  await rules.cleanup();
});

describe('Firestore security rules', () => {
  it('allows a verified active user to read only their own bounded activity list', async () => {
    const database = rules.authenticatedContext('user-a', { email_verified: true }).firestore();
    const own = await getDocs(query(collection(database, 'users/user-a/activities'), limit(50)));

    expect(own.size).toBe(1);
    expect(own.docs[0]?.data().title).toBe('Private activity for user-a');
    await expect(getDoc(doc(database, 'users/user-b/activities/activity-1'))).rejects.toThrow();
  });

  it('rejects unbounded or oversized activity list queries', async () => {
    const database = rules.authenticatedContext('user-a', { email_verified: true }).firestore();

    await expect(getDocs(collection(database, 'users/user-a/activities'))).rejects.toThrow();
    await expect(getDocs(query(collection(database, 'users/user-a/activities'), limit(51)))).rejects.toThrow();
    await expect(getDocs(query(collection(database, 'users/user-a/activities'), limit(50)))).resolves.toBeDefined();
  });

  it('rejects direct client writes even inside the signed-in users own account', async () => {
    const database = rules.authenticatedContext('user-a', { email_verified: true }).firestore();
    const existing = doc(database, 'users/user-a/activities/activity-1');

    await expect(setDoc(doc(database, 'users/user-a/activities/direct-create'), { title: 'Bypass API' })).rejects.toThrow();
    await expect(updateDoc(existing, { title: 'Bypass API update' })).rejects.toThrow();
    await expect(deleteDoc(existing)).rejects.toThrow();
  });

  it('rejects reads when email is unverified or membership is inactive', async () => {
    const unverified = rules.authenticatedContext('user-a', { email_verified: false }).firestore();
    await expect(getDoc(doc(unverified, 'users/user-a/activities/activity-1'))).rejects.toThrow();

    await seedAccount('user-suspended', 'suspended');
    const suspended = rules.authenticatedContext('user-suspended', { email_verified: true }).firestore();
    await expect(getDoc(doc(suspended, 'users/user-suspended/activities/activity-1'))).rejects.toThrow();
  });
});
