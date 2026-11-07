import { useState } from 'react'

/** Entregue = só concluídas · Previsto = concluídas + tasks em aberto. */
export type Scenario = 'delivered' | 'forecast'

/** Cenário escolhido num card, lembrado no navegador (cada card tem a sua chave). */
export function useScenario(storageKey: string): [Scenario, (s: Scenario) => void] {
  const [value, setValue] = useState<Scenario>(() => {
    try {
      return localStorage.getItem(storageKey) === 'forecast' ? 'forecast' : 'delivered'
    } catch {
      return 'delivered'
    }
  })
  const change = (s: Scenario) => {
    setValue(s)
    try {
      localStorage.setItem(storageKey, s)
    } catch {
      // sem storage: a escolha vale só nesta sessão
    }
  }
  return [value, change]
}

const OPTIONS: { id: Scenario; label: string; title: string }[] = [
  { id: 'delivered', label: 'Entregue', title: 'Só tasks concluídas' },
  { id: 'forecast', label: 'Previsto', title: 'Concluídas + tasks em aberto' },
]

export function ScenarioToggle({ value, onChange, onDark = false }: { value: Scenario; onChange: (s: Scenario) => void; onDark?: boolean }) {
  const tone = onDark ? 'light' : 'dark'
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label="Entregue ou previsto">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          className={`btn ${value === o.id ? `btn-${tone}` : `btn-outline-${tone}`}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
