import type { CSSProperties } from 'react'

/** Primeira carga: os cards da página já no lugar, cada um com o seu spinner. */
export function PlaceholderCards({ cards }: { cards: { label: string; height: number }[] }) {
  return (
    <div className="d-flex flex-column gap-3" aria-busy="true">
      {cards.map((c) => (
        <div
          key={c.label}
          className="card card-placeholder is-loading"
          style={{ '--placeholder-height': `${c.height}px` } as CSSProperties}
        >
          <div className="card-body">
            <div className="label">{c.label}</div>
          </div>
        </div>
      ))}
      <span className="visually-hidden" role="status">
        Carregando…
      </span>
    </div>
  )
}

export function ErrorAlert({ message }: { message: string }) {
  return <div className="alert alert-danger mb-0">{message}</div>
}
