import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('Gika boundary: interpretation cannot write; command bridge has one existing writer', () => {
  it.each(['server/gika/recurrencePolicy.ts', 'server/gika/scopeIntent.ts', 'server/gika/recurrenceGuard.ts', 'packages/domain/src/gikaRecurrence.ts', 'apps/web/src/features/gika/recurrenceBridge.ts', 'server/gika/confirmation.ts', 'packages/domain/src/gikaConfirmation.ts', 'apps/web/src/features/gika/confirmationBridge.ts', 'server/gika/actionPolicy.ts', 'server/gika/policyAssessment.ts', 'server/gika/gemini.ts', 'server/gika/model.ts', 'server/gika/router.ts', 'server/gika/createPolicy.ts', 'server/gika/completePolicy.ts', 'server/gika/updatePolicy.ts', 'server/gika/reschedulePolicy.ts', 'apps/web/src/features/gika/rescheduleBridge.ts', 'packages/domain/src/gikaReschedule.ts', 'apps/web/src/features/gika/updateBridge.ts', 'packages/domain/src/gikaUpdate.ts', 'apps/web/src/features/gika/completionBridge.ts', 'apps/web/src/features/gika/apiAdapter.ts', 'apps/web/src/features/gika/commandBridge.ts', 'apps/web/src/features/gika/creationUndoBridge.ts'])('%s has no persistence entry point', path => {
    const source = readFileSync(path, 'utf8');
    expect(source).not.toMatch(/firebase-admin|firebase\/firestore|platform\/firebase\.ts|\b(?:setDoc|addDoc|updateDoc|deleteDoc|writeBatch|runTransaction|contentCommand)\s*\(/);
  });
  it('undo uses the existing command API and never interpretation or direct persistence', () => {
    const source = readFileSync('apps/web/src/features/gika/creationUndoBridge.ts', 'utf8');
    expect(source).toContain('sendCommand(command'); expect(source).toContain('creationUndoEnvelope');
    expect(source).not.toMatch(/apiRequest|gika\/respond|gemini|modelAdapter/i);
    const schema = readFileSync('packages/domain/src/gikaUndo.ts', 'utf8');
    expect(schema).toContain("command: 'activity.trash'"); expect(schema).not.toMatch(/activity\.(?:purge|update|restore|setStatus)/);
  });
  it('completion only uses the existing setStatus command and no other mutation', () => {
    const source = readFileSync('apps/web/src/features/gika/completionBridge.ts', 'utf8');
    expect(source).toContain('sendCommand(command');
    const schema = readFileSync('packages/domain/src/gikaCompletion.ts', 'utf8');
    expect(schema).toContain("command: 'activity.setStatus'");
    expect(schema).not.toMatch(/activity\.(?:create|trash|update|restore|createSeries)/);
    expect(source).not.toMatch(/activity\.(?:update|trash|restore)|status: 'pending'/);
  });
  it('title patch uses only existing update command and no temporal/status mutation', () => {
    const source = readFileSync('apps/web/src/features/gika/updateBridge.ts', 'utf8');
    expect(source).toContain('sendCommand(command');
    const schema = readFileSync('packages/domain/src/gikaUpdate.ts', 'utf8');
    expect(schema).toContain("command: 'activity.update'");
    expect(schema).not.toMatch(/activity\.(?:create|trash|setStatus|restore|createSeries)/);
    expect(schema).toContain('Object.hasOwn(current, key)');
  });
  it('only existing sendCommand dispatches activity.create, never another mutation or direct Firestore', () => {
    const source = readFileSync('apps/web/src/features/gika/commandBridge.ts', 'utf8');
    expect(source).toContain('sendCommand(command'); expect(source).toContain("command: 'activity.create'"); expect(source).not.toMatch(/activity\.(?:update|setStatus|trash|createSeries)/);
  });
});
it('M4-T3 patch delegates existing temporal domain and command; confirmation has no model interpreter',()=>{
 const domain=readFileSync('packages/domain/src/gikaReschedule.ts','utf8');expect(domain).toContain('moveScheduleToDate(input.schedule,patch.dueDate)');expect(domain).toContain("command:'activity.update'");expect(domain).not.toMatch(/activity\.(?:create|updateFuture|trash|setStatus|createSeries)/);
 const bridge=readFileSync('apps/web/src/features/gika/rescheduleBridge.ts','utf8');expect(bridge).toContain('sendCommand(command');expect(bridge).not.toMatch(/gemini|modelAdapter|\.interpret\(/i);const confirmation=readFileSync('apps/web/src/features/gika/confirmationBridge.ts','utf8');expect(confirmation).toContain('/gika/recover-confirmation');expect(confirmation).not.toContain('/gika/respond');
});

it('M5-T3 scope selection and confirmation cannot call Gemini or introduce a recurrence writer', () => {
  const bridge = readFileSync('apps/web/src/features/gika/recurrenceBridge.ts', 'utf8');
  expect(bridge).toContain('/gika/choose-recurrence'); expect(bridge).toContain('/gika/recover-confirmation'); expect(bridge).toContain('sendCommand(command');
  expect(bridge).not.toMatch(/gika\/respond|gemini|modelAdapter|\.interpret\(/i);
  const guard = readFileSync('server/gika/recurrenceGuard.ts', 'utf8');
  expect(guard).toContain('recurrenceDatesThrough'); expect(guard).toContain('applyTitlePatch'); expect(guard).toContain('applyReschedulePatch');
  const domain = readFileSync('packages/domain/src/gikaRecurrence.ts', 'utf8');
  expect(domain).toContain("'activity.updateFuture'"); expect(domain).not.toMatch(/activity\.(?:trash|trashSeries|createSeries|purge)|batch/i);
});
