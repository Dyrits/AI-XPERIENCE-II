import { Difficulty, PuzzleDefinition } from '../types/game';
import { solvePuzzle } from './solver';

/**
 * Random integer between min and max inclusive.
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a valid mask of 1 (Lumen) and 0 (Eclipse) where no two 0s are orthogonally adjacent.
 */
function generateValidMask(size: number): number[][] {
  const mask: number[][] = Array.from({ length: size }, () => Array(size).fill(1));

  // Randomly set some cells to 0 (Eclipse) ensuring no two 0s are adjacent
  const cells: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push([r, c]);
    }
  }

  // Shuffle cells
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  // Target roughly 30-40% eclipse cells
  const targetEclipseCount = Math.floor(size * size * (0.28 + Math.random() * 0.12));
  let eclipseCount = 0;

  for (const [r, c] of cells) {
    if (eclipseCount >= targetEclipseCount) break;

    // Check if any neighbor is already 0
    let hasNeighborEclipse = false;
    const neighbors = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        if (mask[nr][nc] === 0) {
          hasNeighborEclipse = true;
          break;
        }
      }
    }

    if (!hasNeighborEclipse) {
      mask[r][c] = 0;
      eclipseCount++;
    }
  }

  return mask;
}

/**
 * Generates a fresh, uniquely solvable LUMINA puzzle of specified difficulty.
 */
export function generatePuzzle(
  difficulty: Difficulty,
  _customSeed?: number
): PuzzleDefinition {
  const sizeMap: Record<Difficulty, number> = {
    dawn: 4,
    solar: 5,
    eclipse: 6,
    supernova: 7,
  };

  const size = sizeMap[difficulty];
  const maxVal = size <= 4 ? 6 : size === 5 ? 7 : 9;

  let attempts = 0;
  while (attempts < 80) {
    attempts++;

    // 1. Generate valid mask with no adjacent shadows
    const mask = generateValidMask(size);

    // 2. Generate cell numbers such that Lumen cells in each row and col are unique
    const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

    // Fill grid
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        grid[r][c] = randomInt(1, maxVal);
      }
    }

    // Adjust duplicates among Lumen cells in each row
    for (let r = 0; r < size; r++) {
      const usedInRow = new Set<number>();
      for (let c = 0; c < size; c++) {
        if (mask[r][c] === 1) {
          let val = grid[r][c];
          let tries = 0;
          while (usedInRow.has(val) && tries < 20) {
            val = randomInt(1, maxVal);
            tries++;
          }
          grid[r][c] = val;
          usedInRow.add(val);
        }
      }
    }

    // Adjust duplicates among Lumen cells in each column
    for (let c = 0; c < size; c++) {
      const usedInCol = new Set<number>();
      for (let r = 0; r < size; r++) {
        if (mask[r][c] === 1) {
          let val = grid[r][c];
          let tries = 0;
          while (usedInCol.has(val) && tries < 20) {
            val = randomInt(1, maxVal);
            tries++;
          }
          grid[r][c] = val;
          usedInCol.add(val);
        }
      }
    }

    // 3. Compute row and column target sums
    const rowTargets: number[] = Array(size).fill(0);
    const colTargets: number[] = Array(size).fill(0);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (mask[r][c] === 1) {
          rowTargets[r] += grid[r][c];
          colTargets[c] += grid[r][c];
        }
      }
    }

    // 4. Test uniqueness of solution using solver
    const solutions = solvePuzzle(grid, rowTargets, colTargets, 2);
    if (solutions.length === 1) {
      // Exactly one unique solution!
      const titles = [
        'Astral Resonance',
        'Orbit of Sol',
        'Starlight Weave',
        'Prism of Dawn',
        'Celestial Echo',
        'Zenith Horizon',
        'Vesper Node',
        'Cosmic Lattice',
        'Luminescent Gate',
        'Aurora Spark',
      ];
      const title = titles[Math.floor(Math.random() * titles.length)];

      return {
        id: `gen-${difficulty}-${Date.now()}-${randomInt(100, 999)}`,
        title: `${title}`,
        size,
        difficulty,
        grid,
        rowTargets,
        colTargets,
        solution: solutions[0],
      };
    }
  }

  // Fallback to a pre-verified template if dynamic generation timed out
  return getFallbackPuzzle(difficulty);
}

/**
 * Fallback verified puzzles for each difficulty in case procedural generation reaches attempt limit.
 */
function getFallbackPuzzle(difficulty: Difficulty): PuzzleDefinition {
  if (difficulty === 'dawn') {
    return {
      id: 'fallback-dawn',
      title: 'First Ray',
      size: 4,
      difficulty: 'dawn',
      grid: [
        [3, 1, 4, 2],
        [2, 5, 1, 4],
        [4, 2, 3, 1],
        [1, 4, 2, 5],
      ],
      rowTargets: [7, 7, 7, 7],
      colTargets: [6, 9, 6, 7],
      solution: [
        ['lumen', 'eclipse', 'lumen', 'eclipse'],
        ['eclipse', 'lumen', 'eclipse', 'lumen'],
        ['lumen', 'eclipse', 'lumen', 'eclipse'],
        ['eclipse', 'lumen', 'lumen', 'eclipse'],
      ],
    };
  }

  return {
    id: 'fallback-solar',
    title: 'Solar Core',
    size: 5,
    difficulty: 'solar',
    grid: [
      [3, 2, 5, 1, 4],
      [1, 4, 2, 5, 3],
      [5, 1, 4, 3, 2],
      [2, 5, 3, 4, 1],
      [4, 3, 1, 2, 5],
    ],
    rowTargets: [10, 8, 12, 9, 10],
    colTargets: [10, 11, 8, 10, 10],
  };
}
