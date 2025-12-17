export enum Weekday {
  Monday = 'MONDAY',
  Tuesday = 'TUESDAY',
  Wednesday = 'WEDNESDAY',
  Thursday = 'THURSDAY',
  Friday = 'FRIDAY',
}

export const WEEKDAY_LABELS_PL: Record<Weekday, string> = {
  [Weekday.Monday]: 'Poniedziałek',
  [Weekday.Tuesday]: 'Wtorek',
  [Weekday.Wednesday]: 'Środa',
  [Weekday.Thursday]: 'Czwartek',
  [Weekday.Friday]: 'Piątek',
}

export type ScheduleRuleType =
  | 'ALWAYS_ON_DAYS'
  | 'ONE_OF_DAYS'
  | 'X_TIMES_PER_MONTH'

export interface BaseScheduleRule {
  id: string
  type: ScheduleRuleType
}

export interface AlwaysOnDaysRule extends BaseScheduleRule {
  type: 'ALWAYS_ON_DAYS'
  days: Weekday[]
  weekInterval: 1 | 2 | 3 | 4
}

export interface OneOfDaysRule extends BaseScheduleRule {
  type: 'ONE_OF_DAYS'
  possibleDays: Weekday[]
  weekInterval: 1 | 2 | 3 | 4
}

export interface XTimesPerMonthRule extends BaseScheduleRule {
  type: 'X_TIMES_PER_MONTH'
  timesPerMonth: number
  excludedDays: Weekday[]
}

export type ScheduleRule =
  | AlwaysOnDaysRule
  | OneOfDaysRule
  | XTimesPerMonthRule


