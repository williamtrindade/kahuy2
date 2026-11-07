import type { Task } from '../../Entities/Task'

/** Task da fonte que viola uma regra das Entities (ex.: horas negativas): fica fora da conta. */
export type InvalidTask = { title: string; url: string; reason: string }

export type TaskList = { tasks: Task[]; invalid: InvalidTask[] }

export interface TaskRepositoryInterface {
  findAll(): Promise<TaskList>
}
