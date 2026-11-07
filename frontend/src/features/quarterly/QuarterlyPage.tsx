import { useEffect, useState } from 'react'
import { getQuarterly } from '../../api/client'
import { ErrorAlert, PlaceholderCards } from '../../components/Loading'
import { MetricCard } from '../../components/MetricCard'
import { quarterOptions, YearPicker } from '../../components/YearPicker'
import { TierBar } from '../../components/TierBar'
import { TierStatus } from '../../components/TierStatus'
import { usePeriod } from '../../components/usePeriod'
import { hours, monthLabel, quarterLabel } from '../../format'
import { QuarterBarsChart } from './QuarterBarsChart'

export function QuarterlyPage({ onError }: { onError: (e: unknown) => void }) {
  const [quarter, setQuarter] = useState<string | undefined>()
  const { data, error, loading } = usePeriod(getQuarterly, quarter, onError)
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
            { label: 'Realizado no trimestre', height: 180 },
            { label: 'Meses', height: 360 },
          ]}
        />
      </div>
    )
  }
  const shown = quarter ?? data.quarter

  const period = data.months.some((m) => m.isCurrent)
    ? 'current'
    : data.tiers.every((t) => t.expectedHours === t.goalHours)
      ? 'past'
      : 'future'

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
        <div className="row g-3">
          {/* Fora do trimestre corrente não há tasks em aberto: previsão = realizado, então não aparece. */}
          <div className={period === 'current' ? 'col-lg-7' : 'col-12'}>
            <MetricCard label="Realizado no trimestre">
              <div className="metric">
                {hours(data.doneHours)} <small>/ {hours(data.goalHours)} · {data.donePercent}%</small>
              </div>
              <TierBar value={data.doneHours} tiers={data.tiers.map((t) => ({ percent: t.percent, hours: t.goalHours }))} />
              <TierStatus tiers={data.tiers} period={period} />
            </MetricCard>
          </div>
          {period === 'current' && (
            <div className="col-lg-5">
              <MetricCard label="Previsão">
                <div className={`metric ${data.goalHours > 0 && data.forecastHours >= data.goalHours ? 'text-success' : ''}`}>
                  {hours(data.forecastHours)} <small>{data.forecastPercent}%</small>
                </div>
                <p className="small text-secondary mb-0 mt-2">
                  {data.remainingHours > 0 ? `Faltam ${hours(data.remainingHours)} para 100%` : 'Meta de 100% batida'}
                </p>
              </MetricCard>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-body">
            <div className="label mb-2">Meses</div>
            <QuarterBarsChart months={data.months} />
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
