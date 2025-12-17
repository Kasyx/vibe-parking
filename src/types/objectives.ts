export interface ObjectiveWeights {
  /**
   * Waga karania za łączenie osób z tego samego zespołu
   * w jednej grupie parkingowej (0–100).
   */
  teamSeparation: number

  /**
   * Waga priorytetyzowania osób często przyjeżdżających,
   * tak aby miały jak najmniej konfliktów (0–100).
   */
  frequentVisitors: number

  /**
   * Waga „zwykłych” konfliktów (dla osób, które nie są priorytetem)
   * – ogólne dążenie do minimalizacji liczby odmów przydziału (0–100).
   */
  generalConflicts: number
}

/**
 * Domyślne wagi – można je później nadpisać w UI.
 */
export const DEFAULT_OBJECTIVE_WEIGHTS: ObjectiveWeights = {
  teamSeparation: 90,
  frequentVisitors: 50,
  generalConflicts: 20,
}


