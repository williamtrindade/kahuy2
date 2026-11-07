import type { GoalTierViewModel as Tier } from '../api/types'
import { hours, signedHours } from '../format'

export type Period = 'past' | 'current' | 'future'

/**
 * Corrente: "No ritmo de 100% (+3h)" / "Atrás 5h de 100%".
 * Passado: "Meta de 100% batida" / "Faltaram 5h para 100%". Futuro ou sem meta: nada a cobrar.
 */
export function TierStatus({ tiers, period }: { tiers: Tier[]; period: Period }) {
  if (period === 'future' || tiers.every((t) => t.goalHours <= 0)) {
    return <p className="small text-secondary mb-0 mt-2">{period === 'future' ? 'Ainda não começou' : 'Sem meta neste período'}</p>
  }
  return (
    <ul className="list-unstyled small mb-0 mt-2">
      {tiers.map((t) => {
        const closed = period === 'past'
        const ok = closed ? t.reached : t.onTrack
        const missing = hours(Math.max(0, -t.deltaHours))
        const text = closed
          ? ok
            ? `Meta de ${t.percent}% batida (${signedHours(t.deltaHours)})`
            : `Faltaram ${missing} para ${t.percent}%`
          : ok
            ? `No ritmo de ${t.percent}% (${signedHours(t.deltaHours)})`
            : `Atrás ${missing} de ${t.percent}%`
        return (
          <li key={t.percent} className={ok ? 'text-success fw-semibold' : 'text-danger'}>
            {ok ? '●' : '○'} {text}
            {!closed && <span className="text-secondary fw-normal"> · esperado {hours(t.expectedHours)}</span>}
          </li>
        )
      })}
    </ul>
  )
}
