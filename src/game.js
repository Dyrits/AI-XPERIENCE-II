const SIZE = 6;
const CELLS = SIZE * SIZE;
const neighbors = Array.from({ length: CELLS }, (_, index) =>
  [
    index % SIZE > 0 ? index - 1 : -1,
    index % SIZE < SIZE - 1 ? index + 1 : -1,
    index >= SIZE ? index - SIZE : -1,
    index < CELLS - SIZE ? index + SIZE : -1,
  ].filter((value) => value >= 0),
);

function randomFor(seed) {
  let state = 2166136261;
  for (const character of String(seed)) {
    state = Math.imul(state ^ character.codePointAt(0), 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

export function evaluateBoard(puzzle, board) {
  const rowCounts = Array(SIZE).fill(0);
  const colCounts = Array(SIZE).fill(0);
  const invalidPairs = [];
  for (let index = 0; index < CELLS; index++) {
    if (board[index] !== 1) continue;
    rowCounts[Math.floor(index / SIZE)]++;
    colCounts[index % SIZE]++;
    if (neighbors[index].filter((other) => board[other] === 1).length !== 1) {
      invalidPairs.push(index);
    }
  }
  const givensMatch = Object.entries(puzzle.givens).every(([index, value]) =>
    value === 1 ? board[index] === 1 : board[index] !== 1,
  );
  const solved =
    board.length === CELLS &&
    givensMatch &&
    invalidPairs.length === 0 &&
    rowCounts.every((value, index) => value === puzzle.rows[index]) &&
    colCounts.every((value, index) => value === puzzle.cols[index]);
  return { solved, rowCounts, colCounts, invalidPairs };
}

const masksByCount = Array.from({ length: SIZE + 1 }, () => []);
for (let mask = 0; mask < 1 << SIZE; mask++) {
  // Three horizontally consecutive flowers can never be a valid pair.
  if (mask & (mask << 1) & (mask << 2)) continue;
  masksByCount[mask.toString(2).replaceAll('0', '').length].push(mask);
}

function rowHasPairs(above, row, below) {
  for (let col = 0; col < SIZE; col++) {
    if (!(row & (1 << col))) continue;
    const count =
      Number(Boolean(above & (1 << col))) +
      Number(Boolean(below & (1 << col))) +
      Number(col > 0 && Boolean(row & (1 << (col - 1)))) +
      Number(col < SIZE - 1 && Boolean(row & (1 << (col + 1))));
    if (count !== 1) return false;
  }
  return true;
}

/** Count solutions from clues alone, stopping as soon as the limit is reached. */
export function countSolutions(puzzle, limit = 2) {
  if (limit <= 0) return 0;
  const choices = puzzle.rows.map((count, row) =>
    (masksByCount[count] ?? []).filter((mask) => {
      for (let col = 0; col < SIZE; col++) {
        const given = puzzle.givens[row * SIZE + col];
        if (given === 1 && !(mask & (1 << col))) return false;
        if (given === -1 && mask & (1 << col)) return false;
      }
      return true;
    }),
  );
  const columns = Array(SIZE).fill(0);
  let found = 0;
  function search(row, above, previous) {
    if (row === SIZE) {
      if (
        rowHasPairs(above, previous, 0) &&
        columns.every((count, col) => count === puzzle.cols[col])
      )
        found++;
      return;
    }
    for (const mask of choices[row]) {
      if (row > 0 && !rowHasPairs(above, previous, mask)) continue;
      let possible = true;
      for (let col = 0; col < SIZE; col++) {
        const next = columns[col] + ((mask >> col) & 1);
        if (
          next > puzzle.cols[col] ||
          next + SIZE - row - 1 < puzzle.cols[col]
        ) {
          possible = false;
          break;
        }
      }
      if (!possible) continue;
      for (let col = 0; col < SIZE; col++) columns[col] += (mask >> col) & 1;
      search(row + 1, previous, mask);
      for (let col = 0; col < SIZE; col++) columns[col] -= (mask >> col) & 1;
      if (found >= limit) return;
    }
  }
  search(0, 0, 0);
  return found;
}

/** Deterministic paired gardens; a clue is removed only if uniqueness survives. */
export function createPuzzle(seed, difficulty = 'gentle') {
  const targets = { gentle: 16, standard: 10, tricky: 5 };
  if (!Object.hasOwn(targets, difficulty))
    throw new RangeError(`Unknown difficulty: ${difficulty}`);
  const random = randomFor(seed);
  const solution = Array(CELLS).fill(-1);
  const edges = neighbors.flatMap((adjacent, index) =>
    adjacent.filter((other) => other > index).map((other) => [index, other]),
  );
  for (const [first, second] of shuffle(edges, random)) {
    if (
      [first, second].some(
        (index) =>
          solution[index] === 1 ||
          neighbors[index].some((other) => solution[other] === 1),
      )
    )
      continue;
    solution[first] = 1;
    solution[second] = 1;
  }
  const counts = evaluateBoard({ givens: {}, rows: [], cols: [] }, solution);
  const puzzle = {
    id: `petal-${encodeURIComponent(String(seed))}-${difficulty}`,
    size: SIZE,
    rows: counts.rowCounts,
    cols: counts.colCounts,
    givens: Object.fromEntries(solution.map((value, index) => [index, value])),
    solution,
    difficulty,
  };
  // Reserve one of each kind so every puzzle introduces flowers and stones.
  const flower = solution.indexOf(1);
  const stone = solution.indexOf(-1);
  let remaining = CELLS;
  for (const index of shuffle(
    Array.from({ length: CELLS }, (_, index) => index),
    random,
  )) {
    if (remaining <= targets[difficulty]) break;
    if (index === flower || index === stone) continue;
    delete puzzle.givens[index];
    if (countSolutions(puzzle) !== 1) puzzle.givens[index] = solution[index];
    else remaining--;
  }
  return puzzle;
}

export function getHint(puzzle, board) {
  const available = Array.from({ length: CELLS }, (_, index) => index).filter(
    (index) => !Object.hasOwn(puzzle.givens, index),
  );
  const index =
    available.find(
      (index) => board[index] === 1 && puzzle.solution[index] === -1,
    ) ??
    available.find(
      (index) => board[index] !== 1 && puzzle.solution[index] === 1,
    ) ??
    available.find(
      (index) => board[index] === 0 && puzzle.solution[index] === -1,
    );
  if (index === undefined) return null;
  const value = puzzle.solution[index];
  return {
    index,
    value,
    message:
      value === 1
        ? 'This cell contains a flower in the solution.'
        : 'This cell is empty in the solution.',
  };
}

export function getDailySeed(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
