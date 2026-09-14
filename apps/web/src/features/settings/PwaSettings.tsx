import { useEffect, useState } from 'react';
import { clearInstallPrompt, getInstallPrompt } from '../../platform/pwa';

export function PwaSettings() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  const [available, setAvailable] = useState(Boolean(getInstallPrompt()));
  const [message, setMessage] = useState(standalone ? 'O Leve está instalado neste aparelho.' : '');
  useEffect(() => {
    const ready = () => setAvailable(true);
    window.addEventListener('leve:install-ready', ready);
    return () => window.removeEventListener('leve:install-ready', ready);
  }, []);
  async function install() {
    const prompt = getInstallPrompt();
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    clearInstallPrompt(); setAvailable(false);
    setMessage(choice.outcome === 'accepted' ? 'Instalação iniciada pelo navegador.' : 'Instalação cancelada.');
  }
  return <section className="panel content-form"><h2>Aplicativo</h2><p>Você pode continuar usando pelo navegador mesmo sem instalar.</p>{available ? <button type="button" className="primary" onClick={() => void install()}>Instalar Leve</button> : null}<p role="status">{message || (!standalone && !available ? 'A instalação não está disponível neste navegador agora.' : '')}</p></section>;
}
