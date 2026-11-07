import { useEffect, useState } from 'react'
import { getMonthly } from '../../api/client'
import { ErrorAlert, PlaceholderCards } from '../../components/Loading'
import { monthOptions, YearPicker } from '../../components/YearPicker'
import { usePeriod } from '../../components/usePeriod'
import { monthLabel } from '../../format'
import { BreakdownCard } from './BreakdownCard'
import { CumulativeChart } from './CumulativeChart'
import { MonthCalendar } from './MonthCalendar'
import { MonthCard } from './MonthCard'
import { TaskLists } from './TaskLists'
import { TodayCard } from './TodayCard'
import { WeekCard } from './WeekCard'

export function MonthlyPage({ onError }: { onError: (e: unknown) => void }) {
  const [month, setMonth] = useState<string | undefined>()
  const { data, error, loading } = usePeriod(getMonthly, month, onError)
  // Mês atual (fuso da API): o da primeira resposta sem `month`, para marcar no seletor.
  const [currentMonth, setCurrentMonth] = useState<string>()
  useEffect(() => {
    if (data?.isCurrent) setCurrentMonth(data.month)
  }, [data])

  if (!data) {
    if (error) return <ErrorAlert message={error} />
    return (
      <div className="d-flex flex-column gap-3">
        <h1 className="h3 fw-bold mb-0">{month ? monthLabel(month) : 'Mês atual'}</h1>
        <PlaceholderCards
          cards={[
            { label: 'Hoje', height: 150 },
            { label: 'Semana', height: 260 },
            { label: 'Mês', height: 200 },
            { label: 'Acumulado no mês', height: 280 },
          ]}
        />
      </div>
    )
  }
  const shown = month ?? data.month

  const breakdowns = [
    { title: 'Horas por tipo', rows: data.hoursByType.map((r) => ({ name: r.type, hours: r.hours })) },
    { title: 'Horas de teste por dev', rows: data.hoursByDeveloper.map((r) => ({ name: r.developer, hours: r.hours })) },
    { title: 'Horas por solicitante', rows: data.hoursByRequester.map((r) => ({ name: r.requester, hours: r.hours })) },
  ].filter((b) => b.rows.length > 0)

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <h1 className="h3 fw-bold mb-0">{monthLabel(shown)}</h1>
        <YearPicker name="Meses" gridClassName="months" options={monthOptions} value={shown} current={currentMonth} disabled={loading} onChange={setMonth} />
      </div>
      {error && <ErrorAlert message={error} />}

      <div className={`d-flex flex-column gap-3 ${loading ? 'page-loading' : ''}`} aria-busy={loading}>
        {data.goalEstimated && (
          <div className="alert alert-warning py-2 small mb-0">
            Meta estimada: não há feriados cadastrados para {data.month.slice(0, 4)}. Rode <code>npm run holidays -- {data.month.slice(0, 4)}</code> no backend (ou informe os dias úteis em <code>WORKING_DAYS</code>).
          </div>
        )}
        {data.undatedTasks.length > 0 && (
          <div className="alert alert-light border py-2 small mb-0">
            {data.undatedTasks.length} task(s) concluída(s) sem data não entraram na conta:{' '}
            {data.undatedTasks.map((t) => t.title).join(', ')}
          </div>
        )}
        {data.invalidTasks.length > 0 && (
          <div className="alert alert-warning py-2 small mb-0">
            {data.invalidTasks.length} task(s) com dado inválido ficaram fora da conta:{' '}
            {data.invalidTasks.map((t) => (
              <a key={t.url} href={t.url} target="_blank" rel="noreferrer" className="me-2" title={t.reason}>
                {t.title || 'sem título'}
              </a>
            ))}
          </div>
        )}

        {data.today && <TodayCard today={data.today} />}
        <WeekCard
          key={`week-${data.month}`}
          weeks={data.weeks}
          initialWeek={data.isCurrent ? undefined : data.period === 'past' ? data.weeks.at(-1)?.start : data.weeks[0]?.start}
          onError={onError}
        />

        <MonthCard data={data} />

        <div className="row g-3">
          <div className="col-lg-9">
            <div className="card h-100">
              <div className="card-body">
                <div className="label mb-2">Acumulado no mês</div>
                <CumulativeChart data={data.dailyCumulative} today={data.period === 'future' ? '' : data.today?.date} />
              </div>
            </div>
          </div>
          <div className="col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="label mb-2">Calendário</div>
                <MonthCalendar days={data.calendar} today={data.period === 'future' ? '' : data.today?.date} />
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          {breakdowns.map((b) => (
            <div key={b.title} className="col-lg">
              <BreakdownCard title={b.title} rows={b.rows} />
            </div>
          ))}
        </div>

        <TaskLists key={`tasks-${data.month}`} tasks={data.tasks} weeks={data.weeks} />
        {loading && (
          <span className="visually-hidden" role="status">
            Carregando {monthLabel(shown)}…
          </span>
        )}
      </div>
    </div>
  )
}
