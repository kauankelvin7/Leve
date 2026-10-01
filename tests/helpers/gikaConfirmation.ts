import type { Page } from '@playwright/test';
import type { RescheduleDescriptor } from '../../packages/domain/src/gikaReschedule';
import { issueConfirmation } from '../../server/gika/confirmation';

/** Provider/resolver fixture only. Command/Auth/Firestore and seal verification remain real. */
export async function sealedRescheduleFixture(page: Page, request: { requestId: string; text: string }, task: RescheduleDescriptor) {
  if (!process.env.SCHEDULER_HMAC_SECRET) throw new Error('E2E requires a shared ephemeral server signing configuration.');
  const uid = await page.evaluate(async () => { const path = '/src/platform/firebase.ts'; return (await import(/* @vite-ignore */ path)).firebaseAuth.currentUser.uid as string; });
  const confirmation = issueConfirmation(uid, request, task, { kind: 'confirm', risk: 'low', reason: 'RESCHEDULE_PREVIEW_REQUIRED' });
  return { text: 'Confira a nova data antes de mover a tarefa.', simulated: false, reads: [], rescheduleTask: task, confirmation };
}
