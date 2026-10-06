import { Link } from 'react-router-dom';
import { statusPageContent, type StatusPageCode } from '../../app/statusPage';
import styles from './StatusPage.module.css';

type StatusPageProps = {
  status: StatusPageCode;
  onAction?: () => void;
};

export function StatusPage({ status, onAction }: StatusPageProps) {
  const content = statusPageContent[status];
  const isNotFound = status === 404;

  return <main className={styles.page} aria-labelledby="page-title" role={status >= 500 ? 'alert' : undefined}>
    <div className={styles.brand} aria-hidden="true">leve<span>.</span></div>
    {status === 502 || status === 503 ? <div className="connection-beacon" aria-hidden="true"><span /></div> : null}
    <section className={styles.card}>
      <span className={styles.code} aria-hidden="true">{status}</span>
      <p className={styles.eyebrow}>{content.eyebrow}</p>
      <h1 id="page-title" tabIndex={-1}>{content.title}</h1>
      <p className={styles.description}>{content.description}</p>
      <div className={styles.actions}>
        {isNotFound ? <Link className="button primary" to="/hoje">{content.action}</Link> : <button className="primary" type="button" onClick={onAction}>{content.action}</button>}
        {!isNotFound ? <Link className="text-link" to="/hoje">Voltar para minha agenda</Link> : null}
      </div>
    </section>
  </main>;
}
