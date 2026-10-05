/* Quick generation benchmark. Run: node tests/bench.js [difficulty] [count] */
'use strict';
const E = require('../js/engine.js');

const name = process.argv[2] || 'gentle';
const K = Number(process.argv[3] || 5);
const preset = E.PRESETS[name];
if (!preset) { console.error('unknown difficulty:', name); process.exit(1); }
console.log(`${name}: ${preset.n}x${preset.n}, springs ${preset.springs}, keep ${preset.keep}`);

let worst = 0;
for (let k = 0; k < K; k++) {
  const seed = 1000 + k * 7919;
  const t0 = Date.now();
  const pz = E.generate(name, seed);
  const ms = Date.now() - t0;
  worst = Math.max(worst, ms);
  if (!pz) { console.log(`seed ${seed}: FAILED`); continue; }
  const givens = pz.givens.filter((d) => d >= 0).length;
  console.log(`seed ${seed}: ${ms}ms  givens ${givens}/${pz.n * pz.n}  caps [${pz.caps.join(',')}]`);
}
console.log(`worst: ${worst}ms`);
