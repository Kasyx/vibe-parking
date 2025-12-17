## Planner miejsc parkingowych

Aplikacja webowa do planowania korzystania z miejsc parkingowych między wieloma osobami.
Na tym etapie pozwala zdefiniować użytkowników oraz ich preferencje parkowania,
z zapisem danych lokalnie w przeglądarce.

### Funkcje (aktualna wersja)

- **Zarządzanie osobami**:
  - Dodawanie osób z polem „Imię i nazwisko”.
  - Edycja istniejących osób.
  - Usuwanie osób z potwierdzeniem.

- **Typy harmonogramów** (dla każdej osoby można zdefiniować jedną regułę):
  1. **Zawsze w wybrane dni tygodnia co X tygodni**  
     - wybór dni tygodnia (Pn–Nd),  
     - interwał powtarzania: co 1, 2, 3 lub 4 tygodnie.
  2. **Jeden z wybranych dni tygodnia co X tygodni**  
     - lista możliwych dni; algorytm później wybierze konkretny dzień,  
     - interwał powtarzania: co 1, 2, 3 lub 4 tygodnie.
  3. **X razy w miesiącu z wykluczeniem podanych dni tygodnia**  
     - liczba dni w miesiącu (1–31),  
     - lista dni tygodnia, które mają być wykluczone (np. weekendy).

- **Zapisywanie danych**:
  - Lista osób i ich harmonogramów jest zapisywana w `localStorage`
    pod kluczem `parkingPlanner.persons.v1`.
  - Dane zostają zachowane między odświeżeniami strony.

- **UI**:
  - Nowoczesny, responsywny layout w dwóch kolumnach (formularz + lista osób).
  - Czytelne komunikaty walidacji po polsku.

- **Moduł planowania (placeholder)**:
  - Funkcja `generateParkingPlan` w `src/utils/planner.ts` przyjmuje listę osób
    oraz konfigurację miejsc parkingowych i na razie zwraca pusty plan.
  - W interfejsie jest sekcja „Planowanie miejsc (w przygotowaniu)” z przyciskiem,
    który informuje, że algorytm zostanie dodany w kolejnym etapie.

### Jak uruchomić projekt

Wymagania: Node.js (zalecane aktualne LTS) oraz npm.

```bash
cd /Users/lmudlaff/Documents/vibe-parking
npm install
npm run dev
```

Następnie otwórz adres wyświetlony w konsoli (domyślnie `http://localhost:5173`).

### Struktura ważniejszych plików

- `src/types/schedule.ts` – typy dni tygodnia i trzech rodzajów harmonogramów.
- `src/types/person.ts` – model `Person`.
- `src/components/PersonForm.tsx` – formularz dodawania/edycji osoby + walidacja.
- `src/components/PersonList.tsx` – lista osób z podglądem harmonogramu.
- `src/hooks/useLocalStorage.ts` – hook do zapisu/odczytu w `localStorage`.
- `src/utils/planner.ts` – placeholder pod przyszły algorytm planowania.
- `src/App.tsx` – główna strona z layoutem, formularzem, listą i sekcją planowania.

### Kolejne kroki

- Zaprojektowanie i implementacja algorytmu planowania (np. symulowane wyżarzanie),
  który będzie respektować m.in.:
  - maks. 4 osoby przypisane do jednego miejsca,
  - w danym dniu tylko jedna osoba korzysta z danego miejsca,
  - preferencje zdefiniowane w harmonogramach.
