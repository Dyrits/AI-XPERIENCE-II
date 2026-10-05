/*
 * Mothlight engine: board model, solver and puzzle generator.
 *
 * Rules
 *   - Every cell that is not a lamp holds a moth.
 *   - Each moth faces up, right, down or left and flies to the first lamp
 *     in that direction. Moths never block each other; lamps do.
 *   - The number on a lamp is the number of moths flying to it.
 */
(function (global) {
  'use strict';

  // up, right, down, left (clockwise, matching 0/90/180/270 degrees)
  const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  const POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
  const NODE_LIMIT = 60000;

  const DIFFICULTIES = {
    easy:   { label: 'Easy',   size: 5, lampRatio: 0.26, attempts: 80, preferLogic: true },
    medium: { label: 'Medium', size: 6, lampRatio: 0.23, attempts: 120, preferLogic: true },
    hard:   { label: 'Hard',   size: 7, lampRatio: 0.21, attempts: 200, preferLogic: false },
    expert: { label: 'Expert', size: 8, lampRatio: 0.19, attempts: 200, preferLogic: false },
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Static geometry: where the lamps are and what each moth can see. */
  function buildBoard(size, lampCells) {
    const lampAt = new Int16Array(size * size).fill(-1);
    lampCells.forEach((idx, i) => { lampAt[idx] = i; });
    const mothAt = new Int16Array(size * size).fill(-1);
    const moths = [];
    for (let idx = 0; idx < size * size; idx++) {
      if (lampAt[idx] >= 0) continue;
      const r = Math.floor(idx / size), c = idx % size;
      const targets = [-1, -1, -1, -1];
      let mask = 0;
      for (let d = 0; d < 4; d++) {
        let rr = r + DIRS[d][0], cc = c + DIRS[d][1];
        while (rr >= 0 && rr < size && cc >= 0 && cc < size) {
          const l = lampAt[rr * size + cc];
          if (l >= 0) { targets[d] = l; mask |= 1 << d; break; }
          rr += DIRS[d][0]; cc += DIRS[d][1];
        }
      }
      mothAt[idx] = moths.length;
      moths.push({ idx, r, c, targets, mask, options: [0, 1, 2, 3].filter((d) => mask & (1 << d)) });
    }
    const lampLinks = lampCells.map(() => []);
    moths.forEach((m, mi) => m.targets.forEach((t, d) => { if (t >= 0) lampLinks[t].push(mi, d); }));
    return { size, lampCells, lampAt, mothAt, moths, lampLinks };
  }

  function lampCounts(board, dirs) {
    const counts = new Array(board.lampCells.length).fill(0);
    board.moths.forEach((m, mi) => {
      const d = dirs[mi];
      if (d >= 0 && m.targets[d] >= 0) counts[m.targets[d]]++;
    });
    return counts;
  }

  /**
   * Constraint propagation on direction bitmasks. Mutates `dom`.
   * Returns false on contradiction.
   */
  function propagate(board, nums, dom) {
    const links = board.lampLinks;
    let changed = true;
    while (changed) {
      changed = false;
      for (let l = 0; l < nums.length; l++) {
        const lk = links[l];
        let a = 0, p = 0;
        for (let k = 0; k < lk.length; k += 2) {
          const bit = 1 << lk[k + 1], dm = dom[lk[k]];
          if (!(dm & bit)) continue;
          if (dm === bit) a++; else p++;
        }
        const n = nums[l];
        if (a > n || a + p < n) return false;
        if (p > 0 && (a === n || a + p === n)) {
          const force = a + p === n;
          for (let k = 0; k < lk.length; k += 2) {
            const m = lk[k], bit = 1 << lk[k + 1], dm = dom[m];
            if (!(dm & bit) || dm === bit) continue;
            dom[m] = force ? bit : dm & ~bit;
            if (dom[m] === 0) return false;
            changed = true;
          }
        }
      }
    }
    return true;
  }

  function maskToDir(mask) {
    return mask === 1 ? 0 : mask === 2 ? 1 : mask === 4 ? 2 : mask === 8 ? 3 : -1;
  }

  /** Counts solutions up to `limit`. Returns { count, sols, aborted }. */
  function solve(board, nums, dom0, limit = 2) {
    const sols = [];
    let nodes = 0, aborted = false;
    const n = board.moths.length;
    (function rec(dom) {
      if (aborted || sols.length >= limit) return;
      if (++nodes > NODE_LIMIT) { aborted = true; return; }
      if (!propagate(board, nums, dom)) return;
      let best = -1, bp = 5;
      for (let m = 0; m < n; m++) {
        const pc = POP[dom[m]];
        if (pc > 1 && pc < bp) { bp = pc; best = m; if (pc === 2) break; }
      }
      if (best < 0) { sols.push(Array.from(dom, maskToDir)); return; }
      for (let d = 0; d < 4; d++) {
        if (!(dom[best] & (1 << d))) continue;
        const nd = dom.slice();
        nd[best] = 1 << d;
        rec(nd);
        if (aborted || sols.length >= limit) return;
      }
    })(Uint8Array.from(dom0));
    return { count: sols.length, sols, aborted };
  }

  function initialDomain(board, givens, solution) {
    const dom = Uint8Array.from(board.moths, (m) => m.mask);
    givens.forEach((m) => { dom[m] = 1 << solution[m]; });
    return dom;
  }

  /** True when lamp-count reasoning alone (no guessing) finishes the grid. */
  function solvableByLogic(board, nums, givens, solution) {
    const dom = initialDomain(board, givens, solution);
    if (!propagate(board, nums, dom)) return false;
    return dom.every((d) => POP[d] === 1);
  }

  function placeLamps(size, ratio, rng) {
    const total = size * size;
    const count = Math.max(3, Math.round(total * ratio));
    for (let tries = 0; tries < 200; tries++) {
      const cells = shuffle([...Array(total).keys()], rng).slice(0, count).sort((a, b) => a - b);
      const set = new Set(cells);
      // no solid 2x2 blocks of lamps
      let blocky = false;
      for (let r = 0; r < size - 1 && !blocky; r++) {
        for (let c = 0; c < size - 1; c++) {
          const i = r * size + c;
          if (set.has(i) && set.has(i + 1) && set.has(i + size) && set.has(i + size + 1)) { blocky = true; break; }
        }
      }
      if (blocky) continue;
      const board = buildBoard(size, cells);
      if (board.moths.every((m) => m.mask !== 0)) return board;
    }
    return null;
  }

  function generateOnce(cfg, rng) {
    const board = placeLamps(cfg.size, cfg.lampRatio, rng);
    if (!board) return null;
    const solution = board.moths.map((m) => m.options[Math.floor(rng() * m.options.length)]);
    const nums = lampCounts(board, solution);

    // Pin moths until the solution is unique.
    const givens = [];
    for (;;) {
      const res = solve(board, nums, initialDomain(board, givens, solution), 2);
      if (res.aborted) return null;
      if (res.count === 1) break;
      const [a, b] = res.sols;
      const diffs = [];
      for (let m = 0; m < a.length; m++) if (a[m] !== b[m]) diffs.push(m);
      givens.push(diffs[Math.floor(rng() * diffs.length)]);
    }
    // Drop any pins that turned out to be unnecessary.
    for (const g of shuffle(givens.slice(), rng)) {
      const trial = givens.filter((x) => x !== g);
      const res = solve(board, nums, initialDomain(board, trial, solution), 2);
      if (!res.aborted && res.count === 1) givens.splice(givens.indexOf(g), 1);
    }
    givens.sort((x, y) => x - y);
    return { board, nums, solution, givens, logic: solvableByLogic(board, nums, givens, solution) };
  }

  function score(c, cfg) {
    let s = c.givens.length * 10;
    if (cfg.preferLogic && !c.logic) s += 60;
    if (!cfg.preferLogic && c.logic) s += 25;
    // Prefer interesting lamp numbers over a sea of zeros and ones.
    const spread = new Set(c.nums).size;
    s -= spread * 2;
    return s;
  }

  function generate(difficulty, seed) {
    const cfg = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
    const rng = mulberry32(seed);
    let best = null, bestScore = Infinity;
    for (let i = 0; i < cfg.attempts || !best; i++) {
      const c = generateOnce(cfg, rng);
      if (!c) continue;
      const s = score(c, cfg);
      if (s < bestScore) { best = c; bestScore = s; }
    }
    return {
      difficulty,
      seed,
      size: cfg.size,
      lampCells: best.board.lampCells,
      nums: best.nums,
      solution: best.solution,
      givens: best.givens,
      logic: best.logic,
    };
  }

  /** Re-hydrate a puzzle object (e.g. after JSON round-trip). */
  function hydrate(p) {
    return Object.assign({}, p, { board: buildBoard(p.size, p.lampCells) });
  }

  /**
   * Next logical deduction from the player's correct moves plus pins.
   * Returns a moth index that is forced but not yet placed, or -1.
   */
  function findDeduction(puzzle, dirs) {
    const { board, nums, solution } = puzzle;
    const known = [];
    dirs.forEach((d, m) => { if (d >= 0 && d === solution[m]) known.push(m); });
    puzzle.givens.forEach((g) => known.push(g));
    const dom = initialDomain(board, known, solution);
    propagate(board, nums, dom);
    const forced = [];
    dom.forEach((d, m) => { if (POP[d] === 1 && dirs[m] !== solution[m]) forced.push(m); });
    return forced.length ? forced[Math.floor(Math.random() * forced.length)] : -1;
  }

  const api = { DIRS, DIFFICULTIES, mulberry32, hashString, buildBoard, lampCounts, solve, generate, hydrate, findDeduction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Mothlight = api;
})(typeof window !== 'undefined' ? window : globalThis);
