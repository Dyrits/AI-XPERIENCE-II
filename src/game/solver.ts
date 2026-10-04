import { CellState } from '../types/game';

export interface Hint {
  row: number;
  col: number;
  suggestedState: 'lumen' | 'eclipse';
  reason: string;
  technique: 'target_met' | 'no_adjacent_shadow' | 'duplicate_prevention' | 'sum_exhaustion' | 'lookahead';
}

/**
 * Finds all solutions to a LUMINA puzzle up to maxSolutions.
 */
export function solvePuzzle(
  grid: number[][],
  rowTargets: number[],
  colTargets: number[],
  maxSolutions: number = 2
): ('lumen' | 'eclipse')[][][] {
  const size = grid.length;
  const solutions: ('lumen' | 'eclipse')[][][] = [];

  // 1 = lumen, 0 = eclipse, -1 = unassigned
  const board: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  const rowSums = Array(size).fill(0);
  const colSums = Array(size).fill(0);
  const rowValues: Set<number>[] = Array.from({ length: size }, () => new Set());
  const colValues: Set<number>[] = Array.from({ length: size }, () => new Set());

  // Pre-calculate remaining maximum possible sums for quick pruning
  const rowRemainingMax = Array(size).fill(0);
  const colRemainingMax = Array(size).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      rowRemainingMax[r] += grid[r][c];
      colRemainingMax[c] += grid[r][c];
    }
  }

  function search(idx: number): boolean {
    if (solutions.length >= maxSolutions) return true;

    if (idx === size * size) {
      // Check if all row and col sums are exactly satisfied
      for (let i = 0; i < size; i++) {
        if (rowSums[i] !== rowTargets[i] || colSums[i] !== colTargets[i]) {
          return false;
        }
      }

      // Convert board to solution format
      const sol: ('lumen' | 'eclipse')[][] = board.map((row) =>
        row.map((val) => (val === 1 ? 'lumen' : 'eclipse'))
      );
      solutions.push(sol);
      return solutions.length >= maxSolutions;
    }

    const r = Math.floor(idx / size);
    const c = idx % size;
    const val = grid[r][c];

    // Branch order: Try 1 (Lumen) then 0 (Eclipse)
    // 1. Try Lumen
    const canBeLumen =
      rowSums[r] + val <= rowTargets[r] &&
      colSums[c] + val <= colTargets[c] &&
      !rowValues[r].has(val) &&
      !colValues[c].has(val);

    if (canBeLumen) {
      board[r][c] = 1;
      rowSums[r] += val;
      colSums[c] += val;
      rowValues[r].add(val);
      colValues[c].add(val);
      rowRemainingMax[r] -= val;
      colRemainingMax[c] -= val;

      // Check if remainder can still reach targets
      if (
        rowSums[r] + rowRemainingMax[r] >= rowTargets[r] &&
        colSums[c] + colRemainingMax[c] >= colTargets[c]
      ) {
        if (search(idx + 1)) return true;
      }

      // Backtrack
      board[r][c] = -1;
      rowSums[r] -= val;
      colSums[c] -= val;
      rowValues[r].delete(val);
      colValues[c].delete(val);
      rowRemainingMax[r] += val;
      colRemainingMax[c] += val;
    }

    // 2. Try Eclipse
    // Condition: No two adjacent Eclipse cells
    let canBeEclipse = true;
    if (r > 0 && board[r - 1][c] === 0) canBeEclipse = false;
    if (c > 0 && board[r][c - 1] === 0) canBeEclipse = false;

    // Prune if without this cell, row or col sum cannot reach target
    rowRemainingMax[r] -= val;
    colRemainingMax[c] -= val;
    if (
      rowSums[r] + rowRemainingMax[r] < rowTargets[r] ||
      colSums[c] + colRemainingMax[c] < colTargets[c]
    ) {
      canBeEclipse = false;
    }

    if (canBeEclipse) {
      board[r][c] = 0;
      if (search(idx + 1)) return true;
      board[r][c] = -1;
    }

    rowRemainingMax[r] += val;
    colRemainingMax[c] += val;

    return false;
  }

  search(0);
  return solutions;
}

/**
 * Generates an intelligent hint for the current board state.
 * Explains the human-deductive reason why a specific cell must be Lumen or Eclipse.
 */
export function getIntelligentHint(
  grid: number[][],
  currentStates: CellState[][],
  rowTargets: number[],
  colTargets: number[]
): Hint | null {
  const size = grid.length;

  // 1. Technique: Target sum already satisfied -> All other empty cells in row/col must be ECLIPSE
  for (let r = 0; r < size; r++) {
    let currentLumenSum = 0;
    const emptyCols: number[] = [];
    for (let c = 0; c < size; c++) {
      if (currentStates[r][c] === 'lumen') currentLumenSum += grid[r][c];
      else if (currentStates[r][c] === 'empty' || currentStates[r][c] === 'marked') {
        emptyCols.push(c);
      }
    }
    if (currentLumenSum === rowTargets[r] && emptyCols.length > 0) {
      const c = emptyCols[0];
      return {
        row: r,
        col: c,
        suggestedState: 'eclipse',
        reason: `Row ${r + 1} has already reached its target sum of ${rowTargets[r]}. Any other cells in this row must be Eclipse.`,
        technique: 'target_met',
      };
    }
  }

  for (let c = 0; c < size; c++) {
    let currentLumenSum = 0;
    const emptyRows: number[] = [];
    for (let r = 0; r < size; r++) {
      if (currentStates[r][c] === 'lumen') currentLumenSum += grid[r][c];
      else if (currentStates[r][c] === 'empty' || currentStates[r][c] === 'marked') {
        emptyRows.push(r);
      }
    }
    if (currentLumenSum === colTargets[c] && emptyRows.length > 0) {
      const r = emptyRows[0];
      return {
        row: r,
        col: c,
        suggestedState: 'eclipse',
        reason: `Column ${c + 1} has already reached its target sum of ${colTargets[c]}. Any other cells in this column must be Eclipse.`,
        technique: 'target_met',
      };
    }
  }

  // 2. Technique: No adjacent shadows -> Neighbor of an ECLIPSE cell must be LUMEN
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (currentStates[r][c] === 'empty' || currentStates[r][c] === 'marked') {
        // Check orthogonal neighbors
        const neighbors: [number, number][] = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (currentStates[nr][nc] === 'eclipse') {
              return {
                row: r,
                col: c,
                suggestedState: 'lumen',
                reason: `The neighbor at (${nr + 1}, ${nc + 1}) is an Eclipse. By the Shadow Barrier rule, no two Eclipse cells can touch, so this cell must be Lumen!`,
                technique: 'no_adjacent_shadow',
              };
            }
          }
        }
      }
    }
  }

  // 3. Technique: Duplicate prevention -> If making cell Lumen creates duplicate in row or col, it must be Eclipse
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (currentStates[r][c] === 'empty' || currentStates[r][c] === 'marked') {
        const val = grid[r][c];

        // Check if value already exists as Lumen in row
        let duplicateInRow = false;
        for (let otherC = 0; otherC < size; otherC++) {
          if (otherC !== c && currentStates[r][otherC] === 'lumen' && grid[r][otherC] === val) {
            duplicateInRow = true;
            break;
          }
        }

        // Check if value already exists as Lumen in col
        let duplicateInCol = false;
        for (let otherR = 0; otherR < size; otherR++) {
          if (otherR !== r && currentStates[otherR][c] === 'lumen' && grid[otherR][c] === val) {
            duplicateInCol = true;
            break;
          }
        }

        if (duplicateInRow || duplicateInCol) {
          const lineType = duplicateInRow ? `Row ${r + 1}` : `Column ${c + 1}`;
          return {
            row: r,
            col: c,
            suggestedState: 'eclipse',
            reason: `The number ${val} is already illuminated in ${lineType}. Lumen cells in a line must be unique, so this cell must be Eclipse.`,
            technique: 'duplicate_prevention',
          };
        }
      }
    }
  }

  // 4. Technique: Sum would exceed target -> Cell must be Eclipse
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (currentStates[r][c] === 'empty' || currentStates[r][c] === 'marked') {
        const val = grid[r][c];
        let currentLumenSum = 0;
        for (let otherC = 0; otherC < size; otherC++) {
          if (currentStates[r][otherC] === 'lumen') currentLumenSum += grid[r][otherC];
        }
        if (currentLumenSum + val > rowTargets[r]) {
          return {
            row: r,
            col: c,
            suggestedState: 'eclipse',
            reason: `Illuminating ${val} would cause Row ${r + 1} to exceed its target sum of ${rowTargets[r]}. Therefore, this cell must be Eclipse.`,
            technique: 'sum_exhaustion',
          };
        }

        let currentColLumenSum = 0;
        for (let otherR = 0; otherR < size; otherR++) {
          if (currentStates[otherR][c] === 'lumen') currentColLumenSum += grid[otherR][c];
        }
        if (currentColLumenSum + val > colTargets[c]) {
          return {
            row: r,
            col: c,
            suggestedState: 'eclipse',
            reason: `Illuminating ${val} would cause Column ${c + 1} to exceed its target sum of ${colTargets[c]}. Therefore, this cell must be Eclipse.`,
            technique: 'sum_exhaustion',
          };
        }
      }
    }
  }

  // 5. Lookahead / Full Solver fallback: Find exact cell from unique solution
  const solutions = solvePuzzle(grid, rowTargets, colTargets, 1);
  if (solutions.length > 0) {
    const sol = solutions[0];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (currentStates[r][c] === 'empty' || currentStates[r][c] === 'marked') {
          const expected = sol[r][c];
          return {
            row: r,
            col: c,
            suggestedState: expected,
            reason: `Deductive analysis reveals this cell must be ${expected.toUpperCase()} to satisfy both harmonic sums and shadow balance.`,
            technique: 'lookahead',
          };
        }
      }
    }
  }

  return null;
}
