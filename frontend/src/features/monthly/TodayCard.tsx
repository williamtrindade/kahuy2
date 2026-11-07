import type { MonthlyProgressViewModel } from '../../api/client'
import { ScenarioToggle, useScenario } from '../../components/ScenarioToggle'
import { TierBar } from '../../components/TierBar'
import { hours } from '../../format'

export function TodayCard({ today }: { today: NonNullable<MonthlyProgressViewModel['today']> }) {
  const [view, changeView] = useScenario('kahuy.todayView')
  const scenario = today[view]
  const next = scenario.tiers.find((t) => !t.reached)
  const best = [...scenario.tiers].reverse().find((t) => t.reached)
  const verb = view === 'delivered' ? 'batida' : 'prevista'

  return (
    <div className="card border-0 bg-dark text-white">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
          <div className="label text-white-50">Hoje</div>
          <ScenarioToggle value={view} onChange={changeView} onDark />
        </div>
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-2">
          <div>
            <div className="metric">
              {hours(scenario.hours)} {today.isWorkingDay && <small className="text-white-50">/ {hours(today.goalHours)} · {scenario.percent}%</small>}
            </div>
            <div className="small text-white-50">
              {view === 'delivered' ? 'só tasks concluídas hoje' : `${hours(today.doneHours)} entregues + ${hours(today.openHours)} em aberto`}
            </div>
          </div>
          <div className="text-end small">
            {!today.isWorkingDay ? (
              <span className="text-white-50">{today.isHoliday ? `Feriado${today.holidayName ? ` · ${today.holidayName}` : ''}` : 'Fim de semana'} · horas contam no mês</span>
            ) : best && !next ? (
              <span className="text-success fw-semibold">Meta de {best.percent}% {verb}</span>
            ) : next ? (
              <span>
                faltam <strong>{hours(next.remainingHours)}</strong> para {next.percent}%
              </span>
            ) : null}
          </div>
        </div>
        {today.isWorkingDay && <TierBar value={scenario.hours} tiers={scenario.tiers} onDark />}
      </div>
    </div>
  )
}
