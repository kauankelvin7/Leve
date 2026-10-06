import { AgendaLoadingScreen } from './AgendaLoadingScreen';

type LoadingStateProps = {
  label: string;
  variant?: 'screen' | 'cards' | 'list' | 'detail';
};

export function LoadingState({ label, variant = 'list' }: LoadingStateProps) {
  if (variant === 'screen') return <AgendaLoadingScreen label={label} />;

  return (
    <main className={'loading-state loading-state-' + variant} role="status" aria-live="polite" aria-busy="true">
      <div className="loading-orbit" aria-hidden="true"><span /><span /><span /></div>
      <p className="loading-label">{label}</p>
      <p className="loading-hint">Estamos preparando seu espaço.</p>
      <div className="loading-preview" aria-hidden="true">
        <span className="loading-line loading-line-short" />
        <span className="loading-line" />
        <span className="loading-line loading-line-medium" />
        {variant === 'cards' ? <div className="loading-card-row"><span /><span /><span /></div> : null}
      </div>
    </main>
  );
}
