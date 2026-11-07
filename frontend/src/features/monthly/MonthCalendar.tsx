import type { MonthlyProgressViewModel } from '../../api/client'
import { hours } from '../../format'

type Day = MonthlyProgressViewModel['calendar'][number]

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const KINDS: { kind: Day['kind']; label: string }[] = [
  { kind: 'workday', label: 'Dia útil' },
  { kind: 'vacation', label: 'Férias / folga' },
  { kind: 'holiday', label: 'Feriado' },
]
const KIND_TEXT: Record<Day['kind'], string> = {
  workday: 'dia útil',
  weekend: 'fim de semana',
  holiday: 'feriado',
  vacation: 'férias / folga',
}

/**
 * Calendário do mês: dia útil em verde, férias/folga em azul, feriado em vermelho (tipos vindos da API).
 * Dias úteis futuros ficam mais claros; hoje tem contorno.
 */
export function MonthCalendar({ days, today }: { days: Day[]; today?: string }) {
  const first = days[0]
  if (!first) return null
  // Posição do dia 1 na semana (domingo = 0), só para alinhar a grade.
  const offset = new Date(`${first.date}T00:00:00Z`).getUTCDay()

  return (
    <div>
      <div className="month-calendar">
        {WEEKDAYS.map((w, i) => (
          <div key={`h${i}`} className="cal-head">
            {w}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map((d) => {
          const future = today !== undefined && d.date > today
          const title = [`${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`, d.name || KIND_TEXT[d.kind], d.doneHours > 0 ? hours(d.doneHours) : null]
            .filter(Boolean)
            .join(' · ')
          return (
            <div
              key={d.date}
              className={`cal-day ${d.kind}${future ? ' future' : ''}${d.date === today ? ' today' : ''}`}
              title={title}
              aria-label={title}
            >
              {Number(d.date.slice(8, 10))}
            </div>
          )
        })}
      </div>
      <ul className="list-unstyled d-flex flex-wrap justify-content-center column-gap-3 row-gap-1 small mb-0 mt-3">
        {KINDS.map((k) => (
          <li key={k.kind} className="d-flex align-items-center gap-1">
            <span className={`cal-swatch ${k.kind}`} />
            {k.label} <span className="text-secondary">({days.filter((d) => d.kind === k.kind).length})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
