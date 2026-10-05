/*
 * Conflux engine — puzzle generation, solving and flow analysis.
 *
 * A puzzle is a grid where some cells are pools carrying a capacity number.
 * Every other cell is a slope whose arrow points to an orthogonal neighbour.
 * Water flows along arrows; every path must end at a pool (no loops), and each
 * pool's capacity is exactly the number of cells draining into it, counting
 * the pool itself.
 *
 * Directions: 0=N, 1=E, 2=S, 3=W. A cell's dir points from the cell to its
 * downstream neighbour. Pool cells always have dir -1.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ConfluxEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DR = [-1, 0, 1, 0];
  const DC = [0, 1, 0, -1];
  const CW_ORDER = [1, 2, 3, 0];   // N->E->S->W
  const CCW_ORDER = [3, 0, 1, 2];  // N->W->S->E

  const PRESETS = {
    gentle: { n: 6, springs: 5, keep: 0.5, label: 'Gentle rain' },
    steady: { n: 8, springs: 9, keep: 0.45, label: 'Steady storm' },
    deluge: { n: 10, springs: 12, keep: 0.36, label: 'Deluge' },
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(a, rng) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function step(n, i, d) {
    const r = (i / n) | 0, c = i % n;
    const nr = r + DR[d], nc = c + DC[d];
    if (nr < 0 || nr >= n || nc < 0 || nc >= n) return -1;
    return nr * n + nc;
  }

  function domainOf(n, i) {
    const out = [];
    for (let d = 0; d < 4; d++) if (step(n, i, d) >= 0) out.push(d);
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Live flow analysis — used by the UI for tinting, pool fill rings,
   * loop highlights and the win check.
   *
   * basin[i]: pool id the cell currently drains to, or -1 when the path
   * is still unresolved (hits an unassigned cell or a loop).
   * loops[i]: 1 when the cell sits on, or drains into, a cycle.
   * counts[p]: cells draining to pool p, including the pool itself.
   * ------------------------------------------------------------------ */
  function analyze(n, dirs, poolAt) {
    const N = n * n;
    let poolCount = 0;
    for (let i = 0; i < N; i++) if (poolAt[i] >= 0) poolCount++;
    const basin = new Int16Array(N).fill(-3);
    const loops = new Uint8Array(N);
    const counts = new Int32Array(poolCount);

    for (let s = 0; s < N; s++) {
      if (basin[s] !== -3) continue;
      const path = [];
      let cur = s, outcome;
      while (true) {
        if (cur < 0) { outcome = 'pending'; break; } // off-grid (malformed dir)
        if (poolAt[cur] >= 0) { outcome = 'pool'; break; }
        if (dirs[cur] < 0) { outcome = 'pending'; break; }
        if (basin[cur] === -2) { outcome = 'loop'; break; }
        if (basin[cur] !== -3) { outcome = 'known'; break; }
        basin[cur] = -2;
        path.push(cur);
        cur = step(n, cur, dirs[cur]);
      }
      const knownLoop = outcome === 'loop' || (outcome === 'known' && loops[cur] === 1);
      const b = outcome === 'pool' ? poolAt[cur]
        : (outcome === 'known' && !knownLoop ? basin[cur] : -1);
      if (path.length === 0) { basin[s] = b; loops[s] = knownLoop ? 1 : 0; }
      else for (let k = 0; k < path.length; k++) { basin[path[k]] = b; loops[path[k]] = knownLoop ? 1 : 0; }
    }
    for (let i = 0; i < N; i++) if (basin[i] >= 0) counts[basin[i]]++;
    return { basin, loops, counts };
  }

  function isWin(n, dirs, poolAt, caps) {
    const N = n * n;
    for (let i = 0; i < N; i++) if (poolAt[i] < 0 && dirs[i] < 0) return false;
    const a = analyze(n, dirs, poolAt);
    for (let i = 0; i < N; i++) if (a.loops[i] || a.basin[i] < 0) return false;
    for (let p = 0; p < caps.length; p++) if (a.counts[p] !== caps[p]) return false;
    return true;
  }

  /* ------------------------------------------------------------------ *
   * Reference solution counter (arrow space).
   *
   * Searches arrow assignments directly with an incremental union-find:
   * each component carries its size, the pool it drains to (if reached
   * yet) and its single "outlet" — the unassigned cell the whole
   * component waits on. Used to cross-check the fast counter on small
   * boards; too slow for the generator on large ones.
   * ------------------------------------------------------------------ */
  function countSolutions(pz, limit) {
    const n = pz.n, N = n * n;
    const poolAt = pz.poolAt, caps = pz.caps, givens = pz.givens;

    const dirsW = new Int8Array(N).fill(-1);
    const parent = new Int32Array(N);
    const sz = new Int32Array(N);
    const poolOf = new Int32Array(N);
    const outlet = new Int32Array(N);
    const domains = new Array(N);
    for (let i = 0; i < N; i++) {
      parent[i] = i; sz[i] = 1; poolOf[i] = poolAt[i]; outlet[i] = -1;
      if (poolAt[i] < 0) domains[i] = domainOf(n, i);
    }
    const pend = new Array(N).fill(null); // unassigned target -> cells waiting on it
    const ops = [];                        // rollback journal

    const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };

    // Merge two components. Returns the new root, or -1 on a pool conflict
    // (two different pools in one component means a path forks between them).
    function uni(a, b) {
      let ra = find(a), rb = find(b);
      if (ra === rb) return ra;
      const pa = poolOf[ra], pb = poolOf[rb];
      if (pa >= 0 && pb >= 0 && pa !== pb) return -1;
      if (sz[ra] < sz[rb]) { const t = ra; ra = rb; rb = t; }
      ops.push({ k: 'u', child: rb, root: ra, sz: sz[ra], pool: poolOf[ra], out: outlet[ra] });
      parent[rb] = ra;
      sz[ra] += sz[rb];
      if (poolOf[ra] < 0) poolOf[ra] = poolOf[rb];
      if (outlet[ra] < 0) outlet[ra] = outlet[rb];
      return ra;
    }

    function undoTo(mark) {
      while (ops.length > mark) {
        const o = ops.pop();
        if (o.k === 'u') { parent[o.child] = o.child; sz[o.root] = o.sz; poolOf[o.root] = o.pool; outlet[o.root] = o.out; }
        else if (o.k === 'p') o.list.length = o.len;
        else if (o.k === 'd') dirsW[o.cell] = -1;
      }
    }

    // Try to point `cell` in direction `dir`. Returns false (state restored)
    // if the move immediately violates a rule.
    function assign(mark, cell, dir) {
      ops.push({ k: 'd', cell });
      dirsW[cell] = dir;
      const t = step(n, cell, dir);
      let root = cell;
      let ok = true;

      const waiters = pend[cell];
      if (waiters) {
        for (let j = 0; j < waiters.length && ok; j++) {
          const r = uni(root, waiters[j]);
          if (r < 0) ok = false; else root = r;
        }
      }

      if (ok) {
        const r0 = find(root);
        outlet[r0] = -1; // this component no longer dangles at `cell`
        if (dirsW[t] >= 0 || poolAt[t] >= 0) {
          const r = uni(r0, t);
          if (r < 0) ok = false; else root = r;
        } else {
          outlet[r0] = t;
          if (!pend[t]) pend[t] = [];
          ops.push({ k: 'p', list: pend[t], len: pend[t].length });
          pend[t].push(cell);
        }
      }

      if (ok) {
        const r = find(root);
        if (poolOf[r] >= 0 && sz[r] > caps[poolOf[r]]) ok = false;
      }

      if (!ok) { undoTo(mark); return false; }
      return true;
    }

    const poolCells = [];
    for (let i = 0; i < N; i++) if (poolAt[i] >= 0) poolCells.push(i);

    let count = 0;
    const remaining = [];
    for (let i = 0; i < N; i++) if (poolAt[i] < 0) remaining.push(i);

    // Dynamic ordering: assign the cell most tightly hemmed in first.
    function pickCell() {
      let best = -1, bestScore = -1;
      for (let j = 0; j < remaining.length; j++) {
        const cell = remaining[j];
        if (cell < 0) continue;
        let locked = 0;
        for (let d = 0; d < 4; d++) {
          const t = step(n, cell, d);
          if (t < 0 || poolAt[t] >= 0 || dirsW[t] >= 0) locked++;
        }
        const dom = givens[cell] >= 0 ? 1 : domains[cell].length;
        const score = locked * 8 - dom * 2;
        if (score > bestScore) { bestScore = score; best = j; }
      }
      return best;
    }

    function dfs(depth) {
      if (count >= limit) return;
      if (depth === remaining.length) {
        for (let p = 0; p < poolCells.length; p++) {
          const r = find(poolCells[p]);
          if (sz[r] !== caps[poolAt[poolCells[p]]]) return; // under-filled pool
        }
        count++;
        return;
      }
      const j = pickCell();
      const cell = remaining[j];
      remaining[j] = -1;
      const dom = givens[cell] >= 0 ? [givens[cell]] : domains[cell];
      for (let v = 0; v < dom.length; v++) {
        const mark = ops.length;
        if (assign(mark, cell, dom[v])) {
          dfs(depth + 1);
          undoTo(mark);
          if (count >= limit) break;
        }
      }
      remaining[j] = cell;
    }
    dfs(0);
    return count;
  }

  /* ------------------------------------------------------------------ *
   * Fast solution counter (used by the generator).
   *
   * Counts the same thing as countSolutions — complete valid arrow
   * assignments — but searches over basin PARTITIONS instead of arrow
   * directions. Basins are connected regions whose sizes equal the pool
   * capacities, and the arrows inside a basin form a spanning arborescence
   * rooted at the pool. So: enumerate partitions (cells assigned to pools
   * in a fixed order, so each partition is produced exactly once), then
   * per complete partition count arborescences per basin with the directed
   * matrix-tree theorem — givens restrict a cell's out-arcs to its carved
   * direction — and take the product, capping at `limit`.
   * ------------------------------------------------------------------ */

  // Exact-while-small determinant (Bareiss): returns the true determinant
  // while every intermediate stays comfortably inside double precision, and
  // 2 as soon as magnitudes blow past it (meaning "at least 2" for our use).
  function detCapped(M) {
    const m = M.length;
    if (m === 0) return 1;
    let sign = 1, prev = 1;
    for (let k = 0; k < m - 1; k++) {
      if (M[k][k] === 0) {
        let sw = -1;
        for (let i = k + 1; i < m; i++) if (M[i][k] !== 0) { sw = i; break; }
        if (sw < 0) return 0;
        const t = M[k]; M[k] = M[sw]; M[sw] = t;
        sign = -sign;
      }
      const piv = M[k][k];
      for (let i = k + 1; i < m; i++) {
        const Mik = M[i][k];
        for (let j = k + 1; j < m; j++) {
          M[i][j] = (M[i][j] * piv - Mik * M[k][j]) / prev;
        }
        M[i][k] = 0;
      }
      prev = piv;
    }
    const d = sign * M[m - 1][m - 1];
    return Math.abs(d) > 1e15 ? 2 : d;
  }

  function countSolutionsFast(pz, limit) {
    const n = pz.n, N = n * n;
    const poolAt = pz.poolAt, caps = pz.caps, givens = pz.givens;
    const P = caps.length;

    const owner = new Int16Array(N).fill(-1);
    const size = new Int32Array(P).fill(1); // pools count themselves
    const region = [];
    const poolCellOf = new Int32Array(P);
    for (let p = 0; p < P; p++) region.push([]);
    for (let i = 0; i < N; i++) {
      const p = poolAt[i];
      if (p >= 0) { owner[i] = p; poolCellOf[p] = i; region[p].push(i); }
    }
    const givenIn = new Array(N).fill(null);
    for (let i = 0; i < N; i++) {
      if (poolAt[i] < 0 && givens[i] >= 0) {
        const t = step(n, i, givens[i]);
        if (t >= 0) {
          if (!givenIn[t]) givenIn[t] = [];
          givenIn[t].push(i);
        }
      }
    }

    // fixed order: givens first (most constrained), then the rest outward
    // from everything already anchored — any fixed order is duplicate-free.
    const order = [];
    {
      const dist = new Int32Array(N).fill(-1);
      const q = [];
      for (let i = 0; i < N; i++) {
        if (poolAt[i] >= 0 || givens[i] >= 0) { dist[i] = 0; q.push(i); }
      }
      for (let h = 0; h < q.length; h++) {
        const cur = q[h];
        for (let d = 0; d < 4; d++) {
          const t = step(n, cur, d);
          if (t >= 0 && dist[t] < 0) { dist[t] = dist[cur] + 1; q.push(t); }
        }
      }
      for (let i = 0; i < N; i++) if (poolAt[i] < 0 && givens[i] >= 0) order.push(i);
      const rest = [];
      for (let i = 0; i < N; i++) if (poolAt[i] < 0 && givens[i] < 0) rest.push(i);
      rest.sort((a, b) => dist[a] - dist[b] || a - b);
      for (const r of rest) order.push(r);
    }

    const ops = [];
    // Stamps must stay exact: long searches push the generation counter past
    // 2^31, where Int32 truncation would silently break visited-guards.
    const seen = new Float64Array(N).fill(-1);
    const candStamp = new Float64Array(P).fill(-1);
    const queue = new Int32Array(N + 1);
    let bfsGen = 0;

    // Hard ceiling on search effort, scaled so a check costs roughly the
    // same wall time at any board size. If hit, the count is reported as
    // `limit` ("at least limit solutions"), which the carver treats as
    // non-unique — conservative: only proven-unique removals are kept.
    const NODE_BUDGET = Math.max(12000, Math.floor(1800000 / N));
    let nodes = 0;
    let budgetHit = false;
    // A full pool's region is frozen: once its connectivity check passes it
    // can never change, so skip re-checking it on every later node.
    const fullConnected = new Uint8Array(P);

    // Feasibility of the current partial partition:
    //  1. every pool that still needs cells can reach enough unassigned ones;
    //  2. every pool's claimed cells could still be connected — its pieces
    //     must lie in one component of (region ∪ unassigned).
    function feasible() {
      for (let p = 0; p < P; p++) {
        const deficit = caps[p] - size[p];
        const reg = region[p];
        if (size[p] >= caps[p]) {
          if (reg.length === 1 || fullConnected[p]) continue;
        }
        bfsGen++;
        let qt = 0, reach = 0;
        let reachOk = deficit <= 0;
        let linked = 1;
        for (let j = 0; j < reg.length; j++) {
          const c = reg[j];
          for (let d = 0; d < 4; d++) {
            const t = step(n, c, d);
            if (t < 0 || seen[t] === bfsGen) continue;
            if (owner[t] < 0) {
              seen[t] = bfsGen; queue[qt++] = t;
              if (!reachOk && ++reach >= deficit) reachOk = true;
            } else if (owner[t] === p) {
              seen[t] = bfsGen; linked++;
            }
          }
        }
        let qh = 0;
        while (qh < qt) {
          const cur = queue[qh++];
          for (let d = 0; d < 4; d++) {
            const t = step(n, cur, d);
            if (t < 0 || seen[t] === bfsGen) continue;
            if (owner[t] < 0) {
              seen[t] = bfsGen; queue[qt++] = t;
              if (!reachOk && ++reach >= deficit) reachOk = true;
            } else if (owner[t] === p) {
              seen[t] = bfsGen; linked++;
            }
          }
        }
        if (linked < reg.length) return false;   // fragments can't reunite
        if (size[p] >= caps[p]) fullConnected[p] = 1;
        else if (!reachOk && reach < deficit) return false; // pool can never fill
      }
      return true;
    }

    // number of valid arrow layouts inside one basin:
    //  - tree fast path: a connected basin whose cells form a tree has
    //    exactly one arborescence; givens must point at each cell's parent;
    //  - otherwise count arborescences with the directed matrix-tree theorem.
    function basinTrees(p) {
      const cells = region[p];
      const m = cells.length;
      if (m === 1) return 1;
      const idx = new Map();
      for (let j = 0; j < m; j++) idx.set(cells[j], j);
      const root = poolCellOf[p];

      // BFS from the pool over basin cells: parents + connectivity + edges
      const parentCell = new Int32Array(m).fill(-2);
      const parentDir = new Int8Array(m).fill(-1);
      const qArr = new Int32Array(m);
      let qh = 0, qt = 0, edges = 0;
      const rj = idx.get(root);
      parentCell[rj] = -1;
      qArr[qt++] = rj;
      while (qh < qt) {
        const uj = qArr[qh++];
        const u = cells[uj];
        for (let d = 0; d < 4; d++) {
          const t = step(n, u, d);
          if (t < 0) continue;
          const tj = idx.get(t);
          if (tj === undefined) continue;
          edges++;
          if (parentCell[tj] === -2) {
            parentCell[tj] = uj;
            parentDir[tj] = (d + 2) % 4; // tj's arc back to u
            qArr[qt++] = tj;
          }
        }
      }
      edges /= 2;
      if (qt < m) return 0; // disconnected region
      if (edges === m - 1) {
        // tree: unique arborescence; verify givens follow it
        for (let j = 0; j < m; j++) {
          const u = cells[j];
          if (u === root || givens[u] < 0) continue;
          if (givens[u] !== parentDir[j]) return 0;
        }
        return 1;
      }

      // cyclic basin: directed matrix-tree on non-root nodes
      const rowOf = new Int32Array(m).fill(-1);
      let ri = 0;
      for (let j = 0; j < m; j++) if (cells[j] !== root) rowOf[j] = ri++;
      const rows = [];
      for (let r = 0; r < ri; r++) rows.push(new Array(ri).fill(0));
      for (let j = 0; j < m; j++) {
        const u = cells[j];
        if (u === root) continue;
        const ru = rowOf[j];
        let out = 0;
        if (givens[u] >= 0) {
          const t = step(n, u, givens[u]);
          const tk = idx.get(t);
          if (tk === undefined) return 0; // given aims outside the basin
          out = 1;
          if (t !== root) rows[ru][rowOf[tk]] -= 1;
        } else {
          for (let d = 0; d < 4; d++) {
            const t = step(n, u, d);
            const tk = idx.get(t);
            if (tk === undefined) continue;
            out++;
            if (t !== root) rows[ru][rowOf[tk]] -= 1;
          }
        }
        rows[ru][ru] += out;
      }
      const d = detCapped(rows);
      return d > 1e12 ? 2 : d; // "2" means at least 2
    }

    let count = 0;

    function dfs(k) {
      if (count >= limit || budgetHit) return;
      if (k === order.length) {
        let total = 1;
        for (let p = 0; p < P; p++) {
          const t = basinTrees(p);
          if (t === 0) return;
          total *= t;
          if (total >= limit) break;
        }
        if (total >= limit - count) { count = limit; return; }
        count += total;
        return;
      }
      if (++nodes > NODE_BUDGET) { budgetHit = true; return; }
      const c = order[k];

      // candidate pools: those whose region is reachable from c through
      // unassigned cells (a necessary condition for c to join them)
      bfsGen++;
      let qt = 0;
      queue[qt++] = c; seen[c] = bfsGen;
      const cand = [];
      for (let qh = 0; qh < qt; qh++) {
        const cur = queue[qh];
        for (let d = 0; d < 4; d++) {
          const t = step(n, cur, d);
          if (t < 0) continue;
          if (owner[t] < 0) {
            if (seen[t] !== bfsGen) { seen[t] = bfsGen; queue[qt++] = t; }
          } else {
            const p = owner[t];
            if (candStamp[p] !== bfsGen) { candStamp[p] = bfsGen; cand.push(p); }
          }
        }
      }

      // a given fixes the basin this cell can join once its target is claimed
      let cands = cand;
      if (givens[c] >= 0) {
        const t = step(n, c, givens[c]);
        if (owner[t] >= 0) cands = [owner[t]];
      }
      if (givenIn[c]) {
        const ins = givenIn[c];
        cands = cands.filter((p) => ins.every((x) => owner[x] < 0 || owner[x] === p));
      }

      for (let ci = 0; ci < cands.length; ci++) {
        const p = cands[ci];
        if (size[p] >= caps[p]) continue;
        ops.push({ prevLen: region[p].length });
        fullConnected[p] = 0;
        owner[c] = p; size[p]++; region[p].push(c);
        if (feasible()) dfs(k + 1);
        const o = ops.pop();
        owner[c] = -1; size[p]--; region[p].length = o.prevLen;
        fullConnected[p] = 0; // no longer full after the undo
        if (count >= limit || budgetHit) return;
      }
    }
    dfs(0);
    return budgetHit ? limit : count;
  }

  /* ------------------------------------------------------------------ *
   * Generation.
   *
   * 1. Scatter springs with a minimum spacing so pools never touch.
   * 2. Choose a capacity for each (weighted, clamped, summing to the grid).
   * 3. Grow the basins with random frontier expansion; enclosed leftovers
   *    are absorbed by a neighbour so generation always succeeds.
   * 4. Orient every cell along a BFS tree towards its spring.
   * 5. Carve givens away one at a time while the puzzle stays unique,
   *    bounded by a wall-clock deadline so generation stays responsive.
   * ------------------------------------------------------------------ */
  function generateSolution(n, springCount, rng) {
    const N = n * n;

    const cells = [];
    for (let i = 0; i < N; i++) cells.push(i);
    shuffle(cells, rng);

    const springs = [];
    for (let ci = 0; ci < cells.length && springs.length < springCount; ci++) {
      const c = cells[ci];
      const r1 = (c / n) | 0, c1 = c % n;
      let ok = true;
      for (let s = 0; s < springs.length; s++) {
        const s2 = springs[s];
        const r2 = (s2 / n) | 0, c2 = s2 % n;
        if (Math.abs(r1 - r2) + Math.abs(c1 - c2) < 2) { ok = false; break; }
      }
      if (ok) springs.push(c);
    }
    if (springs.length < 2) return null;
    const S = springs.length;

    // Weighted capacities, clamped, corrected to sum exactly to N.
    const weights = [];
    let wsum = 0;
    for (let s = 0; s < S; s++) { const w = 0.6 + rng() * 1.2; weights.push(w); wsum += w; }
    const maxCap = Math.max(2, Math.min(Math.floor(N * 0.55), N - S + 1));
    const targets = [];
    for (let s = 0; s < S; s++) targets.push(Math.max(1, Math.min(maxCap, Math.round((N * weights[s]) / wsum))));
    let diff = N - targets.reduce((a, b) => a + b, 0);
    let guard = 5000;
    while (diff !== 0 && guard-- > 0) {
      const s = (rng() * S) | 0;
      if (diff > 0 && targets[s] < maxCap) { targets[s]++; diff--; }
      else if (diff < 0 && targets[s] > 1) { targets[s]--; diff++; }
    }
    if (diff !== 0) return null;

    const owner = new Int32Array(N).fill(-1);
    const size = new Array(S).fill(1);
    const frontier = springs.map((s) => [s]);
    for (let s = 0; s < S; s++) owner[springs[s]] = s;
    let unclaimed = N - S;

    const hasRoom = (cell) => {
      for (let d = 0; d < 4; d++) { const t = step(n, cell, d); if (t >= 0 && owner[t] < 0) return true; }
      return false;
    };

    while (unclaimed > 0) {
      const active = [];
      for (let s = 0; s < S; s++) if (size[s] < targets[s] && frontier[s].some(hasRoom)) active.push(s);

      if (active.length === 0) {
        // Every remaining pocket is enclosed: hand it to a random neighbour basin.
        const cand = [];
        for (let i = 0; i < N; i++) {
          if (owner[i] >= 0) continue;
          for (let d = 0; d < 4; d++) {
            const t = step(n, i, d);
            if (t >= 0 && owner[t] >= 0) { cand.push([i, owner[t]]); break; }
          }
        }
        if (!cand.length) return null;
        const pick = cand[(rng() * cand.length) | 0];
        owner[pick[0]] = pick[1];
        size[pick[1]]++;
        targets[pick[1]] = Math.max(targets[pick[1]], size[pick[1]]);
        frontier[pick[1]].push(pick[0]);
        unclaimed--;
        continue;
      }

      const b = active[(rng() * active.length) | 0];
      if (rng() < 0.15) frontier[b] = frontier[b].filter(hasRoom);
      const fl = frontier[b];
      if (!fl.length) continue;

      const base = (rng() * fl.length) | 0;
      let found = -1;
      for (let p = 0; p < fl.length; p++) {
        const cand2 = fl[(base + p) % fl.length];
        if (hasRoom(cand2)) { found = cand2; break; }
      }
      if (found < 0) { frontier[b] = []; continue; }

      const opts = [];
      for (let d = 0; d < 4; d++) {
        const t = step(n, found, d);
        if (t >= 0 && owner[t] < 0) opts.push(t);
      }
      const cell = opts[(rng() * opts.length) | 0];
      owner[cell] = b;
      size[b]++;
      frontier[b].push(cell);
      unclaimed--;
    }

    // Orient arrows along a BFS tree of each basin, pointing upstream.
    const dirs = new Int8Array(N).fill(-1);
    for (let s = 0; s < S; s++) {
      const seen = new Uint8Array(N);
      seen[springs[s]] = 1;
      const q = [springs[s]];
      for (let h = 0; h < q.length; h++) {
        const cur = q[h];
        for (let d = 0; d < 4; d++) {
          const t = step(n, cur, d);
          if (t < 0 || seen[t] || owner[t] !== s) continue;
          seen[t] = 1;
          dirs[t] = (d + 2) % 4; // neighbour points back to cur
          q.push(t);
        }
      }
    }
    return { springs, caps: size.slice(), dirs };
  }

  function carve(sol, n, keepRatio, rng, deadline) {
    const N = n * n;
    const poolAt = new Array(N).fill(-1);
    for (let s = 0; s < sol.springs.length; s++) poolAt[sol.springs[s]] = s;
    const givens = Array.from(sol.dirs);
    const free = [];
    for (let i = 0; i < N; i++) if (poolAt[i] < 0) free.push(i);
    shuffle(free, rng);
    const floor = Math.max(0, Math.round(keepRatio * free.length));
    let givenCount = free.length;
    const pz = { n, poolAt, caps: sol.caps.slice(), givens };
    for (let k = 0; k < free.length; k++) {
      if (givenCount <= floor) break;
      if (deadline && Date.now() > deadline) break;
      const c = free[k];
      const d = givens[c];
      givens[c] = -1;
      if (countSolutionsFast(pz, 2) === 1) givenCount--;
      else givens[c] = d;
    }
    return pz;
  }

  function generate(difficulty, seed) {
    const preset = typeof difficulty === 'string' ? PRESETS[difficulty] : difficulty;
    const { n, springs, keep } = preset;
    if (seed == null) seed = (Math.random() * 0x7fffffff) | 0;
    const rng = mulberry32(seed >>> 0);
    const start = Date.now();
    const TOTAL_MS = 5000;

    for (let attempt = 0; attempt < 80; attempt++) {
      if (Date.now() > start + TOTAL_MS) break;
      const springCount = Math.max(2, springs - (attempt > 40 ? 2 : attempt > 20 ? 1 : 0));
      const sol = generateSolution(n, springCount, rng);
      if (!sol) continue;
      // fresh carving budget per attempt so slow checks on one layout can
      // never starve the next into returning a fully-given board
      const pz = carve(sol, n, keep, rng, Date.now() + 1800);
      if (countSolutionsFast(pz, 2) !== 1) continue;
      const solution = Array.from(sol.dirs);
      const startDirs = Array.from(pz.givens);
      if (isWin(n, startDirs, pz.poolAt, pz.caps)) continue; // nothing left to solve
      if (!isWin(n, solution, pz.poolAt, pz.caps)) continue;
      return {
        n,
        pools: sol.springs.map((cell, i) => ({ cell, cap: pz.caps[i] })),
        poolAt: pz.poolAt,
        caps: pz.caps,
        givens: pz.givens,
        solution,
        seed,
        difficulty: typeof difficulty === 'string' ? difficulty : 'custom',
      };
    }
    return null;
  }

  return {
    PRESETS, DR, DC, CW_ORDER, CCW_ORDER,
    mulberry32, step, domainOf, analyze, isWin,
    countSolutions, countSolutionsFast, generate,
  };
});
