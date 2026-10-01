import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('Gika boundary: interpretation cannot write; command bridge has one existing writer', () => {
  it.each(['server/gika/gemini.ts', 'server/gika/model.ts', 'server/gika/router.ts', 'server/gika/createPolicy.ts', 'apps/web/src/features/gika/apiAdapter.ts', 'apps/web/src/features/gika/commandBridge.ts'])('%s has no persistence entry point', path => {
    const source = readFileSync(path, 'utf8');
    expect(source).not.toMatch(/firebase-admin|firebase\/firestore|platform\/firebase\.ts|\b(?:setDoc|addDoc|updateDoc|deleteDoc|writeBatch|runTransaction|contentCommand)\s*\(/);
  });
  it('only existing sendCommand dispatches activity.create, never another mutation or direct Firestore', () => {
    const source = readFileSync('apps/web/src/features/gika/commandBridge.ts', 'utf8');
    expect(source).toContain('sendCommand(command'); expect(source).toContain("command: 'activity.create'"); expect(source).not.toMatch(/activity\.(?:update|setStatus|trash|createSeries)/);
  });
});
