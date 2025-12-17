import type { ScheduleRule } from './schedule'

export interface Person {
  id: string
  fullName: string
  teamId: string | null
  scheduleRules: ScheduleRule[]
}


