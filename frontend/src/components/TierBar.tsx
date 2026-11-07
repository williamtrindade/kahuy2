import { hours } from '../format'

type Tier = { percent: number; hours: number }

/** Barra de progresso com marcadores em cada faixa de meta (ex.: 100% e 125%). */
export function TierBar({ value, tiers, onDark = false }: { value: number; tiers: Tier[]; onDark?: boolean }) {
  const max = Math.max(value, ...tiers.map((t) => t.hours), 1)
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`
  const first = tiers[0]?.hours ?? 0
  const tone = onDark || (first > 0 && value >= first) ? 'bg-success' : 'bg-dark'

  return (
    <div className={`tier-bar mt-3 ${onDark ? 'on-dark' : ''}`}>
      <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className={`progress-bar ${tone}`} style={{ width: pct(value) }} />
      </div>
      {tiers.map((t) => (
        <div key={t.percent} className={`tier-marker ${value >= t.hours && t.hours > 0 ? 'reached' : ''}`} style={{ left: pct(t.hours) }}>
          <span>
            {t.percent}%<span className="d-none d-sm-inline"> · {hours(t.hours)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
