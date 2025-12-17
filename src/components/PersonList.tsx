import type { Person } from '../types/person'
import {
  WEEKDAY_LABELS_PL,
  type AlwaysOnDaysRule,
  type OneOfDaysRule,
  type ScheduleRule,
  type XTimesPerMonthRule,
} from '../types/schedule'
import { TEAM_BY_ID } from '../types/team'

export interface PersonListProps {
  persons: Person[]
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
  currentlyEditingId: string | null
}

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

export function PersonList({
  persons,
  onEdit,
  onDelete,
  currentlyEditingId,
}: PersonListProps) {
  if (persons.length === 0) {
    return (
      <section className="card">
        <h2>Osoby</h2>
        <p>Nie dodano jeszcze żadnych osób.</p>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>Osoby</h2>
      <table className="person-table">
        <thead>
          <tr>
            <th>Imię i nazwisko</th>
            <th>Zespół</th>
            <th>Harmonogram</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {persons.map((person) => {
            const rules = person.scheduleRules ?? []
            const description =
              rules.length === 0
                ? 'Brak harmonogramu'
                : rules.map((r) => describeRule(r)).join('; ')
            const team =
              person.teamId && TEAM_BY_ID[person.teamId]
                ? TEAM_BY_ID[person.teamId].name
                : '—'

            return (
              <tr
                key={person.id}
                className={
                  person.id === currentlyEditingId ? 'row-editing' : undefined
                }
              >
                <td>{person.fullName}</td>
                <td>{team}</td>
                <td>{description}</td>
                <td className="actions-cell">
                  <button type="button" onClick={() => onEdit(person)}>
                    Edytuj
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onDelete(person)}
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}


