import type { ScheduleRule } from './schedule'

export interface Person {
  id: string
  fullName: string
  teamIds: string[]
  scheduleRules: ScheduleRule[]
}


