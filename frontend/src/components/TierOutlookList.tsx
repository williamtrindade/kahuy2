import type { TierOutlookViewModel } from '../api/types'
import { hours, signedHours } from '../format'

type Period = 'past' | 'current' | 'future'

/** Período atual: "8h/dia nos próximos 5 dias úteis" (hoje conta) ou "8h hoje, último dia útil"; fora dele, sem "próximos"/"hoje". */
export const perDay = (h: number, days: number, current = true) =>
  days === 1
    ? `${hours(h)} ${current ? 'hoje, último dia útil' : 'no único dia útil'}`
    : `${hours(h)}/dia nos ${current ? 'próximos ' : ''}${days} dias úteis`

/**
 * Por faixa. Corrente: no ritmo/atrás, quanto falta e as horas por dia útil restante.
 * Passado: batida ou quanto faltou. Futuro: a meta e as horas por dia, sem ritmo ainda.
 */
export function TierOutlookList({ tiers, remainingWorkdays, closedLabel, period = 'current' }: { tiers: TierOutlookViewModel[]; remainingWorkdays: number; closedLabel: string; period?: Period }) {
  if (period !== 'current') {
    return (
      <ul className="list-unstyled small mb-0 mt-2">
        {tiers.map((t) =>
          period === 'past' ? (
            <li key={t.percent} className={`mb-1 ${t.reached ? 'text-success fw-semibold' : 'text-danger'}`}>
              {t.reached ? `● ${t.percent}% · meta batida (${signedHours(t.deltaHours)})` : `○ ${t.percent}% · faltaram ${hours(t.remainingHours)}`}
            </li>
          ) : (
            <li key={t.percent} className="mb-1 text-secondary">
              <span className="fw-semibold text-dark">{t.percent}%</span> · {hours(t.goalHours)} · {perDay(t.requiredPerDay, remainingWorkdays, false)}
            </li>
          ),
        )}
      </ul>
    )
  }
  return (
    <ul className="list-unstyled small mb-0 mt-2">
      {tiers.map((t) => (
        <li key={t.percent} className="mb-1">
          <span className={t.onTrack ? 'text-success fw-semibold' : 'text-danger'}>
            {t.onTrack ? '●' : '○'} {t.percent}% · {t.onTrack ? `no ritmo (${signedHours(t.deltaHours)})` : `atrás ${hours(-t.deltaHours)}`}
          </span>
          <span className="text-secondary">
            {t.remainingHours > 0
              ? ` · faltam ${hours(t.remainingHours)}` +
                (remainingWorkdays === 0 ? ` · ${closedLabel}` : ` · ${perDay(t.requiredPerDay, remainingWorkdays)}`)
              : ' · meta batida'}
          </span>
        </li>
      ))}
    </ul>
  )
}
