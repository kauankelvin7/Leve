import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';

const topics = [
  ['profile', 'Conta e identidade', 'Nome, e-mail, fuso horário e preferências para manter sua agenda sincronizada.'],
  ['calendar', 'Conteúdo da agenda', 'Atividades, recorrências, categorias, notas, listas de compras e registros de tempo que você cria.'],
  ['volume', 'Notificações', 'Somente o necessário para entregar lembretes que você ativar. Você pode revogar o acesso a qualquer momento.'],
  ['trash', 'Lixeira e exclusão', 'Itens removidos ficam recuperáveis por até 30 dias. Depois desse prazo, a limpeza automática remove o conteúdo.'],
] as const;

export function Privacy() {
  return <main className="legal-page">
    <header className="legal-hero page-heading"><span className="legal-mark" aria-hidden="true"><Icon name="profile" /></span><div><p className="eyebrow">Transparência</p><h1 id="page-title" tabIndex={-1}>Privacidade no Leve</h1><p>Você organiza sua rotina. Esta página explica, com clareza, o que fica guardado, por quê e quais escolhas estão sempre nas suas mãos.</p></div></header>
    <section className="legal-summary" aria-label="Resumo de privacidade"><strong>Em poucas palavras</strong><span>Seus dados são privados por conta</span><span>Não vendemos informações</span><span>Você pode exportar ou excluir</span></section>
    <div className="legal-grid">
      {topics.map(([icon, title, text]) => <section className="panel content-form legal-card" key={title}><span className="legal-card-icon"><Icon name={icon} /></span><h2>{title}</h2><p>{text}</p></section>)}
      <section className="panel content-form legal-card legal-wide"><p className="eyebrow">Como usamos os dados</p><h2>Para a agenda funcionar para você</h2><p>Usamos os dados para autenticar sua conta, sincronizar alterações entre dispositivos, mostrar a data correta no seu fuso e entregar os recursos que você escolheu. Não usamos o conteúdo da sua agenda para publicidade.</p><div className="legal-columns"><p><strong>Proteção</strong><br />O acesso é separado por identidade e as alterações passam pela API autenticada.</p><p><strong>Portabilidade</strong><br />Em Preferências, você pode baixar uma cópia dos seus dados ou importar uma cópia sem substituir o conteúdo atual.</p></div></section>
      <section className="panel content-form legal-card legal-wide"><p className="eyebrow">Serviços e escolhas</p><h2>O que você controla</h2><ul className="legal-list"><li><strong>Firebase</strong><span>Autenticação e armazenamento privado da conta.</span></li><li><strong>Hospedagem web</strong><span>Entrega do aplicativo e das páginas públicas.</span></li><li><strong>Seu aparelho</strong><span>O modo offline e as notificações são opcionais e podem ser desligados nas Preferências.</span></li></ul></section>
      <section className="panel content-form legal-card legal-contact"><h2>Quer exercer um direito?</h2><p>Para pedir acesso, correção ou exclusão, use o contato informado pelo responsável pelo seu ambiente do Leve. Se você já tem uma conta, as ações de exportação e exclusão ficam em <Link to="/configuracoes">Preferências</Link>.</p><Link className="button primary" to="/entrar">Entrar no Leve</Link></section>
    </div>
  </main>;
}
