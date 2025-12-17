import type { Person } from '../types/person'
import type { ObjectiveWeights } from '../types/objectives'
import {
  Weekday,
  type AlwaysOnDaysRule,
  type OneOfDaysRule,
  type ScheduleRule,
  type XTimesPerMonthRule,
} from '../types/schedule'

export interface ParkingPlaceConfig {
  id: string
  name: string
  maxPersons: number // max 4
}

export interface PlannerOptions {
  startDate?: Date
  weeks?: number
  /**
   * Wagi celów optymalizacyjnych (0–100 dla każdej właściwości).
   * Jeśli nie zostaną podane, algorytm może użyć wartości domyślnych.
   */
  objectiveWeights?: ObjectiveWeights
}

export interface ParkingPlanDayEntry {
  /**
   * Identyfikator dnia w formacie W{tydzień}_{dzień},
   * np. "W1_MONDAY", "W3_FRIDAY".
   */
  date: string
  placeId: string
  /**
   * Wszystkie osoby przypisane do danego miejsca w danym dniu.
   * 0 osób  => pusty slot (szary),
   * 1 osoba => brak konfliktu (zielony),
   * 2+ osób => konflikt (czerwony).
   */
  personIds: string[]
}

export interface PlaceScores {
  placeId: string
  teamSeparationScore: number
  frequentVisitorsScore: number
  generalConflictsScore: number
  totalScore: number
}

export interface ParkingPlan {
  entries: ParkingPlanDayEntry[]
  weeks: number
  placeScores: PlaceScores[]
}

export interface GroupAssignment {
  placeId: string
  personIds: string[]
}

type Grid = string[][][] // [week][weekdayIndex] => string[] (personIds)

const WEEKDAYS_ORDER: Weekday[] = [
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
]

function shuffle<T>(items: T[]): T[] {
  const array = [...items]
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function assignPersonsToPlaces(
  persons: Person[],
  places: ParkingPlaceConfig[],
): GroupAssignment[] {
  const shuffledPersons = shuffle(persons)
  const result: GroupAssignment[] = places.map((place) => ({
    placeId: place.id,
    personIds: [],
  }))

  let placeIndex = 0
  for (const person of shuffledPersons) {
    // Znajdź pierwsze miejsce z wolną pojemnością
    let assigned = false
    for (let i = 0; i < places.length; i += 1) {
      const idx = (placeIndex + i) % places.length
      const place = places[idx]
      const group = result[idx]
      if (group.personIds.length < place.maxPersons) {
        group.personIds.push(person.id)
        placeIndex = (idx + 1) % places.length
        assigned = true
        break
      }
    }

    if (!assigned) {
      // Brak wolnej pojemności – na razie pomijamy tę osobę
      // (można to później obsłużyć lepiej).
    }
  }

  return result
}

function getRulesOfType<T extends ScheduleRule>(
  rules: ScheduleRule[],
  type: T['type'],
): T[] {
  return rules.filter((r) => r.type === type) as T[]
}

function initGrid(weeks: number): Grid {
  const grid: Grid = []
  for (let w = 0; w < weeks; w += 1) {
    const row: string[][] = []
    for (let d = 0; d < WEEKDAYS_ORDER.length; d += 1) {
      row.push([])
    }
    grid.push(row)
  }
  return grid
}

/**
 * Przypisuje osoby z grupy do konkretnych dni zgodnie z ich harmonogramami.
 * Zwraca wpisy planu dla danej grupy.
 */
function assignPersonsToDaysForGroup(
  groupPersonIds: string[],
  persons: Person[],
  placeId: string,
  weeks: number,
): ParkingPlanDayEntry[] {
  const grid = initGrid(weeks)
  const groupPersons = persons.filter((p) => groupPersonIds.includes(p.id))

  // 1) ZAWSZE w wybrane dni tygodnia
  for (const person of groupPersons) {
    const rulesAlways = getRulesOfType<AlwaysOnDaysRule>(
      person.scheduleRules,
      'ALWAYS_ON_DAYS',
    )
    for (const rule of rulesAlways) {
      for (let w = 0; w < weeks; w += 1) {
        if (w % rule.weekInterval !== 0) continue
        for (const day of rule.days) {
          const dIndex = WEEKDAYS_ORDER.indexOf(day)
          if (dIndex === -1) continue
          grid[w][dIndex].push(person.id)
        }
      }
    }
  }

  // 2) Jeden z wybranych dni tygodnia
  for (const person of groupPersons) {
    const rulesOneOf = getRulesOfType<OneOfDaysRule>(
      person.scheduleRules,
      'ONE_OF_DAYS',
    )
    for (const rule of rulesOneOf) {
      for (let w = 0; w < weeks; w += 1) {
        if (w % rule.weekInterval !== 0) continue

        const dayIndices = rule.possibleDays
          .map((d) => WEEKDAYS_ORDER.indexOf(d))
          .filter((idx) => idx >= 0)

        if (dayIndices.length === 0) continue

        const freeDays = dayIndices.filter((idx) => grid[w][idx].length === 0)
        let targetIndex: number
        if (freeDays.length > 0) {
          targetIndex = freeDays[0]
        } else {
          targetIndex = dayIndices.reduce((best, idx) => {
            if (grid[w][idx].length < grid[w][best].length) return idx
            return best
          }, dayIndices[0])
        }

        grid[w][targetIndex].push(person.id)
      }
    }
  }

  // 3) X razy w miesiącu z wykluczeniem podanych dni tygodnia
  for (const person of groupPersons) {
    const rulesMonth = getRulesOfType<XTimesPerMonthRule>(
      person.scheduleRules,
      'X_TIMES_PER_MONTH',
    )
    for (const rule of rulesMonth) {
      const allowedCells: Array<{ w: number; d: number }> = []
      for (let w = 0; w < weeks; w += 1) {
        for (let d = 0; d < WEEKDAYS_ORDER.length; d += 1) {
          const day = WEEKDAYS_ORDER[d]
          if (!rule.excludedDays.includes(day)) {
            allowedCells.push({ w, d })
          }
        }
      }

      let remaining = rule.timesPerMonth
      if (remaining <= 0 || allowedCells.length === 0) continue

      for (const cell of allowedCells) {
        if (remaining <= 0) break
        if (grid[cell.w][cell.d].length === 0) {
          grid[cell.w][cell.d].push(person.id)
          remaining -= 1
        }
      }

      while (remaining > 0) {
        const bestCell = allowedCells.reduce((best, cell) => {
          const bestLoad = grid[best.w][best.d].length
          const load = grid[cell.w][cell.d].length
          if (load < bestLoad) return cell
          return best
        }, allowedCells[0])
        grid[bestCell.w][bestCell.d].push(person.id)
        remaining -= 1
      }
    }
  }

  // Konwersja grida na płaską listę wpisów planu
  const entries: ParkingPlanDayEntry[] = []
  for (let w = 0; w < weeks; w += 1) {
    for (let d = 0; d < WEEKDAYS_ORDER.length; d += 1) {
      const day = WEEKDAYS_ORDER[d]
      const dateId = `W${w + 1}_${day}`
      entries.push({
        date: dateId,
        placeId,
        personIds: grid[w][d],
      })
    }
  }

  return entries
}

function estimatePersonFrequency(person: Person): number {
  let score = 0

  for (const rule of person.scheduleRules) {
    if (rule.type === 'ALWAYS_ON_DAYS') {
      const r = rule as AlwaysOnDaysRule
      score += r.days.length / r.weekInterval
    } else if (rule.type === 'ONE_OF_DAYS') {
      const r = rule as OneOfDaysRule
      score += 1 / r.weekInterval
    } else if (rule.type === 'X_TIMES_PER_MONTH') {
      const r = rule as XTimesPerMonthRule
      score += r.timesPerMonth / 5
    }
  }

  return score
}

function computePlaceScores(
  plan: ParkingPlan,
  persons: Person[],
  places: ParkingPlaceConfig[],
  weights: ObjectiveWeights,
): PlaceScores[] {
  const personsById = new Map(persons.map((p) => [p.id, p]))

  // Team separation – bazuje na osobach przypisanych do danego miejsca
  const personsByPlace = new Map<string, Set<string>>()
  for (const entry of plan.entries) {
    let set = personsByPlace.get(entry.placeId)
    if (!set) {
      set = new Set<string>()
      personsByPlace.set(entry.placeId, set)
    }
    for (const pid of entry.personIds) {
      set.add(pid)
    }
  }

  const placeIds = places.map((p) => p.id)

  // Wspólna mapa wpisów na potrzeby liczenia konfliktów
  const entriesByPlace = new Map<string, ParkingPlanDayEntry[]>()
  for (const entry of plan.entries) {
    const list = entriesByPlace.get(entry.placeId)
    if (list) {
      list.push(entry)
    } else {
      entriesByPlace.set(entry.placeId, [entry])
    }
  }

  // Częstotliwość przyjazdów dla każdej osoby (znormalizowana 0–1)
  const rawFreq = new Map<string, number>()
  let maxFreq = 0
  for (const person of persons) {
    const val = estimatePersonFrequency(person)
    rawFreq.set(person.id, val)
    if (val > maxFreq) maxFreq = val
  }
  const normFreq = new Map<string, number>()
  for (const [id, val] of rawFreq) {
    normFreq.set(id, maxFreq > 0 ? val / maxFreq : 0)
  }

  const wTeam = weights.teamSeparation / 100
  const wFreq = weights.frequentVisitors / 100
  const wGeneral = weights.generalConflicts / 100

  const scores: PlaceScores[] = []

  for (const placeId of placeIds) {
    const groupPersons = personsByPlace.get(placeId) ?? new Set<string>()

    // teamSeparationScore: liczba par osób mających wspólny zespół (im więcej, tym gorzej)
    // Dwie osoby tworzą parę jeśli mają przynajmniej jeden wspólny zespół
    const personList = Array.from(groupPersons)
      .map((pid) => {
        const p = personsById.get(pid)
        if (!p) return null
        // Obsługa migracji: jeśli teamIds nie istnieje, sprawdź teamId
        let teamIds: string[] = []
        if ('teamIds' in p && Array.isArray(p.teamIds)) {
          teamIds = p.teamIds
        } else if ('teamId' in p) {
          const oldPerson = p as unknown as { teamId?: string | null }
          teamIds = oldPerson.teamId && oldPerson.teamId !== null ? [oldPerson.teamId] : []
        }
        return { ...p, teamIds }
      })
      .filter((p): p is Person & { teamIds: string[] } => p !== null && p.teamIds.length > 0)
    
    let teamPairs = 0
    for (let i = 0; i < personList.length; i += 1) {
      for (let j = i + 1; j < personList.length; j += 1) {
        const personA = personList[i]
        const personB = personList[j]
        // Sprawdź czy mają wspólny zespół
        const hasCommonTeam = personA.teamIds.some((teamId) =>
          personB.teamIds.includes(teamId),
        )
        if (hasCommonTeam) {
          teamPairs += 1
        }
      }
    }
    const teamSeparationScore = teamPairs * wTeam

    // Konflikty w czasie – generalConflicts i frequentVisitors
    const placeEntries = entriesByPlace.get(placeId) ?? []
    const conflictsPerPerson = new Map<string, number>()
    let generalConflictsRaw = 0

    for (const entry of placeEntries) {
      if (entry.personIds.length <= 1) continue

      // Przyjmujemy, że wszyscy w tej komórce są w konflikcie
      for (const pid of entry.personIds) {
        const prev = conflictsPerPerson.get(pid) ?? 0
        conflictsPerPerson.set(pid, prev + 1)
        generalConflictsRaw += 1
      }
    }

    let frequentScoreRaw = 0
    for (const [pid, c] of conflictsPerPerson) {
      const f = normFreq.get(pid) ?? 0
      frequentScoreRaw += f * c
    }

    const generalConflictsScore = generalConflictsRaw * wGeneral
    const frequentVisitorsScore = frequentScoreRaw * wFreq

    const totalScore =
      teamSeparationScore + generalConflictsScore + frequentVisitorsScore

    scores.push({
      placeId,
      teamSeparationScore,
      frequentVisitorsScore,
      generalConflictsScore,
      totalScore,
    })
  }

  return scores
}

export function generateParkingPlan(
  persons: Person[],
  places: ParkingPlaceConfig[],
  options: PlannerOptions = {},
): ParkingPlan {
  const weeks = options.weeks ?? 4

  if (persons.length === 0 || places.length === 0) {
    return { entries: [], weeks }
  }

  const groups = assignPersonsToPlaces(persons, places)

  const allEntries: ParkingPlanDayEntry[] = []

  for (const group of groups) {
    const groupEntries = assignPersonsToDaysForGroup(
      group.personIds,
      persons,
      group.placeId,
      weeks,
    )
    allEntries.push(...groupEntries)
  }

  const dummyWeights: ObjectiveWeights = options.objectiveWeights ?? {
    teamSeparation: 0,
    frequentVisitors: 0,
    generalConflicts: 0,
  }

  const basePlan: ParkingPlan = {
    entries: allEntries,
    weeks,
    placeScores: [],
  }

  const placeScores = computePlaceScores(basePlan, persons, places, dummyWeights)

  return {
    ...basePlan,
    placeScores,
  }
}

/**
 * Przelicza plan po zmianie przypisań grup.
 * Aktualizuje wpisy dla zmienionych grup i przelicza wagi.
 */
export function updatePlanAfterGroupChange(
  plan: ParkingPlan,
  persons: Person[],
  places: ParkingPlaceConfig[],
  weights: ObjectiveWeights,
  groupAssignments: GroupAssignment[],
): ParkingPlan {
  // Usuń stare wpisy dla wszystkich grup
  const updatedEntries: ParkingPlanDayEntry[] = []

  // Dla każdej grupy przypisz osoby do dni
  for (const group of groupAssignments) {
    const groupEntries = assignPersonsToDaysForGroup(
      group.personIds,
      persons,
      group.placeId,
      plan.weeks,
    )
    updatedEntries.push(...groupEntries)
  }

  const updatedPlan: ParkingPlan = {
    ...plan,
    entries: updatedEntries,
    placeScores: [],
  }

  const placeScores = computePlaceScores(updatedPlan, persons, places, weights)

  return {
    ...updatedPlan,
    placeScores,
  }
}

/**
 * Oblicza całkowitą sumę wag dla wszystkich grup (cel: minimalizacja, idealnie 0).
 */
export function calculateTotalScore(plan: ParkingPlan): number {
  return plan.placeScores.reduce((sum, score) => sum + score.totalScore, 0)
}

/**
 * Losowo przesuwa osobę z jednej grupy do innej (jeśli jest miejsce).
 * Zwraca nowe przypisania grup lub null jeśli nie można wykonać zmiany.
 */
export function randomlyMovePerson(
  groupAssignments: GroupAssignment[],
  places: ParkingPlaceConfig[],
): GroupAssignment[] | null {
  if (groupAssignments.length === 0) return null

  // Znajdź wszystkie osoby
  const allPersonIds = new Set<string>()
  for (const group of groupAssignments) {
    for (const pid of group.personIds) {
      allPersonIds.add(pid)
    }
  }

  if (allPersonIds.size === 0) return null

  // Losowo wybierz osobę
  const personIdsArray = Array.from(allPersonIds)
  const randomPersonId =
    personIdsArray[Math.floor(Math.random() * personIdsArray.length)]

  // Znajdź grupę źródłową
  const sourceGroupIndex = groupAssignments.findIndex((g) =>
    g.personIds.includes(randomPersonId),
  )
  if (sourceGroupIndex === -1) return null

  // Losowo wybierz grupę docelową (różną od źródłowej)
  const availableTargetIndices = groupAssignments
    .map((_, idx) => idx)
    .filter((idx) => idx !== sourceGroupIndex)

  if (availableTargetIndices.length === 0) return null

  const targetIndex =
    availableTargetIndices[
      Math.floor(Math.random() * availableTargetIndices.length)
    ]

  const targetPlace = places.find(
    (p) => p.id === groupAssignments[targetIndex].placeId,
  )
  if (!targetPlace) return null

  // Sprawdź czy jest miejsce w grupie docelowej
  const targetGroup = groupAssignments[targetIndex]
  if (targetGroup.personIds.length >= targetPlace.maxPersons) {
    return null // Brak miejsca
  }

  // Wykonaj przesunięcie
  const updatedAssignments = groupAssignments.map((group, idx) => {
    if (idx === sourceGroupIndex) {
      return {
        ...group,
        personIds: group.personIds.filter((id) => id !== randomPersonId),
      }
    }
    if (idx === targetIndex) {
      return {
        ...group,
        personIds: [...group.personIds, randomPersonId],
      }
    }
    return group
  })

  return updatedAssignments
}

/**
 * Wykonuje jedną iterację symulowanego wyżarzania:
 * losowo przesuwa osobę i zwraca nowy plan (jeśli zmiana jest możliwa).
 */
export function performSimulatedAnnealingIteration(
  currentPlan: ParkingPlan,
  currentAssignments: GroupAssignment[],
  persons: Person[],
  places: ParkingPlaceConfig[],
  weights: ObjectiveWeights,
): {
  newPlan: ParkingPlan
  newAssignments: GroupAssignment[]
  totalScore: number
} | null {
  const newAssignments = randomlyMovePerson(currentAssignments, places)
  if (!newAssignments) return null

  const newPlan = updatePlanAfterGroupChange(
    currentPlan,
    persons,
    places,
    weights,
    newAssignments,
  )

  const totalScore = calculateTotalScore(newPlan)

  return {
    newPlan,
    newAssignments,
    totalScore,
  }
}

