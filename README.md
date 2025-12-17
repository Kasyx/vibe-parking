# Planner miejsc parkingowych

Aplikacja webowa do planowania korzystania z miejsc parkingowych między wieloma osobami.

## 🌐 Aplikacja online

Aplikacja jest dostępna na GitHub Pages: **https://kasyx.github.io/vibe-parking/**

## Funkcje

- **Zarządzanie osobami**:
  - Dodawanie osób z polem „Imię i nazwisko”.
  - Przypisywanie wielu zespołów do osoby (lub brak zespołu).
  - Edycja istniejących osób.
  - Usuwanie osób z potwierdzeniem.
  - Import i eksport osób do pliku JSON.

- **Typy harmonogramów** (dla każdej osoby można zdefiniować wiele reguł):
  1. **Zawsze w wybrane dni tygodnia co X tygodni**  
     - wybór dni tygodnia (Pn–Pt),  
     - interwał powtarzania: co 1, 2, 3 lub 4 tygodnie.
  2. **Jeden z wybranych dni tygodnia co X tygodni**  
     - lista możliwych dni; algorytm później wybierze konkretny dzień,  
     - interwał powtarzania: co 1, 2, 3 lub 4 tygodnie.
  3. **X razy w miesiącu z wykluczeniem podanych dni tygodnia**  
     - liczba dni w miesiącu (1–31),  
     - lista dni tygodnia, które mają być wykluczone (np. weekendy).

- **Planowanie miejsc parkingowych**:
  - Automatyczne przypisanie osób do grup parkingowych.
  - Algorytm optymalizujący przypisania z uwzględnieniem:
    - Separacji zespołów (unikanie osób z tego samego zespołu w jednej grupie)
    - Priorytetyzacji częstych przyjazdów
    - Minimalizacji konfliktów
  - Ręczna edycja przypisań (drag & drop).
  - Optymalizacja za pomocą algorytmu symulowanego wyżarzania (1000 iteracji).

- **Zapisywanie danych**:
  - Lista osób i ich harmonogramów jest zapisywana w `localStorage`.
  - Dane zostają zachowane między odświeżeniami strony.

## Jak uruchomić lokalnie

Wymagania: Node.js (zalecane aktualne LTS) oraz npm.

```bash
npm install
npm run dev
```

Następnie otwórz adres wyświetlony w konsoli (domyślnie `http://localhost:5173`).

## Deployment na GitHub Pages

Aplikacja jest automatycznie deployowana na GitHub Pages przy każdym pushu do brancha `main`.

### Konfiguracja GitHub Pages

1. **Włącz GitHub Pages w ustawieniach repozytorium:**
   - Przejdź do Settings → Pages
   - W sekcji "Source" wybierz **"GitHub Actions"** (nie "Deploy from a branch")
   - Zapisz zmiany

2. **Wypchnij zmiany do repozytorium:**
   ```bash
   git add .
   git commit -m "Configure GitHub Pages"
   git push origin main
   ```

3. **Sprawdź status deploymentu:**
   - Przejdź do zakładki "Actions" w repozytorium
   - Workflow automatycznie zbuduje i wdroży aplikację
   - Aplikacja będzie dostępna pod: `https://kasyx.github.io/vibe-parking/`

Workflow znajduje się w `.github/workflows/deploy.yml`.

## Struktura projektu

- `src/types/` – definicje typów TypeScript (osoby, harmonogramy, zespoły, cele)
- `src/components/` – komponenty React (formularze, listy, tabele)
- `src/utils/` – logika biznesowa (planowanie, optymalizacja)
- `src/hooks/` – hooki React (localStorage)
- `dist/` – zbudowana wersja produkcyjna (gotowa do uruchomienia)
