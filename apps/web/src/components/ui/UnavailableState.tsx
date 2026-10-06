import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import styles from './UnavailableState.module.css';

type UnavailableStateProps = {
  title: string;
  description: string;
  to: string;
  backLabel: string;
  icon: 'note' | 'day' | 'basket';
  retry?: boolean;
};

/** Resource state that fits inside the authenticated shell. */
export function UnavailableState({ title, description, to, backLabel, icon, retry = false }: UnavailableStateProps) {
  return <main className={styles.page}>
    <section className={styles.card}>
      <span className={styles.icon} aria-hidden="true"><Icon name={icon} /></span>
      <h1 id="page-title" tabIndex={-1}>{title}</h1>
      <p role={retry ? 'alert' : undefined}>{description}</p>
      <div className={styles.actions}>
        {retry ? <button className="primary" onClick={() => window.location.reload()}>Tentar novamente</button> : null}
        <Link className={`button ${retry ? '' : 'primary'}`} to={to}>{backLabel}</Link>
      </div>
    </section>
  </main>;
}
