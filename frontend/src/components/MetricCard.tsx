import type { ReactNode } from 'react'

export function MetricCard({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`card h-100 ${className}`}>
      <div className="card-body">
        <div className="label mb-2">{label}</div>
        {children}
      </div>
    </div>
  )
}
