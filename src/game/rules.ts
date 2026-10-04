import { CellState, LineStatus, AdjacencyViolation, ValidationResult } from '../types/game';

/**
 * Validates the current state of a LUMINA board against all rules:
 * 1. Target Sums: The sum of all LUMEN cells in every row/column must equal the target.
 * 2. Uniqueness: No two LUMEN cells in the same row/column may have the same number.
 * 3. Shadow Barrier: No two ECLIPSE cells may touch orthogonally.
 */
export function validateBoard(
  grid: number[][],
  states: CellState[][],
  rowTargets: number[],
  colTargets: number[]
): ValidationResult {
  const size = grid.length;
  const rowStatuses: LineStatus[] = [];
  const colStatuses: LineStatus[] = [];
  const adjacencyViolations: AdjacencyViolation[] = [];

  let allCellsDecided = true;

  // Validate Rows
  for (let r = 0; r < size; r++) {
    let sum = 0;
    const seenValues = new Map<number, number>();
    const duplicateValues: number[] = [];
    let lineDecided = true;

    for (let c = 0; c < size; c++) {
      const state = states[r][c];
      const val = grid[r][c];

      if (state === 'empty' || state === 'marked') {
        lineDecided = false;
        allCellsDecided = false;
      } else if (state === 'lumen') {
        sum += val;
        const count = (seenValues.get(val) || 0) + 1;
        seenValues.set(val, count);
        if (count === 2) {
          duplicateValues.push(val);
        }
      }
    }

    const target = rowTargets[r];
    const hasDuplicates = duplicateValues.length > 0;
    const isExceeded = sum > target;
    const isSumMet = sum === target && !hasDuplicates;
    const isSatisfied = isSumMet && lineDecided;

    rowStatuses.push({
      index: r,
      currentSum: sum,
      targetSum: target,
      isSumMet,
      isComplete: lineDecided,
      isSatisfied,
      isExceeded,
      hasDuplicates,
      duplicateValues,
    });
  }

  // Validate Columns
  for (let c = 0; c < size; c++) {
    let sum = 0;
    const seenValues = new Map<number, number>();
    const duplicateValues: number[] = [];
    let lineDecided = true;

    for (let r = 0; r < size; r++) {
      const state = states[r][c];
      const val = grid[r][c];

      if (state === 'empty' || state === 'marked') {
        lineDecided = false;
      } else if (state === 'lumen') {
        sum += val;
        const count = (seenValues.get(val) || 0) + 1;
        seenValues.set(val, count);
        if (count === 2) {
          duplicateValues.push(val);
        }
      }
    }

    const target = colTargets[c];
    const hasDuplicates = duplicateValues.length > 0;
    const isExceeded = sum > target;
    const isSumMet = sum === target && !hasDuplicates;
    const isSatisfied = isSumMet && lineDecided;

    colStatuses.push({
      index: c,
      currentSum: sum,
      targetSum: target,
      isSumMet,
      isComplete: lineDecided,
      isSatisfied,
      isExceeded,
      hasDuplicates,
      duplicateValues,
    });
  }

  // Check Orthogonal Adjacency of ECLIPSE cells
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (states[r][c] === 'eclipse') {
        // Check right
        if (c + 1 < size && states[r][c + 1] === 'eclipse') {
          adjacencyViolations.push({
            cellA: [r, c],
            cellB: [r, c + 1],
          });
        }
        // Check down
        if (r + 1 < size && states[r + 1][c] === 'eclipse') {
          adjacencyViolations.push({
            cellA: [r, c],
            cellB: [r + 1, c],
          });
        }
      }
    }
  }

  const allRowsSatisfied = rowStatuses.every((s) => s.isSatisfied);
  const allColsSatisfied = colStatuses.every((s) => s.isSatisfied);
  const allSumsMet = rowStatuses.every((s) => s.isSumMet) && colStatuses.every((s) => s.isSumMet);
  const hasNoAdjacencyViolations = adjacencyViolations.length === 0;

  const isSolved = allCellsDecided && allRowsSatisfied && allColsSatisfied && hasNoAdjacencyViolations;
  const hasAnyViolation =
    adjacencyViolations.length > 0 ||
    rowStatuses.some((s) => s.isExceeded || s.hasDuplicates) ||
    colStatuses.some((s) => s.isExceeded || s.hasDuplicates);

  return {
    isSolved,
    allSumsMet,
    rowStatuses,
    colStatuses,
    adjacencyViolations,
    hasAnyViolation,
    allCellsDecided,
  };
}
