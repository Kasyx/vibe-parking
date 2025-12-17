import './App.css'
import { useState, useEffect } from 'react'
import { PersonForm } from './components/PersonForm'
import { PersonList } from './components/PersonList'
import { ParkingPlanTable } from './components/ParkingPlanTable'
import { useLocalStorageState } from './hooks/useLocalStorage'
import type { Person } from './types/person'
import { DEFAULT_OBJECTIVE_WEIGHTS } from './types/objectives'
import {
  generateParkingPlan,
  updatePlanAfterGroupChange,
  performSimulatedAnnealingIteration,
  calculateTotalScore,
  type ParkingPlan,
} from './utils/planner'
import { GroupAssignmentEditor } from './components/GroupAssignmentEditor'
import type { GroupAssignment } from './utils/planner'

function App() {
  const [persons, setPersons] = useLocalStorageState<Person[]>(
    'parkingPlanner.persons.v1',
    [],
  )
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [placesCount, setPlacesCount] = useState<number>(7)
  const [maxPersonsPerPlace, setMaxPersonsPerPlace] = useState<number>(4)
  const [weights, setWeights] = useState(DEFAULT_OBJECTIVE_WEIGHTS)
  const [plan, setPlan] = useState<ParkingPlan | null>(null)
  const [groupAssignments, setGroupAssignments] = useState<
    GroupAssignment[] | null
  >(null)
  const [iterationCount, setIterationCount] = useState<number>(0)
  const [totalScore, setTotalScore] = useState<number>(0)

  // Migracja danych: konwersja teamId -> teamIds
  useEffect(() => {
    const needsMigration = persons.some(
      (p) => !('teamIds' in p) || p.teamIds === undefined,
    )
    if (needsMigration) {
      setPersons((prev) =>
        prev.map((p) => {
          // Jeśli ma starą strukturę (teamId), przekonwertuj
          if (!('teamIds' in p) || p.teamIds === undefined) {
            const oldPerson = p as unknown as { teamId?: string | null }
            return {
              ...p,
              teamIds:
                oldPerson.teamId && oldPerson.teamId !== null
                  ? [oldPerson.teamId]
                  : [],
            }
          }
          return p
        }),
      )
    }
  }, [persons, setPersons])

  const editingPerson = persons.find((p) => p.id === editingPersonId) ?? null

  const handleUpsertPerson = (data: Omit<Person, 'id'>, originalId?: string) => {
    if (originalId) {
      setPersons((prev) =>
        prev.map((p) => (p.id === originalId ? { ...p, ...data } : p)),
      )
      setEditingPersonId(null)
    } else {
      const newPerson: Person = {
        id: crypto.randomUUID(),
        ...data,
      }
      setPersons((prev) => [...prev, newPerson])
    }
  }

  const handleEditPerson = (person: Person) => {
    setEditingPersonId(person.id)
  }

  const handleDeletePerson = (person: Person) => {
    const confirmed = window.confirm(
      `Czy na pewno chcesz usunąć osobę „${person.fullName}”?`,
    )
    if (!confirmed) return
    setPersons((prev) => prev.filter((p) => p.id !== person.id))
    if (editingPersonId === person.id) {
      setEditingPersonId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingPersonId(null)
  }

  const handleGeneratePlanClick = () => {
    const places = Array.from({ length: placesCount }, (_, index) => ({
      id: `P${index + 1}`,
      name: `Miejsce ${index + 1}`,
      maxPersons: maxPersonsPerPlace,
    }))

    const nextPlan = generateParkingPlan(persons, places, {
      objectiveWeights: weights,
    })
    setPlan(nextPlan)

    // Wyciągnij przypisania grup z planu
    const assignments: GroupAssignment[] = places.map((place) => {
      const personIdsSet = new Set<string>()
      for (const entry of nextPlan.entries) {
        if (entry.placeId === place.id) {
          for (const pid of entry.personIds) {
            personIdsSet.add(pid)
          }
        }
      }
      return {
        placeId: place.id,
        personIds: Array.from(personIdsSet),
      }
    })
    setGroupAssignments(assignments)
    setIterationCount(0)
    setTotalScore(calculateTotalScore(nextPlan))
  }

  const handleGroupChange = (assignments: GroupAssignment[]) => {
    if (!plan) return

    const places = Array.from({ length: placesCount }, (_, index) => ({
      id: `P${index + 1}`,
      name: `Miejsce ${index + 1}`,
      maxPersons: maxPersonsPerPlace,
    }))

    const updatedPlan = updatePlanAfterGroupChange(
      plan,
      persons,
      places,
      weights,
      assignments,
    )

    setPlan(updatedPlan)
    setGroupAssignments(assignments)
    setTotalScore(calculateTotalScore(updatedPlan))
  }

  const handleRunIterations = () => {
    if (!plan || !groupAssignments) return

    const places = Array.from({ length: placesCount }, (_, index) => ({
      id: `P${index + 1}`,
      name: `Miejsce ${index + 1}`,
      maxPersons: maxPersonsPerPlace,
    }))

    let currentPlan = plan
    let currentAssignments = groupAssignments
    let bestPlan = plan
    let bestAssignments = groupAssignments
    let bestScore = totalScore
    let newIterationCount = iterationCount

    // Wykonaj 500 iteracji
    for (let i = 0; i < 500; i += 1) {
      const result = performSimulatedAnnealingIteration(
        currentPlan,
        currentAssignments,
        persons,
        places,
        weights,
      )

      if (result) {
        // Akceptuj zmianę jeśli jest lepsza lub taka sama
        if (result.totalScore <= bestScore) {
          bestPlan = result.newPlan
          bestAssignments = result.newAssignments
          bestScore = result.totalScore
        }

        // W symulowanym wyżarzaniu akceptujemy też gorsze rozwiązania z prawdopodobieństwem
        // Na razie akceptujemy tylko lepsze lub równe
        currentPlan = result.newPlan
        currentAssignments = result.newAssignments
        newIterationCount += 1
      }
    }

    // Zastosuj najlepsze rozwiązanie
    setPlan(bestPlan)
    setGroupAssignments(bestAssignments)
    setTotalScore(bestScore)
    setIterationCount(newIterationCount)
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Planner miejsc parkingowych</h1>
        <p className="subtitle">
          Dodaj osoby i zdefiniuj ich preferencje parkowania. Moduł planowania
          miejsc pojawi się w kolejnym kroku.
        </p>
      </header>

      <main className="app-main">
        <div className="layout-two-columns">
          <div>
            <PersonForm
              onSubmit={handleUpsertPerson}
              editingPerson={editingPerson}
              onCancelEdit={handleCancelEdit}
            />
          </div>
          <div>
            <PersonList
              persons={persons}
              onEdit={handleEditPerson}
              onDelete={handleDeletePerson}
              currentlyEditingId={editingPersonId}
            />
          </div>
        </div>

        <section className="card">
          <h2>Konfiguracja planowania</h2>
          <div className="form-row">
            <label>
              Liczba miejsc parkingowych
              <input
                type="number"
                min={1}
                max={200}
                value={placesCount}
                onChange={(e) =>
                  setPlacesCount(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Maksymalna liczba osób przypisana do jednego miejsca
              <input
                type="number"
                min={1}
                max={10}
                value={maxPersonsPerPlace}
                onChange={(e) =>
                  setMaxPersonsPerPlace(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </label>
          </div>

          <div className="form-row">
            <span className="field-label">Wagi celów (0–100)</span>
            <label className="inline-group slider-row">
              <span>Separacja zespołów w grupach</span>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.teamSeparation}
                onChange={(e) =>
                  setWeights((prev) => ({
                    ...prev,
                    teamSeparation: Number(e.target.value) || 0,
                  }))
                }
              />
              <span className="slider-value">{weights.teamSeparation}</span>
            </label>
            <label className="inline-group slider-row">
              <span>Priorytet częstych przyjazdów</span>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.frequentVisitors}
                onChange={(e) =>
                  setWeights((prev) => ({
                    ...prev,
                    frequentVisitors: Number(e.target.value) || 0,
                  }))
                }
              />
              <span className="slider-value">{weights.frequentVisitors}</span>
            </label>
            <label className="inline-group slider-row">
              <span>Minimalizacja zwykłych konfliktów</span>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.generalConflicts}
                onChange={(e) =>
                  setWeights((prev) => ({
                    ...prev,
                    generalConflicts: Number(e.target.value) || 0,
                  }))
                }
              />
              <span className="slider-value">{weights.generalConflicts}</span>
            </label>
          </div>
          <button type="button" onClick={handleGeneratePlanClick}>
            Wygeneruj plan
          </button>
        </section>

        {plan && groupAssignments && (
          <>
            <section className="card">
              <GroupAssignmentEditor
                persons={persons}
                places={Array.from({ length: placesCount }, (_, index) => ({
                  id: `P${index + 1}`,
                  name: `Miejsce ${index + 1}`,
                  maxPersons: maxPersonsPerPlace,
                }))}
                groupAssignments={groupAssignments}
                onGroupChange={handleGroupChange}
              />
              <div className="optimization-controls">
                <div className="optimization-stats">
                  <div className="stat-item">
                    <span className="stat-label">Suma wag:</span>
                    <span className="stat-value">{totalScore.toFixed(2)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Iteracje:</span>
                    <span className="stat-value">{iterationCount}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary"
                  onClick={handleRunIterations}
                >
                  Wykonaj 500 iteracji optymalizacji
                </button>
              </div>
            </section>

            <section className="card">
              <h2>Plan miejsc parkingowych</h2>
              <p className="subtitle">
                Zielony – brak konfliktu, czerwony – konflikt, szary – brak
                przypisanej osoby.
              </p>
              <ParkingPlanTable
                plan={plan}
                persons={persons}
                places={Array.from({ length: placesCount }, (_, index) => ({
                  id: `P${index + 1}`,
                  name: `Miejsce ${index + 1}`,
                }))}
              />
              {plan.placeScores.length > 0 && (
                <div className="plan-scores">
                  <h3>Wagi/oceny dla poszczególnych miejsc</h3>
                  <table className="plan-table">
                    <thead>
                      <tr>
                        <th>Miejsce</th>
                        <th>Skład zespołowy</th>
                        <th>Częste przyjazdy</th>
                        <th>Zwykłe konflikty</th>
                        <th>Suma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.placeScores.map((score, index) => (
                        <tr key={score.placeId}>
                          <td className="plan-place-name">
                            Miejsce {index + 1}
                          </td>
                          <td>{score.teamSeparationScore.toFixed(2)}</td>
                          <td>{score.frequentVisitorsScore.toFixed(2)}</td>
                          <td>{score.generalConflictsScore.toFixed(2)}</td>
                          <td>{score.totalScore.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
