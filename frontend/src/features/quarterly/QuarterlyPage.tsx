import { useEffect, useState } from 'react'
import { getQuarterly } from '../../api/client'
import { ErrorAlert, PlaceholderCards } from '../../components/Loading'
import { useScenario } from '../../components/ScenarioToggle'
import { quarterOptions, YearPicker } from '../../components/YearPicker'
import { usePeriod } from '../../components/usePeriod'
import { hours, monthLabel, quarterLabel } from '../../format'
import { QuarterBarsChart } from './QuarterBarsChart'
import { QuarterCard } from './QuarterCard'

export function QuarterlyPage({ onError }: { onError: (e: unknown) => void }) {
  const [quarter, setQuarter] = useState<string | undefined>()
  const { data, error, loading } = usePeriod(getQuarterly, quarter, onError)
  const [chosen, setChosen] = useScenario('kahuy.quarterView')
  // Trimestre atual: o que contém o mês corrente (a API marca isCurrent), para marcar no seletor.
  const [currentQuarter, setCurrentQuarter] = useState<string>()
  useEffect(() => {
    if (data?.months.some((m) => m.isCurrent)) setCurrentQuarter(data.quarter)
  }, [data])

  if (!data) {
    if (error) return <ErrorAlert message={error} />
    return (
      <div className="d-flex flex-column gap-3">
        <h1 className="h3 fw-bold mb-0">{quarter ? quarterLabel(quarter) : 'Trimestre atual'}</h1>
        <PlaceholderCards
          cards={[
            { label: 'Trimestre', height: 180 },
            { label: 'Meses', height: 360 },
          ]}
        />
      </div>
    )
  }
  const shown = quarter ?? data.quarter

  // Fora do trimestre corrente não há tasks em aberto: previsto = entregue, então vale só o entregue.
  const view = data.period === 'current' ? chosen : 'delivered'

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <h1 className="h3 fw-bold mb-0">{quarterLabel(shown)}</h1>
        <YearPicker
          name="Trimestres"
          gridClassName="quarters"
          options={quarterOptions}
          value={shown}
          current={currentQuarter}
          disabled={loading}
          onChange={setQuarter}
        />
      </div>
      {error && <ErrorAlert message={error} />}

      <div className={`d-flex flex-column gap-3 ${loading ? 'page-loading' : ''}`} aria-busy={loading}>
        <QuarterCard data={data} view={view} onView={setChosen} />

        <div className="card">
          <div className="card-body">
            <div className="label mb-2">Meses</div>
            <QuarterBarsChart months={data.months} view={view} />
            <div className="table-responsive mt-2">
              <table className="table table-sm mb-0">
                <thead>
                  <tr className="label">
                    <th className="fw-semibold">Mês</th>
                    <th className="fw-semibold text-end">Meta</th>
                    <th className="fw-semibold text-end">Realizado</th>
                    <th className="fw-semibold text-end">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => (
                    <tr key={m.month} className={m.isCurrent ? 'fw-semibold' : ''}>
                      <td>
                        {monthLabel(m.month)}
                        {m.goalEstimated && <span className="text-warning ms-1" title="Meta estimada">*</span>}
                      </td>
                      <td className="text-end">{hours(m.goalHours)}</td>
                      <td className="text-end">{hours(m.doneHours)}</td>
                      <td className="text-end">{m.donePercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
