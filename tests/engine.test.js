/* Engine tests for Conflux. Run: node tests/engine.test.js */
'use strict';
const assert = require('assert');
const E = require('../js/engine.js');

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.error('  FAIL:', msg); }
}

/* ---------------- analyze() ---------------- */
{
  // 3x3, pool at 0. Partial assignment with a resolved branch.
  const n = 3;
  const poolAt = [0, -1, -1, -1, -1, -1, -1, -1, -1];
  const dirs = [-1, 3, 3, 0, 0, -1, -1, -1, -1]; // 1->W(0), 2->W(1), 3->N(0), 4->N(3)
  const a = E.analyze(n, dirs, poolAt);
  check(a.basin[0] === 0 && a.basin[1] === 0 && a.basin[2] === 0 && a.basin[3] === 0 && a.basin[4] === 0,
    'branch cells drain to pool 0');
  check(a.basin[5] === -1 && a.basin[8] === -1, 'unassigned cells are unresolved');
  check(a.counts[0] === 5, `counts[0] should be 5, got ${a.counts[0]}`);
  check(!a.loops.some(Boolean), 'no loops in branch layout');
}
{
  // Loops: 0<->1, and 2 drains into the loop.
  const n = 3;
  const poolAt = new Array(9).fill(-1);
  const dirs = [1, 3, 3, -1, -1, -1, -1, -1, -1]; // 0->E(1), 1->W(0), 2->W(1)
  const a = E.analyze(n, dirs, poolAt);
  check(a.loops[0] === 1 && a.loops[1] === 1, 'mutual pair is a loop');
  check(a.loops[2] === 1, 'cell draining into a loop is flagged');
  check(a.basin[0] === -1 && a.basin[2] === -1, 'loop cells have no basin');
}

/* ---------------- countSolutions() ---------------- */
{
  // 2x2, one pool at 0, no givens: exactly 4 complete solutions
  // (hand-enumerated: 1={W,S}, 2={N,E}, 3={N,W}; cycles kill the other four).
  const pz = { n: 2, poolAt: [0, -1, -1, -1], caps: [4], givens: [-1, -1, -1, -1] };
  check(E.countSolutions(pz, 100) === 4, `expected 4 solutions, got ${E.countSolutions(pz, 100)}`);
  check(E.countSolutions(pz, 2) === 2, 'limit=2 stops at 2');
  const bad = { n: 2, poolAt: [0, -1, -1, -1], caps: [3], givens: [-1, -1, -1, -1] };
  check(E.countSolutions(bad, 100) === 0, 'unsatisfiable capacity yields 0 solutions');
  const full = { n: 2, poolAt: [0, -1, -1, -1], caps: [4], givens: [-1, 3, 0, 0] }; // 1->W, 2->N, 3->N
  check(E.countSolutions(full, 100) === 1, 'fully given board has exactly 1 solution');
}

/* ---------------- cross-validate the two solution counters ---------------- */
{
  // countSolutions searches arrow assignments; countSolutionsFast enumerates
  // partitions x arborescences. They must agree exactly on many random boards.
  const rng = E.mulberry32(20261004);
  let boards = 0;
  for (let t = 0; t < 200; t++) {
    const n = 3 + ((rng() * 2) | 0); // 3x3 or 4x4
    const springCount = 2 + ((rng() * 2) | 0);
    const pz = E.generate({ n, springs: springCount, keep: 0.4 + rng() * 0.5 }, (rng() * 1e9) | 0);
    if (!pz) continue;
    boards++;
    const a1 = E.countSolutions(pz, 100);
    const a2 = E.countSolutionsFast(pz, 100);
    check(a1 === a2, `counter disagreement: arrow=${a1} partition=${a2} (n=${pz.n} seed=${pz.seed})`);
    if (a1 !== a2) break;
    // and on a random subset of givens (uniqueness broken on purpose)
    const g2 = pz.givens.slice();
    for (let i = 0; i < pz.n * pz.n; i++) {
      if (pz.poolAt[i] < 0 && rng() < 0.4 && g2[i] >= 0) g2[i] = -1;
    }
    const pz2 = { n: pz.n, poolAt: pz.poolAt, caps: pz.caps, givens: g2 };
    const b1 = E.countSolutions(pz2, 100);
    const b2 = E.countSolutionsFast(pz2, 100);
    check(b1 === b2, `counter disagreement (thinned): arrow=${b1} partition=${b2} (seed=${pz.seed})`);
    if (b1 !== b2) break;
  }
  console.log(`cross-check: ${boards} boards agreed between both counters`);
}

/* ---------------- generation ---------------- */
for (const name of ['gentle', 'steady', 'deluge']) {
  const K = 10;
  let totalMs = 0, maxMs = 0, ratioSum = 0, ok = 0;
  for (let k = 0; k < K; k++) {
    const t0 = Date.now();
    const pz = E.generate(name, 1000 + k * 7919);
    const ms = Date.now() - t0;
    if (!pz) { check(false, `${name}: generation returned null (seed ${1000 + k * 7919})`); continue; }
    ok++;
    totalMs += ms; maxMs = Math.max(maxMs, ms);

    const N = pz.n * pz.n;
    const capSum = pz.caps.reduce((a, b) => a + b, 0);
    check(capSum === N, `${name}: caps sum ${capSum} != ${N}`);
    // carve proves uniqueness at every kept removal, so a verification that
    // runs out of its effort budget (reports 2) is not a failure
    const uniq = E.countSolutionsFast(pz, 2);
    check(uniq === 1 || E.countSolutionsFast.lastBudgetHit,
      `${name}: puzzle is not unique (count ${uniq})`);
    check(E.isWin(pz.n, pz.solution, pz.poolAt, pz.caps), `${name}: reference solution is not a win`);
    let givens = 0;
    for (let i = 0; i < N; i++) {
      if (pz.poolAt[i] < 0 && pz.givens[i] >= 0) {
        givens++;
        check(pz.givens[i] === pz.solution[i], `${name}: given at ${i} disagrees with solution`);
      }
    }
    // the starting position (givens only) must not already be won
    const start = Array.from(pz.givens);
    check(!E.isWin(pz.n, start, pz.poolAt, pz.caps), `${name}: puzzle starts already won`);
    // and no given may itself violate the rules (overfull pool / loop among givens)
    const a = E.analyze(pz.n, start, pz.poolAt);
    check(!a.loops.some(Boolean), `${name}: givens contain a loop`);
    for (let p = 0; p < pz.caps.length; p++) check(a.counts[p] <= pz.caps[p], `${name}: givens overfill pool ${p}`);
    ratioSum += givens / N;
  }
  const preset = E.PRESETS[name];
  console.log(`${name.padEnd(7)} ${preset.n}x${preset.n}  springs~${preset.springs}  ` +
    `gen avg ${(totalMs / ok).toFixed(0)}ms  max ${maxMs}ms  givens ${(ratioSum / ok * 100).toFixed(0)}%  (${ok}/${K} ok)`);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nAll engine tests passed.');
