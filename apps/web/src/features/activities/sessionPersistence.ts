import { ApiError, sendCommand } from '../../platform/api';
import { firebaseAuth } from '../../platform/firebase';
import { MIN_SESSION_MS, removeUnfinishedSession, type StoredSession } from './sessionLifecycle';

export async function submitActivitySession(session: StoredSession, keepalive = false) {
  if (firebaseAuth?.currentUser?.uid !== session.uid) return;
  if (session.accumulatedMs < MIN_SESSION_MS) { removeUnfinishedSession(localStorage, session); return; }
  try {
    await sendCommand({
      command: 'timeEntry.addSession', operationId: session.sessionId, entityId: session.sessionId, expectedRevision: 0,
      payload: { activityId: session.activityId, civilDate: new Intl.DateTimeFormat('en-CA', { timeZone: session.timeZone }).format(new Date(session.startedAt)), timeZone: session.timeZone, durationSeconds: Math.min(14_400, Math.floor(session.accumulatedMs / 1000)), sessionId: session.sessionId },
      clientCreatedAt: new Date(session.savedAt).toISOString(),
    }, { keepalive, queueOnNetworkError: false });
  } catch (error) {
    if (!(error instanceof ApiError && error.code === 'REVISION_CONFLICT')) throw error;
  }
  removeUnfinishedSession(localStorage, session);
}
