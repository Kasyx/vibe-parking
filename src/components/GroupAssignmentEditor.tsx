import { useState } from 'react'
import type { Person } from '../types/person'
import type {
  GroupAssignment,
  ParkingPlaceConfig,
} from '../utils/planner'
import type { ScheduleRule } from '../types/schedule'

interface GroupAssignmentEditorProps {
  persons: Person[]
  places: ParkingPlaceConfig[]
  groupAssignments: GroupAssignment[]
  onGroupChange: (assignments: GroupAssignment[]) => void
}

export function GroupAssignmentEditor({
  persons,
  places,
  groupAssignments,
  onGroupChange,
}: GroupAssignmentEditorProps) {
  const [draggedPersonId, setDraggedPersonId] = useState<string | null>(null)

  const personsById = new Map(persons.map((p) => [p.id, p]))

  /**
   * Zwraca listę kolorów kropek na podstawie harmonogramów osoby.
   * Każdy typ harmonogramu ma swój kolor:
   * - czerwona: ALWAYS_ON_DAYS
   * - żółta: ONE_OF_DAYS
   * - zielona: X_TIMES_PER_MONTH
   */
  function getPersonDotColors(person: Person): Array<'red' | 'yellow' | 'green'> {
    const rules = person.scheduleRules ?? []
    if (rules.length === 0) return []

    const colors: Array<'red' | 'yellow' | 'green'> = []
    const types = new Set<string>()

    for (const rule of rules) {
      if (rule.type === 'ALWAYS_ON_DAYS' && !types.has('ALWAYS_ON_DAYS')) {
        colors.push('red')
        types.add('ALWAYS_ON_DAYS')
      } else if (rule.type === 'ONE_OF_DAYS' && !types.has('ONE_OF_DAYS')) {
        colors.push('yellow')
        types.add('ONE_OF_DAYS')
      } else if (
        rule.type === 'X_TIMES_PER_MONTH' &&
        !types.has('X_TIMES_PER_MONTH')
      ) {
        colors.push('green')
        types.add('X_TIMES_PER_MONTH')
      }
    }

    return colors
  }

  const handleDragStart = (personId: string) => {
    setDraggedPersonId(personId)
  }

  const handleDragEnd = () => {
    setDraggedPersonId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetPlaceId: string) => {
    if (!draggedPersonId) return

    const updatedAssignments = groupAssignments.map((group) => {
      // Usuń osobę z wszystkich grup
      const personIds = group.personIds.filter((id) => id !== draggedPersonId)

      // Dodaj do docelowej grupy, jeśli jest miejsce
      if (group.placeId === targetPlaceId) {
        const place = places.find((p) => p.id === targetPlaceId)
        if (place && personIds.length < place.maxPersons) {
          personIds.push(draggedPersonId)
        }
      }

      return {
        ...group,
        personIds,
      }
    })

    onGroupChange(updatedAssignments)
    setDraggedPersonId(null)
  }

  return (
    <div className="group-assignment-editor">
      <h3>Przypisanie osób do grup parkingowych</h3>
      <p className="subtitle">
        Przeciągnij osobę między grupami, aby zmienić jej przypisanie.
      </p>
      <div className="dots-legend">
        <span className="legend-item">
          <span className="person-dot person-dot-red" />
          <span>ZAWSZE w wybrane dni</span>
        </span>
        <span className="legend-item">
          <span className="person-dot person-dot-yellow" />
          <span>Jeden z wybranych dni</span>
        </span>
        <span className="legend-item">
          <span className="person-dot person-dot-green" />
          <span>X razy w miesiącu</span>
        </span>
      </div>
      <div className="groups-grid">
        {places.map((place) => {
          const group = groupAssignments.find((g) => g.placeId === place.id)
          const groupPersonIds = group?.personIds ?? []
          const groupPersons = groupPersonIds
            .map((id) => personsById.get(id))
            .filter(Boolean) as Person[]

          return (
            <div
              key={place.id}
              className="group-box"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(place.id)}
            >
              <div className="group-header">
                <strong>{place.name}</strong>
                <span className="group-count">
                  {groupPersonIds.length}/{place.maxPersons}
                </span>
              </div>
              <div className="group-persons">
                {groupPersons.map((person) => {
                  const dotColors = getPersonDotColors(person)
                  const getDotTitle = (color: 'red' | 'yellow' | 'green') => {
                    if (color === 'red') return 'Harmonogram: ZAWSZE w wybrane dni'
                    if (color === 'yellow') return 'Harmonogram: Jeden z wybranych dni'
                    return 'Harmonogram: X razy w miesiącu'
                  }

                  return (
                    <div
                      key={person.id}
                      className="person-drag-item"
                      draggable
                      onDragStart={() => handleDragStart(person.id)}
                      onDragEnd={handleDragEnd}
                    >
                      {dotColors.length > 0 && (
                        <span className="person-dots">
                          {dotColors.map((color, index) => (
                            <span
                              key={`${color}-${index}`}
                              className={`person-dot person-dot-${color}`}
                              title={getDotTitle(color)}
                            />
                          ))}
                        </span>
                      )}
                      {person.fullName}
                    </div>
                  )
                })}
                {groupPersonIds.length === 0 && (
                  <div className="group-empty">Przeciągnij osoby tutaj</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

