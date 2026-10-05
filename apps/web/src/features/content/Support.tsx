import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';

const sponsorUrl = 'https://github.com/sponsors/kauankelvin7';
const repositoryUrl = 'https://github.com/kauankelvin7/Leve';
const pixKey = String(import.meta.env.VITE_SUPPORT_PIX_KEY ?? '').trim();

export function Support() {
  const [copyStatus, setCopyStatus] = useState('');

  async function copyPix() {
    if (!pixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopyStatus('Chave Pix copiada.');
    } catch {
      setCopyStatus('Não consegui copiar automaticamente. Selecione a chave acima.');
    }
  }

  return <main className="legal-page">
    <header className="legal-hero page-heading">
      <span className="legal-mark" aria-hidden="true"><Icon name="heart" /></span>
      <div>
        <p className="eyebrow">Projeto aberto</p>
        <h1 id="page-title" tabIndex={-1}>Apoie o Leve</h1>
        <p>O Leve continua gratuito. Se quiser ajudar a manter o projeto, escolha a forma que fizer mais sentido para você.</p>
      </div>
    </header>

    <section className="legal-summary" aria-label="Como funciona o apoio">
      <strong>Em poucas palavras</strong>
      <span>Apoio voluntário</span>
      <span>Sem recursos bloqueados</span>
      <span>Manutenção e evolução</span>
    </section>

    <div className="legal-grid">
      <section className="panel content-form legal-card">
        <span className="legal-card-icon" aria-hidden="true"><Icon name="heart" /></span>
        <h2>GitHub Sponsors</h2>
        <p>Apoio integrado ao GitHub, com contribuição única ou recorrente conforme as opções disponíveis no perfil.</p>
        <a className="button primary" href={sponsorUrl} target="_blank" rel="noreferrer">Apoiar pelo GitHub</a>
      </section>

      <section className="panel content-form legal-card">
        <span className="legal-card-icon" aria-hidden="true"><Icon name="check" /></span>
        <h2>Pix direto</h2>
        <p>Uma opção simples para apoiar usando o seu banco.</p>
        {pixKey ? <>
          <p><strong>Chave Pix</strong><br /><code>{pixKey}</code></p>
          <div className="dialog-actions"><button type="button" onClick={() => void copyPix()}>Copiar chave Pix</button></div>
          <p className="form-status" role="status" aria-live="polite">{copyStatus}</p>
        </> : <p className="muted">O apoio por Pix ainda não está disponível por aqui. Use o GitHub Sponsors por enquanto.</p>}
      </section>

      <section className="panel content-form legal-card legal-wide">
        <p className="eyebrow">Transparência</p>
        <h2>Para onde vai o apoio?</h2>
        <p>O apoio ajuda a sustentar o tempo dedicado a manutenção, segurança, acessibilidade, testes e melhorias do projeto. Ele não compra recursos exclusivos e não muda o acesso ao Leve.</p>
        <ul className="legal-list">
          <li><strong>Gratuito</strong><span>Os recursos essenciais continuam disponíveis sem pagamento.</span></li>
          <li><strong>Aberto</strong><span>O código e a evolução do projeto continuam visíveis no GitHub.</span></li>
          <li><strong>Opcional</strong><span>Você pode usar o Leve normalmente sem apoiar financeiramente.</span></li>
        </ul>
      </section>

      <section className="panel content-form legal-card legal-contact">
        <h2>Quer só usar o Leve?</h2>
        <p>Tudo certo. Apoiar é opcional.</p>
        <div className="dialog-actions">
          <Link className="button primary" to="/">Abrir o Leve</Link>
          <a className="button" href={repositoryUrl} target="_blank" rel="noreferrer">Ver código</a>
        </div>
      </section>
    </div>
  </main>;
}
