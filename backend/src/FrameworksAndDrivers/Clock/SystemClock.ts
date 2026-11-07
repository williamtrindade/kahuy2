import type { ClockInterface } from '../../UseCases/Contracts/ClockInterface'

export class SystemClock implements ClockInterface {
  now(): Date {
    return new Date()
  }
}
