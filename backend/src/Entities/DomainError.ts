/** Violação de uma regra de negócio corporativa (camada Entities). */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}
