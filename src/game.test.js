import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPuzzle,
  evaluateBoard,
  getHint,
  getDailySeed,
  countSolutions,
} from './game.js';

const fixture = {
  size: 6,
  rows: [2, 0, 0, 0, 0, 0],
  cols: [1, 1, 0, 0, 0, 0],
  givens: { 0: 1, 35: -1 },
  solution: [1, 1, ...Array(34).fill(-1)],
};

test('a complete flower arrangement needs no empty marks', () => {
  const board = fixture.solution.map((value) => (value === 1 ? 1 : 0));
  assert.deepEqual(evaluateBoard(fixture, board), {
    solved: true,
    rowCounts: fixture.rows,
    colCounts: fixture.cols,
    invalidPairs: [],
  });
});

test('counts, pair rule, and fixed cells are independently required', () => {
  const single = fixture.solution.slice();
  single[1] = -1;
  assert.equal(evaluateBoard(fixture, single).solved, false);
  assert.deepEqual(evaluateBoard(fixture, single).invalidPairs, [0]);
  const chain = fixture.solution.slice();
  chain[2] = 1;
  assert.deepEqual(evaluateBoard(fixture, chain).invalidPairs, [1]);
  assert.equal(
    evaluateBoard({ ...fixture, rows: [3, 0, 0, 0, 0, 0] }, fixture.solution)
      .solved,
    false,
  );
  assert.equal(
    evaluateBoard({ ...fixture, cols: [0, 2, 0, 0, 0, 0] }, fixture.solution)
      .solved,
    false,
  );
  assert.equal(
    evaluateBoard({ ...fixture, givens: { 0: -1 } }, fixture.solution).solved,
    false,
  );
  assert.equal(
    evaluateBoard({ ...fixture, givens: { 35: 1 } }, fixture.solution).solved,
    false,
  );
});

test('diagonally touching pairs are allowed, but row edges do not wrap', () => {
  const diagonal = Array(36).fill(-1);
  for (const index of [0, 1, 8, 9]) diagonal[index] = 1;
  const puzzle = {
    size: 6,
    rows: [2, 2, 0, 0, 0, 0],
    cols: [1, 1, 1, 1, 0, 0],
    givens: {},
  };
  assert.equal(evaluateBoard(puzzle, diagonal).solved, true);
  const wrapped = Array(36).fill(-1);
  wrapped[5] = wrapped[6] = 1;
  assert.deepEqual(evaluateBoard(puzzle, wrapped).invalidPairs, [5, 6]);
  const vertical = Array(36).fill(-1);
  vertical[5] = vertical[11] = 1;
  assert.deepEqual(evaluateBoard(puzzle, vertical).invalidPairs, []);
});

test('seeded gardens are reproducible, valid, and uniquely solvable at every difficulty', () => {
  const identities = new Set();
  for (const seed of ['daily', 'rose', '42', '', '🌼']) {
    const givenCounts = [];
    for (const difficulty of ['gentle', 'standard', 'tricky']) {
      const puzzle = createPuzzle(seed, difficulty);
      assert.deepEqual(createPuzzle(seed, difficulty), puzzle);
      assert.equal(puzzle.size, 6);
      assert.equal(puzzle.difficulty, difficulty);
      assert.equal(typeof puzzle.id, 'string');
      assert.equal(puzzle.solution.length, 36);
      assert.ok(puzzle.solution.every((value) => value === 1 || value === -1));
      assert.ok(Object.values(puzzle.givens).includes(1));
      assert.ok(Object.values(puzzle.givens).includes(-1));
      for (const [index, value] of Object.entries(puzzle.givens)) {
        assert.equal(puzzle.solution[index], value);
      }
      assert.equal(evaluateBoard(puzzle, puzzle.solution).solved, true);
      assert.equal(countSolutions(puzzle), 1);
      givenCounts.push(Object.keys(puzzle.givens).length);
      identities.add(puzzle.solution.join(','));
    }
    assert.ok(givenCounts[0] > givenCounts[1]);
    assert.ok(givenCounts[1] > givenCounts[2]);
  }
  assert.ok(identities.size > 1);
});

test('solver counts arrangements without looking at the stored solution', () => {
  assert.equal(countSolutions({ ...fixture, solution: [] }), 1);
  assert.equal(countSolutions({ ...fixture, givens: { 0: -1 } }), 0);
  const ambiguous = {
    size: 6,
    rows: [2, 2, 0, 0, 0, 0],
    cols: [1, 1, 1, 1, 0, 0],
    givens: {},
  };
  assert.equal(countSolutions(ambiguous, 2), 2);
});

test('hints correct extra flowers first and never change givens', () => {
  const board = Array(36).fill(0);
  board[0] = 1;
  board[8] = 1;
  assert.deepEqual(getHint(fixture, board), {
    index: 8,
    value: -1,
    message: 'This cell is empty in the solution.',
  });
  board[8] = -1;
  assert.equal(getHint(fixture, board).index, 1);
  board[1] = -1;
  assert.equal(getHint(fixture, board).value, 1);
  board[1] = 1;
  const hint = getHint(fixture, board);
  assert.equal(hint.value, -1);
  assert.ok(!(hint.index in fixture.givens));
  assert.equal(getHint(fixture, fixture.solution), null);
});

test('daily seed uses local calendar fields', () => {
  assert.equal(getDailySeed(new Date(2026, 0, 9, 23, 59)), '2026-01-09');
});
