import { type CSSProperties, useState } from 'react'
import { getWeekly, type MonthlyProgressViewModel } from '../../api/client'
import { ScenarioToggle, useScenario } from '../../components/ScenarioToggle'
import { TierBar } from '../../components/TierBar'
import { TierOutlookList } from '../../components/TierOutlookList'
import { usePeriod } from '../../components/usePeriod'
import { hours } from '../../format'

const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
/** "01–07/11" ou, cruzando o mês, "29/11–05/12". */
const weekLabel = (start: string, end: string) =>
  start.slice(5, 7) === end.slice(5, 7) ? `${start.slice(8, 10)}–${shortDate(end)}` : `${shortDate(start)}–${shortDate(end)}`

type MonthWeek = MonthlyProgressViewModel['weeks'][number]

/**
 * Semanas do mês já à vista; clicar carrega a semana (loading no próprio card).
 * `initialWeek` undefined = semana corrente.
 */
export function WeekCard({ weeks, initialWeek, onError }: { weeks: MonthWeek[]; initialWeek?: string; onError: (e: unknown) => void }) {
  const [week, setWeek] = useState(initialWeek)
  const { data, error, loading } = usePeriod(getWeekly, week, onError)
  const [chosen, changeView] = useScenario('kahuy.weekView')
  // Selecionada: a pedida ou, antes de escolher, a que a API devolveu (semana corrente).
  const selected = week ?? data?.start ?? weeks.find((w) => w.isCurrent)?.start

  const picker = (
    <div className="week-picker d-flex gap-2 overflow-auto pb-1" role="radiogroup" aria-label="Semana">
      {weeks.map((w) => {
        const active = w.start === selected
        return (
          <button
            key={w.start}
            type="button"
            role="radio"
            aria-checked={active}
            className={`btn btn-sm text-nowrap ${active ? 'btn-dark' : 'btn-outline-secondary'}`}
            title={w.isCurrent ? 'Semana atual' : undefined}
            onClick={() => setWeek(w.start)}
          >
            {w.isCurrent && <span className="me-1 text-success">●</span>}
            {weekLabel(w.start, w.end)}
          </button>
        )
      })}
    </div>
  )

  // Fora da semana corrente não há tasks em aberto: previsto = entregue.
  const view = data?.period === 'current' ? chosen : 'delivered'
  const scenario = data?.[view]

  return (
    <div
      className={`card${loading ? ' is-loading' : ''}${data ? '' : ' card-placeholder'}`}
      style={data ? undefined : ({ '--placeholder-height': '260px' } as CSSProperties)}
      aria-busy={loading}
    >
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 busy-keep">
          <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
            <span className="label">Semana</span>
            {picker}
          </div>
          {data?.period === 'current' && <ScenarioToggle value={view} onChange={changeView} />}
        </div>

        {error ? (
          <div className="alert alert-danger mb-0">{error}</div>
        ) : !data || !scenario ? (
          <span className="visually-hidden" role="status">
            Carregando semana…
          </span>
        ) : (
          <>
            <div className="metric">
              {hours(scenario.hours)} <small>/ {hours(data.goalHours)} · {scenario.percent}%</small>
            </div>
            <div className="small text-secondary">
              {view === 'forecast'
                ? `${hours(data.doneHours)} entregues + ${hours(data.openHours)} em aberto`
                : data.period === 'past'
                  ? 'semana encerrada · só tasks concluídas'
                  : data.period === 'future'
                    ? 'semana ainda não começou'
                    : 'só tasks concluídas'}
            </div>
            <TierBar value={scenario.hours} tiers={scenario.tiers.map((t) => ({ percent: t.percent, hours: t.goalHours }))} />
            <TierOutlookList tiers={scenario.tiers} remainingWorkdays={data.remainingWorkdays} closedLabel="semana encerrada" period={data.period} />
          </>
        )}
      </div>
    </div>
  )
}
