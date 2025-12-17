import type { ParkingPlan, ParkingPlanDayEntry } from '../utils/planner'
import type { Person } from '../types/person'
import { WEEKDAY_LABELS_PL, Weekday } from '../types/schedule'

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
                    .map((id) => personsById.get(id)?.fullName)
                    .filter(Boolean)
                  const label =
                    cellPersons.length === 0 ? '' : cellPersons.join(', ')

                  return (
                    <td key={key} className={getCellClass(entry)}>
                      {label}
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


