type LoadingStateProps = {
  label: string;
  variant?: 'screen' | 'cards' | 'list' | 'detail';
};

export function LoadingState({ label, variant = 'list' }: LoadingStateProps) {
  const screen = variant === 'screen';
  return (
    <main className={'loading-state loading-state-' + variant} role="status" aria-live="polite" aria-busy="true">
      {screen ? <div className="loading-brand" aria-hidden="true">leve<span>.</span></div> : null}
      <div className="loading-indicator" aria-hidden="true"><i /><i /><i /></div>
      <p className="loading-label">{label}</p>
      <div className="loading-preview" aria-hidden="true">
        <span className="loading-line loading-line-short" />
        <span className="loading-line" />
        <span className="loading-line loading-line-medium" />
        {variant === 'cards' ? <div className="loading-card-row"><span /><span /><span /></div> : null}
      </div>
    </main>
  );
}
