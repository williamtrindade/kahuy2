import { faGaugeHigh } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { TierOutlookViewModel } from '../api/types'
import { hours } from '../format'

type Props = {
  /** média por dia útil já encerrado; null se nenhum encerrou */
  pace: number | null
  dailyGoalHours: number
  /** projeção de fechamento; null sem ritmo */
  projectedHours: number | null
  /** projeção em % da meta */
  projectedPercent: number | null
  period: 'past' | 'current' | 'future'
  remainingWorkdays: number
  tiers: TierOutlookViewModel[]
}

/** Ritmo em destaque (card Mês): média por dia útil × meta diária, o que falta por dia e a projeção. */
export function PacePanel({ pace, dailyGoalHours, projectedHours, projectedPercent, period, remainingWorkdays, tiers }: Props) {
  const first = tiers[0]
  const ahead = pace !== null && pace >= dailyGoalHours
  const missing = tiers.filter((t) => t.remainingHours > 0)

  return (
    <div className="pace-panel">
      <div className="label text-white-50 mb-1">
        <FontAwesomeIcon icon={faGaugeHigh} className="me-2" />
        Seu pace
      </div>
      {pace === null ? (
        <p className="mb-0 text-white-50">
          {period === 'future' ? 'O mês ainda não começou.' : 'Aparece depois do primeiro dia útil encerrado.'}
        </p>
      ) : (
        <>
          <div className="pace-value">
            {hours(pace)}
            <small> /dia útil</small>
          </div>
          <div className={`small fw-semibold ${ahead ? 'text-success' : 'text-warning'}`}>
            {ahead ? 'acima' : 'abaixo'} da meta diária de {hours(dailyGoalHours)}
          </div>
        </>
      )}

      {period === 'current' && remainingWorkdays > 0 && missing.length > 0 && (
        <div className="small mt-2">
          <div className="text-white-50">{remainingWorkdays === 1 ? 'Precisa hoje, último dia útil:' : `Precisa nos próximos ${remainingWorkdays} dias úteis:`}</div>
          <ul className="list-unstyled d-flex flex-wrap column-gap-3 mb-0">
            {missing.map((t) => (
              <li key={t.percent}>
                {t.percent}%: <strong>{remainingWorkdays === 1 ? hours(t.requiredPerDay) : `${hours(t.requiredPerDay)}/dia`}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {projectedHours !== null && first && (
        <div className="mt-3 pt-2 border-top border-secondary">
          <div className="small text-white-50">{period === 'past' ? 'Fechou com' : 'Nesse pace, fecha com'}</div>
          <div className="pace-projection">
            ~{hours(projectedHours)}
            {projectedPercent !== null && (
              <span className={projectedHours >= first.goalHours ? 'text-success' : 'text-warning'}> · {projectedPercent}% da meta</span>
            )}
          </div>
          <div className={`small fw-semibold ${projectedHours >= first.goalHours ? 'text-success' : 'text-warning'}`}>
            {projectedHours >= first.goalHours ? `bate ${first.percent}%` : `abaixo de ${first.percent}%`}
          </div>
        </div>
      )}
    </div>
  )
}
