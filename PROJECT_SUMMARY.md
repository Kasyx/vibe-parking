# Podsumowanie projektu: Planner miejsc parkingowych

## Opis projektu

Aplikacja webowa do planowania przydziału miejsc parkingowych między osoby. System pozwala na definiowanie harmonogramów parkowania dla każdej osoby i automatyczne przypisanie do miejsc parkingowych z uwzględnieniem różnych kryteriów optymalizacyjnych.

## Główne funkcjonalności

### 1. Zarządzanie osobami
- **Dodawanie/edycja osób** z imieniem i nazwiskiem
- **Przypisanie do zespołu** (lista zespołów: Guacamole, Hot Wings, Appetizers, Pumpkin, Old Monk, Piwo, DevOps & Platform)
- **Definiowanie harmonogramów** - każda osoba może mieć wiele harmonogramów różnych typów

### 2. Typy harmonogramów

Każda osoba może mieć przypisanych wiele harmonogramów (różnych typów):

#### Typ 1: ZAWSZE w wybrane dni tygodnia co X tygodni
- Wybór konkretnych dni tygodnia (Pn-Pt)
- Interwał: co 1, 2, 3 lub 4 tygodnie
- Przykład: "Zawsze w poniedziałek i środę, co tydzień"

#### Typ 2: Jeden z wybranych dni tygodnia co X tygodni
- Lista możliwych dni (algorytm wybierze konkretny dzień)
- Interwał: co 1, 2, 3 lub 4 tygodnie
- Przykład: "Jeden z dni: wtorek, czwartek, co 2 tygodnie"

#### Typ 3: X razy w miesiącu z wykluczeniem wybranych dni
- Liczba dni w miesiącu (1-31)
- Lista dni tygodnia do wykluczenia
- Przykład: "4 razy w miesiącu, wykluczone: poniedziałek, piątek"

### 3. Planowanie miejsc parkingowych

#### Algorytm przypisania
1. **Losowy przydział osób do grup** (miejsc parkingowych) z limitem max 4 osoby na miejsce
2. **Przypisanie do konkretnych dni** (4 tygodnie, poniedziałek-piątek) według priorytetów:
   - Najpierw: osoby z harmonogramem "ZAWSZE" (typ 1)
   - Potem: osoby z "jeden z wybranych dni" (typ 2) - preferowane wolne sloty
   - Na końcu: osoby z "X razy w miesiącu" (typ 3) - preferowane wolne sloty

#### Wizualizacja planu
- Tabela z miejscami parkingowymi (wiersze) i dniami (kolumny)
- **Kolorowanie komórek:**
  - 🟢 Zielony - brak konfliktu (1 osoba)
  - 🔴 Czerwony - konflikt (2+ osoby)
  - ⚪ Szary - brak przypisanej osoby

### 4. Drag & Drop - reorganizacja grup

- Możliwość przenoszenia osób między grupami parkingowymi
- Po przeniesieniu automatyczne:
  - Przypisanie do dni zgodnie z harmonogramami
  - Przeliczenie wag dla wszystkich grup

### 5. System wag i ocen

Dla każdej grupy parkingowej obliczane są wagi (0-100, konfigurowalne):

1. **Skład zespołowy** (`teamSeparation`)
   - Kara za łączenie osób z tego samego zespołu w jednej grupie
   - Im więcej osób z jednego teamu w grupie, tym wyższa kara
   - Domyślna waga: 90

2. **Priorytet częstych przyjazdów** (`frequentVisitors`)
   - Priorytetyzacja osób często przyjeżdżających
   - Osoby z większą częstotliwością mają wyższy priorytet przy minimalizacji konfliktów
   - Domyślna waga: 50

3. **Zwykłe konflikty** (`generalConflicts`)
   - Ogólna minimalizacja liczby konfliktów (gdy w jednym dniu jest >1 osoba)
   - Domyślna waga: 20

**Suma wag** pokazuje całkowitą ocenę danej grupy (im niższa, tym lepiej).

## Struktura projektu

### Komponenty React (`src/components/`)

- **`PersonForm.tsx`** - Formularz dodawania/edycji osoby z wyborem harmonogramów
- **`PersonList.tsx`** - Lista osób z możliwością edycji i usuwania
- **`ParkingPlanTable.tsx`** - Tabela wizualizacji planu miejsc parkingowych
- **`GroupAssignmentEditor.tsx`** - Edytor przypisań grup z drag & drop

### Typy i modele danych (`src/types/`)

- **`person.ts`** - Interfejs `Person` (id, fullName, teamId, scheduleRules[])
- **`schedule.ts`** - Typy harmonogramów:
  - `Weekday` enum (Monday-Friday)
  - `ScheduleRuleType` (ALWAYS_ON_DAYS, ONE_OF_DAYS, X_TIMES_PER_MONTH)
  - `AlwaysOnDaysRule`, `OneOfDaysRule`, `XTimesPerMonthRule`
- **`team.ts`** - Lista zespołów (`TEAMS` array)
- **`objectives.ts`** - `ObjectiveWeights` (teamSeparation, frequentVisitors, generalConflicts)

### Logika biznesowa (`src/utils/`)

- **`planner.ts`** - Główna logika planowania:
  - `generateParkingPlan()` - generuje pełny plan
  - `assignPersonsToDaysForGroup()` - przypisuje osoby do dni dla jednej grupy
  - `updatePlanAfterGroupChange()` - aktualizuje plan po zmianie grup
  - `computePlaceScores()` - oblicza wagi dla grup
  - `estimatePersonFrequency()` - szacuje częstotliwość przyjazdów osoby

### Hooks (`src/hooks/`)

- **`useLocalStorage.ts`** - Hook do zapisywania/odczytywania danych z LocalStorage

### Główny plik aplikacji

- **`App.tsx`** - Główny komponent aplikacji, zarządza stanem i logiką UI

## Kluczowe algorytmy

### 1. Przypisanie osób do grup
- Losowe tasowanie osób
- Round-robin przydział do miejsc z limitem `maxPersons` (domyślnie 4)

### 2. Przypisanie do dni (dla grupy)
1. **ALWAYS_ON_DAYS**: Dla każdego tygodnia zgodnego z interwałem, dodaj osobę do wybranych dni
2. **ONE_OF_DAYS**: Dla każdego tygodnia zgodnego z interwałem:
   - Najpierw szukaj wolnych slotów w możliwych dniach
   - Jeśli brak wolnych, wybierz dzień z najmniejszym obłożeniem
3. **X_TIMES_PER_MONTH**: 
   - Najpierw wypełnij wolne sloty (z wykluczeniem wybranych dni)
   - Potem wypełnij sloty o najmniejszym obłożeniu

### 3. Obliczanie wag

**Skład zespołowy:**
- Dla każdej grupy: zlicz osoby po teamId
- Dla każdego teamu z >1 osobą: liczba par = n*(n-1)/2
- Waga = suma_par * (teamSeparation/100)

**Częste przyjazdy:**
- Dla każdej osoby: szacowana częstotliwość (na podstawie harmonogramów)
- Normalizacja do 0-1
- Dla każdej osoby z konfliktami: częstotliwość * liczba_konfliktów
- Waga = suma * (frequentVisitors/100)

**Zwykłe konflikty:**
- Dla każdej komórki z >1 osobą: liczba osób = konflikt
- Waga = suma_konfliktów * (generalConflicts/100)

## Konfiguracja

### Domyślne wartości
- Liczba miejsc parkingowych: **7**
- Max osób na miejsce: **4**
- Wagi:
  - Separacja zespołów: **90**
  - Priorytet częstych przyjazdów: **50**
  - Zwykłe konflikty: **20**

### Przechowywanie danych
- Dane osób zapisywane w **LocalStorage** pod kluczem `parkingPlanner.persons.v1`
- Automatyczne wczytywanie przy starcie aplikacji

## Technologie

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **CSS** (bez frameworka, własne style)
- **LocalStorage** (przechowywanie danych)

## Uruchomienie

```bash
npm install
npm run dev
```

Aplikacja dostępna pod `http://localhost:5173`

## Przepływ pracy użytkownika

1. **Dodaj osoby** - wypełnij formularz z imieniem, zespołem i harmonogramami
2. **Skonfiguruj planowanie** - ustaw liczbę miejsc, max osób, wagi
3. **Wygeneruj plan** - kliknij "Wygeneruj plan"
4. **Zobacz wyniki:**
   - Tabela z przypisaniami (kolorowe komórki)
   - Tabela z wagami dla każdej grupy
5. **Dostosuj ręcznie** - użyj drag & drop do przenoszenia osób między grupami
6. **Automatyczna aktualizacja** - po przeniesieniu osoby, plan i wagi przeliczają się automatycznie

## Możliwe rozszerzenia

1. **Algorytm optymalizacyjny** - symulowane wyżarzanie do automatycznego znajdowania lepszych rozwiązań
2. **Eksport/Import** - zapisywanie planów do pliku
3. **Historia zmian** - cofanie/przywracanie zmian
4. **Filtrowanie i sortowanie** - w tabeli planu
5. **Statystyki** - szczegółowe raporty o konfliktach, wykorzystaniu miejsc itp.
6. **Backend** - przechowywanie danych na serwerze zamiast LocalStorage
7. **Wielu użytkowników** - system logowania i współdzielonych planów

## Ważne uwagi

- **Dni tygodnia**: Tylko poniedziałek-piątek (bez weekendów)
- **Planowanie**: Zawsze 4 tygodnie do przodu
- **Limity**: Max 4 osoby na miejsce (konfigurowalne)
- **Konflikty**: Wizualizowane kolorem czerwonym, ale nie blokują przypisania

## Pliki konfiguracyjne

- `package.json` - zależności projektu
- `tsconfig.json` - konfiguracja TypeScript
- `vite.config.ts` - konfiguracja Vite
- `eslint.config.js` - konfiguracja ESLint

## Status projektu

✅ **Zaimplementowane:**
- Formularz osób z harmonogramami
- Przypisanie do zespołów
- Algorytm planowania miejsc
- Wizualizacja planu
- Drag & drop między grupami
- System wag i ocen
- LocalStorage

⏳ **Do zrobienia:**
- Symulowane wyżarzanie (algorytm optymalizacyjny)
- Eksport/Import planów
- Zaawansowane statystyki

