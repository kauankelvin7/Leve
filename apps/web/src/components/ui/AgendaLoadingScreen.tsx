import { useId } from 'react';
import styles from './AgendaLoadingScreen.module.css';

/** The initial opening of the agenda, before the authenticated shell is ready. */
export function AgendaLoadingScreen({ label }: { label: string }) {
  const titleId = useId();

  return (
    <main className={styles.screen} aria-labelledby={titleId}>
      <div className={styles.content}>
        <div className={styles.brand} aria-hidden="true">leve<span>.</span></div>

        <svg className={styles.illustration} viewBox="0 0 320 260" fill="none" aria-hidden="true" focusable="false">
          <ellipse className={styles.backdrop} cx="161" cy="135" rx="126" ry="105" />
          <g transform="rotate(9 227 133)">
            <rect className={styles.backPaper} x="172" y="72" width="112" height="131" rx="13" />
            <path className={styles.rule} d="M192 97h65M192 113h65M192 129h65M192 145h44" />
          </g>

          <g className={styles.agenda}>
            <rect className={styles.cover} x="57" y="43" width="190" height="187" rx="17" transform="rotate(-6 152 136)" />
            <path className={styles.pageEdge} d="M73 210h165a14 14 0 0 0 14-14v-9" />
            <rect className={styles.paper} x="68" y="34" width="184" height="183" rx="16" />
            <path className={styles.divider} d="M69 87h182" />
            <circle className={styles.bindingHole} cx="103" cy="42" r="5" />
            <circle className={styles.bindingHole} cx="217" cy="42" r="5" />
            <path className={styles.binding} d="M103 42V27a6 6 0 0 1 12 0v8M217 42V27a6 6 0 0 1 12 0v8" />
            <rect className={styles.headingLine} x="89" y="61" width="60" height="7" rx="3.5" />
            <rect className={styles.smallLine} x="89" y="74" width="38" height="3" rx="1.5" />
            <path className={styles.bookmark} d="M225 55h12v24l-6-4-6 4V55Z" />

            <g className={styles.calendar}>
              {Array.from({ length: 7 }, (_, index) => (
                <rect key={'weekday-' + index} x={89 + index * 21} y="102" width="8" height="3" rx="1.5" />
              ))}
              {Array.from({ length: 21 }, (_, index) => (
                <rect key={index} x={86 + (index % 7) * 21} y={116 + Math.floor(index / 7) * 24} width="14" height="14" rx="4" />
              ))}
            </g>
            <rect className={styles.selectedDay} x="128" y="140" width="14" height="14" rx="4" />
            <rect className={styles.dayOutline} x="124" y="136" width="22" height="22" rx="7" />
            <path className={styles.selectedMark} d="m132 147 2 2 4-4" />
            <rect className={styles.smallLine} x="89" y="192" width="72" height="4" rx="2" />
          </g>

          <g className={styles.note}>
            <g transform="rotate(6 242 188)">
              <rect className={styles.notePaper} x="195" y="146" width="95" height="85" rx="12" />
              <rect className={styles.headingLine} x="210" y="163" width="32" height="5" rx="2.5" />
              {[183, 198, 213].map(y => (
                <g key={y}>
                  <circle className={styles.noteBullet} cx="214" cy={y} r="3" />
                  <path className={styles.rule} d={`M225 ${y}h48`} />
                </g>
              ))}
            </g>
          </g>
        </svg>

        <div className={styles.message} role="status" aria-live="polite" aria-atomic="true">
          <h1 id={titleId}>{label}</h1>
          <p>Só um instante. Estamos abrindo seu espaço.</p>
        </div>
        <div className={styles.indicator} aria-hidden="true"><span /></div>
      </div>
    </main>
  );
}
