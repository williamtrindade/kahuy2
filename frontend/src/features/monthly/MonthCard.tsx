import type { MonthlyProgressViewModel } from '../../api/client'
import { PacePanel } from '../../components/PacePanel'
import { ScenarioToggle, useScenario } from '../../components/ScenarioToggle'
import { TierBar } from '../../components/TierBar'
import { TierOutlookList } from '../../components/TierOutlookList'
import { TierStatus } from '../../components/TierStatus'
import { hours } from '../../format'

export function MonthCard({ data }: { data: MonthlyProgressViewModel }) {
  const [chosen, changeView] = useScenario('kahuy.monthView')
  // Fora do mês corrente não há tasks em aberto: previsto = entregue, então não há o que alternar.
  const view = data.isCurrent ? chosen : 'delivered'
  const scenario = data[view]

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div className="label">Mês</div>
          {data.isCurrent && <ScenarioToggle value={view} onChange={changeView} />}
        </div>
        <div className="row g-4">
          <div className="col-lg">
            <div className="metric">
              {hours(scenario.hours)} <small>/ {hours(data.goalHours)} · {scenario.percent}%</small>
            </div>
            <div className="small text-secondary">
              {view === 'delivered'
                ? `${data.doneTaskCount} tasks concluídas · média de ${hours(data.averageHoursPerTask)} por task`
                : `${hours(data.doneHours)} entregues + ${hours(data.openHours)} em aberto`}
            </div>
            <TierBar value={scenario.hours} tiers={scenario.tiers.map((t) => ({ percent: t.percent, hours: t.goalHours }))} />
            {data.isCurrent ? (
              <TierOutlookList tiers={scenario.tiers} remainingWorkdays={data.remainingWorkingDays} closedLabel="mês encerrado" />
            ) : (
              <TierStatus tiers={scenario.tiers} period={data.period} />
            )}
          </div>
          <div className="col-lg-auto">
            <PacePanel
              pace={data.pacePerWorkday}
              dailyGoalHours={data.dailyGoalHours}
              projectedHours={data.projectedHours}
              projectedPercent={data.projectedPercent}
              period={data.period}
              remainingWorkdays={data.remainingWorkingDays}
              tiers={scenario.tiers}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
