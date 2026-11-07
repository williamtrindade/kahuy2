export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Percentual inteiro; 0 quando não há meta. */
export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}
