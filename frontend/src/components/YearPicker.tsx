import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

type Option = { id: string; label: string; title?: string }

type Props = {
  /** período aberto (ex.: 2026-11 ou 2026-Q4); os 4 primeiros caracteres são o ano */
  value: string
  /** período atual, marcado com ●; undefined se ainda não se sabe */
  current?: string
  /** desabilita as opções enquanto o período escolhido carrega (uma requisição por vez) */
  disabled?: boolean
  /** as opções de um ano (meses, trimestres…) */
  options: (year: number) => Option[]
  /** nome do grupo para leitores de tela, ex.: "Meses" */
  name: string
  /** classe do grid de opções (colunas) */
  gridClassName: string
  onChange: (id: string) => void
}

/**
 * Ano por botões (‹ 2026 ›: só troca as opções mostradas, sem buscar nada) e as opções do ano à vista;
 * a busca acontece ao clicar numa opção.
 */
export function YearPicker({ value, current, disabled = false, options, name, gridClassName, onChange }: Props) {
  const [year, setYear] = useState(Number(value.slice(0, 4)))

  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      <div className="d-flex align-items-center gap-1">
        <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setYear(year - 1)} aria-label="Ano anterior">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <span className="fw-semibold text-center" style={{ minWidth: 48 }} aria-live="polite">
          {year}
        </span>
        <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setYear(year + 1)} aria-label="Próximo ano">
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
      <div className={`period-grid ${gridClassName}`} role="radiogroup" aria-label={`${name} de ${year}`}>
        {options(year).map((o) => {
          const active = o.id === value
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled && !active}
              className={`btn btn-sm ${active ? 'btn-dark' : 'btn-outline-secondary'}`}
              title={o.id === current ? `${o.title ?? o.label} (atual)` : o.title}
              onClick={() => !active && onChange(o.id)}
            >
              {o.label}
              {o.id === current && <span className="period-dot" aria-hidden />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const monthOptions = (year: number): Option[] =>
  MONTHS.map((label, i) => ({ id: `${year}-${String(i + 1).padStart(2, '0')}`, label }))

export const quarterOptions = (year: number): Option[] =>
  [1, 2, 3, 4].map((q) => ({ id: `${year}-Q${q}`, label: `${q}º tri`, title: `${q}º trimestre de ${year}` }))
