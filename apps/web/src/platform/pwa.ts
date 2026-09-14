export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installPrompt: InstallPromptEvent | null = null;

export function captureInstallPrompt(event: Event) {
  event.preventDefault();
  installPrompt = event as InstallPromptEvent;
  window.dispatchEvent(new CustomEvent('leve:install-ready'));
}

export function getInstallPrompt() { return installPrompt; }
export function clearInstallPrompt() { installPrompt = null; }
