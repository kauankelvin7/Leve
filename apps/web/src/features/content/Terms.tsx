import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import styles from './LegalPage.module.css';

const terms = [
  ['profile', 'Sua conta', 'Use seus próprios dados de acesso e mantenha seu e-mail atualizado. Você é responsável por proteger o acesso à sua conta e por avisar o responsável pelo seu ambiente se suspeitar de uso indevido.'],
  ['calendar', 'Seu conteúdo', 'As atividades, notas e listas que você cria são usadas para fornecer os recursos do Leve. Use o serviço de forma lícita e respeite os direitos e a privacidade de outras pessoas ao incluir informações.'],
  ['volume', 'Recursos e sincronização', 'O Leve oferece agenda, notas, compras, notificações e recursos offline. A sincronização depende de conexão e disponibilidade dos serviços usados pelo seu ambiente; confira o estado de sincronização antes de trocar de aparelho.'],
  ['trash', 'Seus dados e escolhas', 'Você pode exportar seus dados e solicitar a exclusão pelas Preferências. Itens removidos podem ser recuperados da Lixeira pelo período indicado no produto, antes da limpeza automática.'],
] as const;

export function Terms() {
  return <main className={styles.page}>
    <header className={`legal-hero page-heading ${styles.hero}`}>
      <span className="legal-mark" aria-hidden="true"><Icon name="note" /></span>
      <div><p className="eyebrow">Uso do serviço</p><h1 id="page-title" tabIndex={-1}>Termos de uso do Leve</h1><p>Condições gerais para usar sua agenda com clareza e cuidado.</p></div>
    </header>
    <section className="legal-summary" aria-label="Resumo dos termos"><strong>Em poucas palavras</strong><span>Use sua própria conta</span><span>Cuide do acesso</span><span>Seus dados podem ser exportados</span></section>
    <div className="legal-grid">
      {terms.map(([icon, title, text]) => <section className="panel content-form legal-card" key={title}><span className="legal-card-icon"><Icon name={icon} /></span><h2>{title}</h2><p>{text}</p></section>)}
      <section className="panel content-form legal-card legal-wide"><p className="eyebrow">Respeito e segurança</p><h2>Um espaço pessoal para organizar sua rotina</h2><p>Não use o Leve para violar a lei, tentar acessar dados de outras contas, interferir no funcionamento do serviço ou distribuir conteúdo que prejudique outras pessoas. O acesso pode ser limitado quando a conta ou o serviço exigir uma verificação de segurança.</p></section>
      <section className="panel content-form legal-card legal-wide"><h2>Privacidade e dúvidas</h2><p>O uso dos seus dados está explicado na página de <Link to="/privacidade">Privacidade</Link>. Para dúvidas sobre sua conta ou sobre o ambiente em que usa o Leve, procure o responsável por esse ambiente.</p></section>
    </div>
    <nav className={styles.footer} aria-label="Informações legais"><Link to="/privacidade">Privacidade</Link><Link to="/entrar">Entrar</Link></nav>
  </main>;
}
