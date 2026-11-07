import { useState } from 'react'
import type { MonthlyProgressViewModel } from '../../api/client'
import { hours } from '../../format'

type Task = MonthlyProgressViewModel['tasks'][number]
type Week = MonthlyProgressViewModel['weeks'][number]
type Filter = 'all' | 'open' | 'done'
type Scope = 'month' | 'week'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'open', label: 'Em aberto' },
  { id: 'done', label: 'Concluídas' },
]
const SCOPES: { id: Scope; label: string }[] = [
  { id: 'month', label: 'Mês' },
  { id: 'week', label: 'Semana' },
]
const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
/** Trecho da semana dentro do mês: "08–14/11", ou "30/11" quando é um dia só. */
const weekLabel = (w: Week) =>
  w.inMonthStart === w.inMonthEnd ? shortDate(w.inMonthStart) : `${w.inMonthStart.slice(8, 10)}–${shortDate(w.inMonthEnd)}`
const matches = (t: Task, f: Filter) => f === 'all' || (f === 'done') === t.done

/** Preferência simples guardada no navegador (falha silenciosa sem storage). */
function useStored<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const v = localStorage.getItem(key) as T | null
      return v && allowed.includes(v) ? v : fallback
    } catch {
      return fallback
    }
  })
  const change = (v: T) => {
    setValue(v)
    try {
      localStorage.setItem(key, v)
    } catch {
      // sem storage: a escolha vale só nesta sessão
    }
  }
  return [value, change]
}

/** Semana inicial: a corrente; senão a última com task; senão a primeira. */
function initialWeek(weeks: Week[], tasks: Task[]): string {
  const current = weeks.find((w) => w.isCurrent)
  if (current) return current.start
  const withTasks = weeks.filter((w) => tasks.some((t) => t.week === w.start))
  return (withTasks.at(-1) ?? weeks[0])?.start ?? ''
}

function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`btn ${value === o.id ? 'btn-dark' : 'btn-outline-dark'}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
          {o.count !== undefined && <span className="opacity-75"> ({o.count})</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * Tasks do mês ou de uma semana, em duas listas (desenvolvimento e testes), com filtro de status.
 * Remontado a cada mês (key), então a semana escolhida volta para a corrente ao trocar de mês.
 */
export function TaskLists({ tasks, weeks }: { tasks: Task[]; weeks: Week[] }) {
  const [scope, setScope] = useStored<Scope>('kahuy.taskScope', ['month', 'week'], 'month')
  const [filter, setFilter] = useStored<Filter>('kahuy.taskFilter', ['all', 'open', 'done'], 'all')
  const [week, setWeek] = useState(() => initialWeek(weeks, tasks))

  const inScope = scope === 'month' ? tasks : tasks.filter((t) => t.week === week)
  const visible = inScope.filter((t) => matches(t, filter))
  const selected = weeks.find((w) => w.start === week)

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 busy-section">
        <h2 className="h5 fw-bold mb-0">
          {scope === 'month' || !selected ? 'Tasks do mês' : `Tasks da semana · ${weekLabel(selected)}`}
        </h2>
        <div className="d-flex flex-wrap gap-2">
          <Segmented label="Período das tasks" options={SCOPES} value={scope} onChange={setScope} />
          <Segmented
            label="Filtrar tasks"
            options={FILTERS.map((f) => ({ ...f, count: inScope.filter((t) => matches(t, f.id)).length }))}
            value={filter}
            onChange={setFilter}
          />
        </div>
      </div>

      {scope === 'week' && (
        <div className="d-flex gap-2 overflow-auto pb-1 busy-section" role="group" aria-label="Semana">
          {weeks.map((w) => {
            const done = tasks.filter((t) => t.week === w.start && t.done).reduce((acc, t) => acc + t.hours, 0)
            const active = w.start === week
            return (
              <button
                key={w.start}
                type="button"
                className={`btn btn-sm text-nowrap ${active ? 'btn-dark' : 'btn-outline-secondary'}`}
                aria-pressed={active}
                title={w.isCurrent ? 'Semana atual' : undefined}
                onClick={() => setWeek(w.start)}
              >
                {w.isCurrent && <span className="text-success me-1">●</span>}
                {weekLabel(w)}
                <span className={active ? 'opacity-75' : 'text-secondary'}> · {hours(done)}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="row g-3">
        <div className="col-xl-6">
          <TaskTable title="Desenvolvimento" tasks={visible.filter((t) => t.kind === 'development')} />
        </div>
        <div className="col-xl-6">
          <TaskTable title="Testes" tasks={visible.filter((t) => t.kind === 'test')} />
        </div>
      </div>
    </div>
  )
}

function TaskTable({ title, tasks }: { title: string; tasks: Task[] }) {
  const total = tasks.reduce((acc, t) => acc + t.hours, 0)
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between mb-2">
          <div className="label">{title}</div>
          <div className="small text-secondary">
            {tasks.length} · <strong className="text-dark">{hours(total)}</strong>
          </div>
        </div>
        {tasks.length === 0 ? (
          <p className="small text-secondary mb-0">Nenhuma task.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr className="label">
                  <th className="fw-semibold">Task</th>
                  <th className="fw-semibold">Status</th>
                  <th className="fw-semibold text-end">Horas</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.url}>
                    <td>
                      <a href={t.url} target="_blank" rel="noopener noreferrer" className="link-dark text-decoration-none">
                        {t.title}
                      </a>
                    </td>
                    <td className="text-nowrap">
                      {t.done ? (
                        <span className="badge text-bg-success">Concluída{t.date ? ` · ${shortDate(t.date)}` : ''}</span>
                      ) : (
                        <span className="badge text-bg-light border">{t.status}</span>
                      )}
                    </td>
                    <td className="text-end text-nowrap">{hours(t.hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
