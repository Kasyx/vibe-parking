import { useEffect, useState } from 'react'
import { type Person } from '../types/person'
import {
  type ScheduleRuleType,
  type ScheduleRule,
  type AlwaysOnDaysRule,
  type OneOfDaysRule,
  type XTimesPerMonthRule,
  Weekday,
  WEEKDAY_LABELS_PL,
} from '../types/schedule'
import { TEAMS } from '../types/team'

export interface PersonFormValues {
  fullName: string
  teamIds: string[]
  ruleType: ScheduleRuleType
  alwaysOnDays: Weekday[]
  alwaysOnWeekInterval: 1 | 2 | 3 | 4
  oneOfDays: Weekday[]
  oneOfWeekInterval: 1 | 2 | 3 | 4
  timesPerMonth: number
  excludedDays: Weekday[]
}

const DEFAULT_VALUES: PersonFormValues = {
  fullName: '',
  teamIds: [],
  ruleType: 'ALWAYS_ON_DAYS',
  alwaysOnDays: [],
  alwaysOnWeekInterval: 1,
  oneOfDays: [],
  oneOfWeekInterval: 1,
  timesPerMonth: 4,
  excludedDays: [],
}

export interface PersonFormProps {
  onSubmit: (person: Omit<Person, 'id'>, originalId?: string) => void
  editingPerson: Person | null
  onCancelEdit: () => void
}

interface ValidationErrors {
  fullName?: string
  schedule?: string
}

const WEEK_INTERVAL_OPTIONS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4]

function createRuleFromValues(values: PersonFormValues): ScheduleRule {
  const baseId = crypto.randomUUID()

  if (values.ruleType === 'ALWAYS_ON_DAYS') {
    const rule: AlwaysOnDaysRule = {
      id: baseId,
      type: 'ALWAYS_ON_DAYS',
      days: values.alwaysOnDays,
      weekInterval: values.alwaysOnWeekInterval,
    }
    return rule
  }

  if (values.ruleType === 'ONE_OF_DAYS') {
    const rule: OneOfDaysRule = {
      id: baseId,
      type: 'ONE_OF_DAYS',
      possibleDays: values.oneOfDays,
      weekInterval: values.oneOfWeekInterval,
    }
    return rule
  }

  const rule: XTimesPerMonthRule = {
    id: baseId,
    type: 'X_TIMES_PER_MONTH',
    timesPerMonth: values.timesPerMonth,
    excludedDays: values.excludedDays,
  }
  return rule
}

function mapPersonToFormValues(person: Person): PersonFormValues {
  // Przy edycji osoby nie wczytujemy konkretnej reguły do formularza tworzenia nowej,
  // tylko ustawiamy imię i nazwisko, a istniejące reguły trafiają do osobnego stanu.
  // Obsługa migracji: jeśli teamIds nie istnieje, sprawdź teamId
  let teamIds: string[] = []
  if ('teamIds' in person && Array.isArray(person.teamIds)) {
    teamIds = person.teamIds
  } else if ('teamId' in person) {
    const oldPerson = person as unknown as { teamId?: string | null }
    teamIds = oldPerson.teamId && oldPerson.teamId !== null ? [oldPerson.teamId] : []
  }
  
  return {
    ...DEFAULT_VALUES,
    fullName: person.fullName,
    teamIds,
  }
}

function validatePersonName(fullName: string): string | undefined {
  if (!fullName.trim()) {
    return 'Imię i nazwisko jest wymagane.'
  }
  if (fullName.trim().length < 3) {
    return 'Imię i nazwisko jest za krótkie.'
  }
  return undefined
}

function validateRule(values: PersonFormValues): string | undefined {
  if (values.ruleType === 'ALWAYS_ON_DAYS') {
    if (values.alwaysOnDays.length === 0) {
      return 'Wybierz przynajmniej jeden dzień tygodnia.'
    }
  } else if (values.ruleType === 'ONE_OF_DAYS') {
    if (values.oneOfDays.length === 0) {
      return 'Wybierz przynajmniej jeden możliwy dzień tygodnia.'
    }
  } else if (values.ruleType === 'X_TIMES_PER_MONTH') {
    if (!Number.isFinite(values.timesPerMonth)) {
      return 'Podaj poprawną liczbę dni w miesiącu.'
    }
    if (values.timesPerMonth < 1 || values.timesPerMonth > 31) {
      return 'Liczba dni w miesiącu musi być w zakresie 1–31.'
    }
  }
  return undefined
}

function describeRuleForList(rule: ScheduleRule): string {
  switch (rule.type) {
    case 'ALWAYS_ON_DAYS': {
      const r = rule as AlwaysOnDaysRule
      const days = r.days.map((d) => WEEKDAY_LABELS_PL[d]).join(', ')
      return `Zawsze: ${days} (co ${r.weekInterval} tyg.)`
    }
    case 'ONE_OF_DAYS': {
      const r = rule as OneOfDaysRule
      const days = r.possibleDays.map((d) => WEEKDAY_LABELS_PL[d]).join(', ')
      return `Jeden z: ${days} (co ${r.weekInterval} tyg.)`
    }
    case 'X_TIMES_PER_MONTH': {
      const r = rule as XTimesPerMonthRule
      const excluded =
        r.excludedDays.length > 0
          ? r.excludedDays.map((d) => WEEKDAY_LABELS_PL[d]).join(', ')
          : 'brak'
      return `${r.timesPerMonth} razy/mies., wykluczone: ${excluded}`
    }
    default:
      return 'Harmonogram'
  }
}

function validate(values: PersonFormValues, rulesCount: number): ValidationErrors {
  const errors: ValidationErrors = {}

  const fullNameError = validatePersonName(values.fullName)
  if (fullNameError) {
    errors.fullName = fullNameError
  }

  if (rulesCount === 0) {
    errors.schedule = errors.schedule
      ? errors.schedule
      : 'Dodaj przynajmniej jeden harmonogram dla tej osoby.'
  }

  return errors
}

export function PersonForm({
  onSubmit,
  editingPerson,
  onCancelEdit,
}: PersonFormProps) {
  const [values, setValues] = useState<PersonFormValues>(DEFAULT_VALUES)
  const [rules, setRules] = useState<ScheduleRule[]>([])
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    if (editingPerson) {
      setValues(mapPersonToFormValues(editingPerson))
      setRules(editingPerson.scheduleRules ?? [])
      setErrors({})
    } else {
      setValues(DEFAULT_VALUES)
      setRules([])
      setErrors({})
    }
  }, [editingPerson])

  const handleChange =
    (field: keyof PersonFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = event.target

      setValues((prev) => {
        if (
          field === 'alwaysOnWeekInterval' ||
          field === 'oneOfWeekInterval'
        ) {
          return {
            ...prev,
            [field]: Number(value) as 1 | 2 | 3 | 4,
          }
        }
        if (field === 'timesPerMonth') {
          return {
            ...prev,
            [field]: Number(value) || 0,
          }
        }
        if (field === 'ruleType') {
          return {
            ...prev,
            ruleType: value as ScheduleRuleType,
          }
        }
        return {
          ...prev,
          [field]: value,
        }
      })
    }

  const toggleWeekdayArray =
    (field: 'alwaysOnDays' | 'oneOfDays' | 'excludedDays', day: Weekday) =>
    () => {
      setValues((prev) => {
        const current = prev[field]
        const exists = current.includes(day)
        const next = exists
          ? current.filter((d) => d !== day)
          : [...current, day]
        return {
          ...prev,
          [field]: next,
        }
      })
    }

  const handleAddRule = () => {
    const scheduleError = validateRule(values)
    if (scheduleError) {
      setErrors((prev) => ({ ...prev, schedule: scheduleError }))
      return
    }

    const rule = createRuleFromValues(values)
    setRules((prev) => [...prev, rule])
    setErrors((prev) => ({ ...prev, schedule: undefined }))

    // Po dodaniu reguły czyścimy pola specyficzne dla danego typu
    setValues((prev) => ({
      ...prev,
      alwaysOnDays: [],
      oneOfDays: [],
      excludedDays: [],
    }))
  }

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const validationErrors = validate(values, rules.length)
    setErrors(validationErrors)
    if (validationErrors.fullName || validationErrors.schedule) return

    const payload: Omit<Person, 'id'> = {
      fullName: values.fullName.trim(),
      teamIds: values.teamIds,
      scheduleRules: rules,
    }
    onSubmit(payload, editingPerson?.id)

    if (!editingPerson) {
      setValues(DEFAULT_VALUES)
      setRules([])
    }
  }

  return (
    <section className="card">
      <h2>{editingPerson ? 'Edytuj osobę' : 'Dodaj osobę'}</h2>
      <form onSubmit={handleSubmit} className="person-form">
        <div className="form-row">
          <label htmlFor="fullName">
            Imię i nazwisko
            <input
              id="fullName"
              type="text"
              value={values.fullName}
              onChange={handleChange('fullName')}
              placeholder="Np. Jan Kowalski"
            />
          </label>
          {errors.fullName && (
            <div className="error-text">{errors.fullName}</div>
          )}
        </div>

        <div className="form-row">
          <div className="inline-group">
            <span className="field-label">Zespoły (można wybrać wiele)</span>
            <div className="team-checkboxes">
              {TEAMS.map((team) => (
                <label key={team.id} className="team-checkbox">
                  <input
                    type="checkbox"
                    checked={values.teamIds.includes(team.id)}
                    onChange={(e) => {
                      setValues((prev) => {
                        const current = prev.teamIds
                        if (e.target.checked) {
                          return {
                            ...prev,
                            teamIds: [...current, team.id],
                          }
                        } else {
                          return {
                            ...prev,
                            teamIds: current.filter((id) => id !== team.id),
                          }
                        }
                      })
                    }}
                  />
                  {team.name}
                </label>
              ))}
            </div>
            {values.teamIds.length === 0 && (
              <p className="hint-text">
                Osoba może nie mieć przypisanego żadnego zespołu
              </p>
            )}
          </div>
        </div>

        <fieldset className="form-row">
          <legend>Typ harmonogramu</legend>
          <label>
            <input
              type="radio"
              name="ruleType"
              value="ALWAYS_ON_DAYS"
              checked={values.ruleType === 'ALWAYS_ON_DAYS'}
              onChange={handleChange('ruleType')}
            />
            ZAWSZE w wybrane dni tygodnia co X tygodni
          </label>
          <label>
            <input
              type="radio"
              name="ruleType"
              value="ONE_OF_DAYS"
              checked={values.ruleType === 'ONE_OF_DAYS'}
              onChange={handleChange('ruleType')}
            />
            Jeden z wybranych dni tygodnia co X tygodni
          </label>
          <label>
            <input
              type="radio"
              name="ruleType"
              value="X_TIMES_PER_MONTH"
              checked={values.ruleType === 'X_TIMES_PER_MONTH'}
              onChange={handleChange('ruleType')}
            />
            X razy w miesiącu z wykluczeniem wybranych dni tygodnia
          </label>
        </fieldset>

        {values.ruleType === 'ALWAYS_ON_DAYS' && (
          <div className="form-row">
            <div className="inline-group">
              <span className="field-label">
                Dni tygodnia (zawsze w te dni)
              </span>
              <div className="weekday-grid">
                {Object.values(Weekday).map((day) => (
                  <label key={day} className="weekday-pill">
                    <input
                      type="checkbox"
                      checked={values.alwaysOnDays.includes(day)}
                      onChange={toggleWeekdayArray('alwaysOnDays', day)}
                    />
                    {WEEKDAY_LABELS_PL[day]}
                  </label>
                ))}
              </div>
            </div>
            <label className="inline-group">
              Co ile tygodni?
              <select
                value={values.alwaysOnWeekInterval}
                onChange={handleChange('alwaysOnWeekInterval')}
              >
                {WEEK_INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    co {opt} tygodni
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {values.ruleType === 'ONE_OF_DAYS' && (
          <div className="form-row">
            <div className="inline-group">
              <span className="field-label">
                Lista możliwych dni (algorytm wybierze konkretny dzień)
              </span>
              <div className="weekday-grid">
                {Object.values(Weekday).map((day) => (
                  <label key={day} className="weekday-pill">
                    <input
                      type="checkbox"
                      checked={values.oneOfDays.includes(day)}
                      onChange={toggleWeekdayArray('oneOfDays', day)}
                    />
                    {WEEKDAY_LABELS_PL[day]}
                  </label>
                ))}
              </div>
            </div>
            <label className="inline-group">
              Co ile tygodni?
              <select
                value={values.oneOfWeekInterval}
                onChange={handleChange('oneOfWeekInterval')}
              >
                {WEEK_INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    co {opt} tygodni
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {values.ruleType === 'X_TIMES_PER_MONTH' && (
          <div className="form-row">
            <label className="inline-group">
              Ile razy w miesiącu?
              <input
                type="number"
                min={1}
                max={31}
                value={values.timesPerMonth}
                onChange={handleChange('timesPerMonth')}
              />
            </label>
            <div className="inline-group">
              <span className="field-label">
                Wykluczone dni tygodnia (np. weekendy)
              </span>
              <div className="weekday-grid">
                {Object.values(Weekday).map((day) => (
                  <label key={day} className="weekday-pill">
                    <input
                      type="checkbox"
                      checked={values.excludedDays.includes(day)}
                      onChange={toggleWeekdayArray('excludedDays', day)}
                    />
                    {WEEKDAY_LABELS_PL[day]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={handleAddRule}>
            Dodaj harmonogram do listy
          </button>
        </div>

        {errors.schedule && (
          <div className="error-text">{errors.schedule}</div>
        )}

        <div className="form-row">
          <span className="field-label">Dodane harmonogramy tej osoby</span>
          {rules.length === 0 ? (
            <p>Brak dodanych harmonogramów. Dodaj przynajmniej jeden.</p>
          ) : (
            <ul className="rules-list">
              {rules.map((rule) => (
                <li key={rule.id} className="rules-list-item">
                  <span>{describeRuleForList(rule)}</span>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleRemoveRule(rule.id)}
                  >
                    Usuń
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary">
            {editingPerson ? 'Zapisz zmiany' : 'Dodaj osobę'}
          </button>
          <button
            type="button"
            onClick={() => {
              setValues(DEFAULT_VALUES)
              setErrors({})
              onCancelEdit()
            }}
          >
            Wyczyść formularz
          </button>
        </div>
      </form>
    </section>
  )
}


