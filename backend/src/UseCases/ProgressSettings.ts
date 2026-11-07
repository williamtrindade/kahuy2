export type ProgressSettings = {
  doneStatuses: readonly string[]
  timeZone: string
  goalTiers: readonly number[]
  /** Tipos de task de teste: nelas o [nome] do título é o dev. */
  testTypes: readonly string[]
}
