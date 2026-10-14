/** Private offline data requires consent for this account on this device.
 * The old unscoped switch is evidence of a legacy install, never new consent. */
const ACCOUNT_KEY = 'leve.offlineAccount';
const WARNING_SCOPE_KEY = 'leve.offlineCleanupWarningScope';
const WARNING_KEY = 'leve.offlineCleanupWarning';
const MIGRATION_KEY = 'leve.offlinePrivacyMigration.v1';
let activeUid: string | null | undefined;
export function setOfflineAccount(uid: string | null) {
  activeUid = uid;
  if (uid) localStorage.setItem(ACCOUNT_KEY, uid);
  else localStorage.removeItem(ACCOUNT_KEY);
}
export function offlineEnabled(uid?: string) {
  const account = uid ?? (activeUid === undefined ? localStorage.getItem(ACCOUNT_KEY) : activeUid);
  return Boolean(account && localStorage.getItem(`leve.offlineEnabled.${account}`) === 'true');
}
export function setOfflinePreference(uid: string, enabled: boolean) {
  localStorage.setItem(`leve.offlineEnabled.${uid}`, String(enabled));
}
export function legacyOfflinePreference() { return localStorage.getItem('leve.offlineEnabled'); }
export function offlineMigrationRequired() { return localStorage.getItem(MIGRATION_KEY) !== 'done'; }
export function completeOfflineMigration() { localStorage.setItem(MIGRATION_KEY, 'done'); }
export function cleanupWarning() { return localStorage.getItem(WARNING_KEY) ?? ''; }
export function markCleanupFailure(scope: 'cache' | 'work' = 'cache') { if (scope === 'work' || localStorage.getItem(WARNING_SCOPE_KEY) !== 'work') localStorage.setItem(WARNING_SCOPE_KEY, scope); localStorage.setItem(WARNING_KEY, 'Não foi possível remover todos os dados salvos neste aparelho. Feche as outras abas do Leve e tente novamente nas Preferências.'); }
export function clearCleanupWarning(workConfirmed = false) { if (!workConfirmed && localStorage.getItem(WARNING_SCOPE_KEY) === 'work') return; localStorage.removeItem(WARNING_KEY); localStorage.removeItem(WARNING_SCOPE_KEY); }
export function cacheCleanupRequired() { return Boolean(cleanupWarning()) && localStorage.getItem(WARNING_SCOPE_KEY) !== 'work'; }
