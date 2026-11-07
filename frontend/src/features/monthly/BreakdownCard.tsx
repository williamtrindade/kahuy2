import { hours } from '../../format'

export function BreakdownCard({ title, rows }: { title: string; rows: { name: string; hours: number }[] }) {
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((r) => r.hours), 1)
  return (
    <div className="card">
      <div className="card-body">
        <div className="label mb-3">{title}</div>
        {rows.map((r) => (
          <div key={r.name} className="mb-2">
            <div className="d-flex justify-content-between small">
              <span className="text-truncate me-2">{r.name}</span>
              <span className="text-nowrap fw-semibold">{hours(r.hours)}</span>
            </div>
            <div className="progress" style={{ height: 6 }}>
              <div className="progress-bar bg-success" style={{ width: `${(r.hours / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
