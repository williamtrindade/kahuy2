const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function hours(n: number): string {
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`
}

export function signedHours(n: number): string {
  return `${n >= 0 ? '+' : '−'}${hours(Math.abs(n))}`
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[(m ?? 1) - 1]} ${y}`
}

export function quarterLabel(quarter: string): string {
  const [y, q] = quarter.split('-Q')
  return `${q}º trimestre ${y}`
}

export function dayLabel(isoDate: string): string {
  return isoDate.slice(8, 10)
}
