import type { ParkingPlan, ParkingPlanDayEntry } from '../utils/planner'
import type { Person } from '../types/person'
import {
  WEEKDAY_LABELS_PL,
  Weekday,
  type AlwaysOnDaysRule,
  type OneOfDaysRule,
  type ScheduleRule,
  type XTimesPerMonthRule,
} from '../types/schedule'
import { TEAM_BY_ID } from '../types/team'

const WEEKDAYS_ORDER: Weekday[] = [
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
]

const SHORT_LABELS_PL: Record<Weekday, string> = {
  [Weekday.Monday]: 'PN',
  [Weekday.Tuesday]: 'WT',
  [Weekday.Wednesday]: 'ŚR',
  [Weekday.Thursday]: 'CZ',
  [Weekday.Friday]: 'PT',
}

interface ParkingPlanTableProps {
  plan: ParkingPlan
  persons: Person[]
  places: { id: string; name: string }[]
}

function getCellClass(entry: ParkingPlanDayEntry): string {
  const count = entry.personIds.length
  if (count === 0) return 'cell-empty'
  if (count === 1) return 'cell-ok'
  return 'cell-conflict'
}

/**
 * Tworzy skrót z imienia i nazwiska (pierwsze litery).
 * Np. "Jan Kowalski" -> "JK"
 */
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || ''
  return (
    (parts[0][0]?.toUpperCase() || '') +
    (parts[parts.length - 1][0]?.toUpperCase() || '')
  )
}

/**
 * Opisuje regułę harmonogramu po polsku.
 */
function describeRule(rule: ScheduleRule): string {
  switch (rule.type) {
    case 'ALWAYS_ON_DAYS': {
      const r = rule as AlwaysOnDaysRule
      const days = r.days.map((d) => WEEKDAY_LABELS_PL[d]).join(', ')
      return `Zawsze w dni: ${days} (co ${r.weekInterval} tygodni)`
    }
    case 'ONE_OF_DAYS': {
      const r = rule as OneOfDaysRule
      const days = r.possibleDays.map((d) => WEEKDAY_LABELS_PL[d]).join(', ')
      return `Jeden z dni: ${days} (co ${r.weekInterval} tygodni)`
    }
    case 'X_TIMES_PER_MONTH': {
      const r = rule as XTimesPerMonthRule
      const excluded =
        r.excludedDays.length > 0
          ? r.excludedDays.map((d) => WEEKDAY_LABELS_PL[d]).join(', ')
          : 'brak'
      return `${r.timesPerMonth} razy w miesiącu, wykluczone: ${excluded}`
    }
    default:
      return 'Brak szczegółów harmonogramu'
  }
}

export function ParkingPlanTable({
  plan,
  persons,
  places,
}: ParkingPlanTableProps) {
  const personsById = new Map(persons.map((p) => [p.id, p]))

  const entriesByPlaceAndDate = new Map<string, ParkingPlanDayEntry>()
  for (const entry of plan.entries) {
    entriesByPlaceAndDate.set(`${entry.placeId}|${entry.date}`, entry)
  }

  return (
    <div className="plan-wrapper">
      <table className="plan-table">
        <thead>
          <tr>
            <th rowSpan={2}>Miejsce</th>
            {Array.from({ length: plan.weeks }, (_, wIndex) => (
              <th key={`week-${wIndex}`} colSpan={WEEKDAYS_ORDER.length}>
                Tydzień {wIndex + 1}
              </th>
            ))}
          </tr>
          <tr>
            {Array.from({ length: plan.weeks }, (_, wIndex) =>
              WEEKDAYS_ORDER.map((day) => (
                <th key={`w${wIndex + 1}-${day}`}>{SHORT_LABELS_PL[day]}</th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {places.map((place) => (
            <tr key={place.id}>
              <td className="plan-place-name">{place.name}</td>
              {Array.from({ length: plan.weeks }, (_, wIndex) =>
                WEEKDAYS_ORDER.map((day) => {
                  const dateId = `W${wIndex + 1}_${day}`
                  const key = `${place.id}|${dateId}`
                  const entry =
                    entriesByPlaceAndDate.get(key) ??
                    ({
                      date: dateId,
                      placeId: place.id,
                      personIds: [],
                    } satisfies ParkingPlanDayEntry)

                  const cellPersons = entry.personIds
                    .map((id) => personsById.get(id))
                    .filter(Boolean) as Person[]

                  const initials = cellPersons.map((p) => getInitials(p.fullName))
                  const displayLabel =
                    initials.length === 0 ? '' : initials.join(', ')

                  // Przygotuj tooltip z pełnymi informacjami
                  const tooltipContent =
                    cellPersons.length > 0
                      ? cellPersons
                          .map((person) => {
                            // Obsługa migracji: jeśli teamIds nie istnieje, sprawdź teamId
                            let teamIds: string[] = []
                            if ('teamIds' in person && Array.isArray(person.teamIds)) {
                              teamIds = person.teamIds
                            } else if ('teamId' in person) {
                              const oldPerson = person as unknown as { teamId?: string | null }
                              teamIds = oldPerson.teamId && oldPerson.teamId !== null ? [oldPerson.teamId] : []
                            }
                            
                            const teamNames =
                              teamIds.length > 0
                                ? teamIds
                                    .map((id) => TEAM_BY_ID[id]?.name)
                                    .filter(Boolean)
                                    .join(', ') || 'Brak zespołu'
                                : 'Brak zespołu'
                            const rulesDesc =
                              person.scheduleRules.length > 0
                                ? person.scheduleRules
                                    .map((r) => describeRule(r))
                                    .join('; ')
                                : 'Brak harmonogramu'
                            return `${person.fullName}\nZespół: ${teamNames}\nHarmonogramy: ${rulesDesc}`
                          })
                          .join('\n\n')
                      : ''

                  return (
                    <td key={key} className={getCellClass(entry)}>
                      {displayLabel && (
                        <span
                          className="cell-person-initials"
                          title={tooltipContent}
                        >
                          {displayLabel}
                        </span>
                      )}
                    </td>
                  )
                }),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


