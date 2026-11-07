import type { QuarterlyProgressViewModel } from '../../api/client'
import { type Scenario, ScenarioToggle } from '../../components/ScenarioToggle'
import { TierBar } from '../../components/TierBar'
import { TierOutlookList } from '../../components/TierOutlookList'
import { TierStatus } from '../../components/TierStatus'
import { hours } from '../../format'

/** Trimestre com Entregue / Previsto (o botão só aparece no corrente: nos outros os dois são iguais). */
export function QuarterCard({ data, view, onView }: { data: QuarterlyProgressViewModel; view: Scenario; onView: (v: Scenario) => void }) {
  const scenario = data[view]
  const current = data.period === 'current'

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div className="label">Trimestre</div>
          {current && <ScenarioToggle value={view} onChange={onView} />}
        </div>
        <div className="metric">
          {hours(scenario.hours)} <small>/ {hours(data.goalHours)} · {scenario.percent}%</small>
        </div>
        <div className="small text-secondary">
          {view === 'forecast'
            ? `${hours(data.doneHours)} entregues + ${hours(data.forecastHours - data.doneHours)} em aberto`
            : 'só tasks concluídas'}
        </div>
        <TierBar value={scenario.hours} tiers={scenario.tiers.map((t) => ({ percent: t.percent, hours: t.goalHours }))} />
        {current ? (
          <TierOutlookList tiers={scenario.tiers} remainingWorkdays={data.remainingWorkingDays} closedLabel="trimestre encerrado" />
        ) : (
          <TierStatus tiers={scenario.tiers} period={data.period} />
        )}
      </div>
    </div>
  )
}
