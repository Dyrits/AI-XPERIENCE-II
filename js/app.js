/*
 * Conflux app — board rendering, interaction, effects, persistence.
 */
(function () {
  'use strict';

  const E = window.ConfluxEngine;
  const S = window.ConfluxSound;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---------------- dom ---------------- */

  const $ = (id) => document.getElementById(id);
  const boardSvg = $('board');
  const boardWrap = $('board-wrap');
  const veil = $('veil');
  const statusLine = $('status-line');
  const statTime = $('stat-time');
  const statMoves = $('stat-moves');
  const statBest = $('stat-best');
  const dlgHelp = $('dlg-help');
  const dlgWin = $('dlg-win');
  const toastEl = $('toast');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- palette ---------------- */

  // Hues interleaved so neighbouring pools always read apart.
  const POOL_HUES = [189, 320, 95, 255, 35, 165, 345, 215, 140, 275, 20, 205];

  function poolPalette(count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const h = POOL_HUES[i % POOL_HUES.length];
      out.push({
        bright: `hsl(${h}, 74%, 74%)`,
        tint: `hsla(${h}, 70%, 66%, 0.16)`,
        tintStrong: `hsla(${h}, 74%, 68%, 0.30)`,
      });
    }
    return out;
  }

  /* ---------------- state ---------------- */

  const SAVE_KEY = 'conflux.save.v1';
  const BEST_KEY = 'conflux.best.v1';
  const MUTE_KEY = 'conflux.muted.v1';
  const SEEN_KEY = 'conflux.seen-help.v1';

  const state = {
    difficulty: 'gentle',
    puzzle: null,       // { n, poolAt, caps, givens, solution }
    palette: [],
    dirs: null,
    hinted: null,       // Uint8Array
    els: null,          // board element bundles
    moves: 0,
    hints: 0,
    elapsed: 0,
    lastTick: 0,
    running: false,
    won: false,
    sel: -1,
    undoStack: [],
    settledChime: new Set(),
  };

  let muted = false;
  let bestTimes = {};
  try { bestTimes = JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch { bestTimes = {}; }

  /* ---------------- utils ---------------- */

  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  function fmtTime(sec) {
    sec = Math.floor(sec);
    const m = (sec / 60) | 0, s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ---------------- board rendering ---------------- */

  // Builds the svg for a puzzle. Slopes get a rotating pair of chevrons
  // (drawn pointing north); pools get a disc, a capacity number and a
  // progress ring. Returns element bundles for later updates.
  function renderBoard(svg, puzzle, palette) {
    const { n, poolAt } = puzzle;
    svg.innerHTML = '';
    const cells = [], flows = [], pools = [];

    const pad = 0.35;
    svg.setAttribute('viewBox', `${-pad} ${-pad} ${n + pad * 2} ${n + pad * 2}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const g = svgEl('g', { class: 'cell', 'data-i': i }, svg);
        cells[i] = g;

        svgEl('rect', {
          class: 'tile',
          x: c + 0.055, y: r + 0.055, width: 0.89, height: 0.89, rx: 0.14,
        }, g);

        if (poolAt[i] >= 0) {
          g.classList.add('pool');
          const p = poolAt[i];
          const cx = c + 0.5, cy = r + 0.5;
          const ringR = 0.365;
          const circ = 2 * Math.PI * ringR;
          svgEl('circle', { class: 'ring-track', cx, cy, r: ringR }, g);
          const prog = svgEl('circle', {
            class: 'ring-prog', cx, cy, r: ringR,
            'stroke-dasharray': circ.toFixed(3), 'stroke-dashoffset': circ.toFixed(3),
            stroke: palette[p].bright,
          }, g);
          const disc = svgEl('circle', { class: 'pool-disc', cx, cy, r: 0.29 }, g);
          const num = svgEl('text', { class: 'cap-num', x: cx, y: cy + 0.02, 'font-size': 0.38 }, g);
          num.textContent = puzzle.caps[p];
          pools[p] = { prog, disc, num };
        } else {
          const fg = svgEl('g', {
            class: 'flow-group',
            transform: `rotate(0 ${c + 0.5} ${r + 0.5})`,
          }, g);
          svgEl('path', {
            class: 'arrow-path arrow-echo',
            d: `M ${c + 0.335} ${r + 0.66} L ${c + 0.5} ${r + 0.47} L ${c + 0.665} ${r + 0.66}`,
          }, fg);
          svgEl('path', {
            class: 'arrow-path arrow-main',
            d: `M ${c + 0.34} ${r + 0.48} L ${c + 0.5} ${r + 0.26} L ${c + 0.66} ${r + 0.48}`,
          }, fg);
          flows[i] = fg;
        }
      }
    }
    return { cells, flows, pools };
  }

  // Pushes live state into a rendered board: tints, arrow classes and
  // rotation, ring progress, loop/overfull highlights.
  function applyUpdate(puzzle, dirs, hinted, els, palette) {
    const { n, poolAt, caps, givens } = puzzle;
    const a = E.analyze(n, dirs, poolAt);
    const N = n * n;
    let overfull = 0, loops = 0, settled = 0;

    for (let i = 0; i < N; i++) {
      const g = els.cells[i];
      const r = (i / n) | 0, c = i % n;

      if (poolAt[i] >= 0) {
        const p = poolAt[i];
        const bundle = els.pools[p];
        const count = a.counts[p], cap = caps[p];
        const ringR = 0.365, circ = 2 * Math.PI * ringR;
        const over = count > cap, full = count === cap;
        if (over) overfull++;
        if (full && !over) settled++;
        bundle.prog.setAttribute('stroke-dashoffset', (circ * (1 - Math.min(count, cap) / cap)).toFixed(3));
        bundle.prog.setAttribute('stroke', over ? 'var(--bad)' : palette[p].bright);
        bundle.disc.setAttribute('stroke', full && !over ? palette[p].bright : 'rgba(242,232,213,0.16)');
        bundle.disc.setAttribute('stroke-width', full && !over ? 0.05 : 0.03);
        g.classList.toggle('over', over);
        g.classList.toggle('settled', full && !over);
      } else {
        const fg = els.flows[i];
        fg.setAttribute('transform', `rotate(${(dirs[i] < 0 ? 0 : dirs[i]) * 90} ${c + 0.5} ${r + 0.5})`);
        const isGiven = givens && givens[i] >= 0;
        g.classList.toggle('empty', dirs[i] < 0);
        g.classList.toggle('has-given', !!isGiven);
        g.classList.toggle('has-hint', !isGiven && !!hinted && !!hinted[i]);
        g.classList.toggle('has-user', dirs[i] >= 0 && !isGiven && !(hinted && hinted[i]));
        const isLoop = !!a.loops[i] && dirs[i] >= 0;
        if (isLoop) loops++;
        g.classList.toggle('loop', isLoop);

        const b = a.basin[i];
        const tile = g.querySelector('.tile');
        if (b >= 0 && !isLoop) {
          tile.style.fill = a.counts[b] === caps[b] ? palette[b].tintStrong : palette[b].tint;
        } else {
          tile.style.fill = '';
        }
      }
    }
    return { overfull, loops, settled, counts: a.counts, basin: a.basin };
  }

  /* ---------------- main board updates ---------------- */

  function updateBoard() {
    const res = applyUpdate(state.puzzle, state.dirs, state.hinted, state.els, state.palette);
    for (let i = 0; i < state.els.cells.length; i++) {
      state.els.cells[i].classList.toggle('sel', state.sel === i);
    }

    // pool-settled chime (each ring landing exactly on its number)
    for (let p = 0; p < state.puzzle.caps.length; p++) {
      if (res.counts[p] === state.puzzle.caps[p] && !state.settledChime.has(p)) {
        state.settledChime.add(p);
        S.settle();
      } else if (res.counts[p] !== state.puzzle.caps[p] && state.settledChime.has(p)) {
        state.settledChime.delete(p);
      }
    }

    if (state.won) setStatus('the watershed settles — every pool exactly full');
    else if (res.overfull) setStatus('a pool is overfull — turn some water away');
    else if (res.loops) setStatus('water is chasing its own tail — break the loop');
    else if (res.settled === state.puzzle.caps.length) setStatus(`all ${state.puzzle.caps.length} rings are full — connect the rest of the rain`);
    else setStatus('tap a slope to turn its arrow · long-press to turn it back');
  }

  function setStatus(msg) { statusLine.textContent = msg; }

  /* ---------------- gameplay ---------------- */

  function domainOfCell(i) {
    const { n } = state.puzzle;
    const r = (i / n) | 0, c = i % n;
    const out = [];
    if (r > 0) out.push(0);
    if (c < n - 1) out.push(1);
    if (r < n - 1) out.push(2);
    if (c > 0) out.push(3);
    return out;
  }

  function rotateCell(i, ccw) {
    const { poolAt, givens } = state.puzzle;
    if (state.won || poolAt[i] >= 0) return false;
    if (givens[i] >= 0) { S.thud(); return false; }

    const dom = domainOfCell(i);
    const cur = state.dirs[i];
    let next;
    if (cur < 0) next = dom[ccw ? dom.length - 1 : 0];
    else {
      const k = dom.indexOf(cur);
      next = dom[(k + (ccw ? dom.length - 1 : 1)) % dom.length];
    }
    applyDir(i, next);
    return true;
  }

  function applyDir(i, dir) {
    state.undoStack.push({ i, from: state.dirs[i], hinted: !!state.hinted[i] });
    if (state.undoStack.length > 800) state.undoStack.shift();
    state.dirs[i] = dir;
    if (dir !== state.puzzle.solution[i]) state.hinted[i] = 0;
    state.moves++;
    S.plink(i, state.puzzle.n);
    refreshAfterMove();
  }

  function refreshAfterMove() {
    updateBoard();
    updateHud();
    saveGame();
    maybeCelebrate();
  }

  function maybeCelebrate() {
    const { n, poolAt, caps } = state.puzzle;
    if (!E.isWin(n, state.dirs, poolAt, caps)) return;
    state.won = true;
    state.running = false;
    updateBoard();
    setTimeout(() => S.win(), 400);
    startDroplets();
    const isRecord = !bestTimes[state.difficulty] || state.elapsed < bestTimes[state.difficulty];
    if (isRecord) {
      bestTimes[state.difficulty] = state.elapsed;
      try { localStorage.setItem(BEST_KEY, JSON.stringify(bestTimes)); } catch { }
    }
    updateHud();
    setTimeout(() => showWinDialog(isRecord), reducedMotion ? 200 : 1500);
    clearSave();
  }

  function showWinDialog(isRecord) {
    $('win-time').textContent = fmtTime(state.elapsed);
    $('win-moves').textContent = String(state.moves);
    $('win-hints').textContent = String(state.hints);
    $('win-sub').textContent = isRecord
      ? 'Fastest rain yet for this difficulty.'
      : 'Every pool exactly full.';
    const old = dlgWin.querySelector('.record-badge');
    if (old) old.remove();
    if (isRecord) {
      const badge = document.createElement('span');
      badge.className = 'record-badge';
      badge.textContent = 'new best';
      $('win-sub').after(badge);
    }
    if (!dlgWin.open) dlgWin.showModal();
  }

  function undo() {
    const entry = state.undoStack.pop();
    if (!entry) return;
    state.dirs[entry.i] = entry.from;
    state.hinted[entry.i] = entry.hinted ? 1 : 0;
    S.tick();
    refreshAfterMove();
  }

  function hint() {
    const { n, poolAt, givens, solution } = state.puzzle;
    if (state.won) return;
    const cands = [];
    for (let i = 0; i < n * n; i++) {
      if (poolAt[i] >= 0 || givens[i] >= 0) continue;
      if (state.dirs[i] !== solution[i]) cands.push(i);
    }
    if (!cands.length) { toast('nothing left to reveal — the board is yours to turn'); return; }
    const i = cands[(Math.random() * cands.length) | 0];
    state.undoStack.push({ i, from: state.dirs[i], hinted: !!state.hinted[i] });
    state.dirs[i] = solution[i];
    state.hinted[i] = 1;
    state.hints++;
    S.settle();
    refreshAfterMove();
    toast('one slope revealed — follow where it points');
  }

  /* ---------------- win droplets ---------------- */

  let fxRunning = false;

  function startDroplets() {
    if (reducedMotion) return;
    stopFx();
    const { n, dirs, poolAt } = state.puzzle;
    const fxLayer = svgEl('g', { class: 'fx' }, boardSvg);
    const drops = [];

    for (let i = 0; i < n * n; i++) {
      if (poolAt[i] >= 0) continue;
      const pts = [];
      let cur = i, guard = n * n + 1;
      while (cur >= 0 && poolAt[cur] < 0 && guard--) {
        pts.push([(cur % n) + 0.5, ((cur / n) | 0) + 0.5]);
        cur = E.step(n, cur, dirs[cur]);
      }
      if (cur < 0 || pts.length < 1) continue;
      const endCell = cur;
      pts.push([(cur % n) + 0.5, ((cur / n) | 0) + 0.5]);
      const color = state.palette[poolAt[endCell]].bright;
      const el = svgEl('circle', {
        class: 'droplet', r: 0.085, cx: pts[0][0], cy: pts[0][1], fill: color,
      }, fxLayer);
      drops.push({ pts, el, seg: 0, t: 0, delay: 260 + Math.random() * 2400, speed: 2.3 + Math.random() * 1.4 });
    }

    const splashes = [];
    function splash(x, y, color) {
      const el = svgEl('circle', { class: 'splash-ring', cx: x, cy: y, r: 0.2, stroke: color }, fxLayer);
      splashes.push({ el, t: 0 });
    }

    const deadline = performance.now() + 8200;
    let last = performance.now();
    fxRunning = true;

    function frame(t) {
      if (!fxRunning || t > deadline) {
        fxLayer.remove();
        fxRunning = false;
        return;
      }
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      for (const d of drops) {
        if (d.delay > 0) { d.delay -= dt * 1000; if (d.delay > 0) continue; }
        d.t += dt * d.speed;
        while (d.t >= 1 && d.seg < d.pts.length - 2) { d.t -= 1; d.seg++; }
        if (d.seg >= d.pts.length - 2 && d.t >= 1) {
          const end = d.pts[d.pts.length - 1];
          splash(end[0], end[1], d.el.getAttribute('fill'));
          d.seg = 0; d.t = 0;
          d.delay = 700 + Math.random() * 2600;
        } else {
          const [x0, y0] = d.pts[d.seg];
          const [x1, y1] = d.pts[d.seg + 1];
          d.el.setAttribute('cx', (x0 + (x1 - x0) * d.t).toFixed(3));
          d.el.setAttribute('cy', (y0 + (y1 - y0) * d.t).toFixed(3));
        }
      }
      for (let k = splashes.length - 1; k >= 0; k--) {
        const sp = splashes[k];
        sp.t += dt * 2.2;
        if (sp.t >= 1) { sp.el.remove(); splashes.splice(k, 1); continue; }
        sp.el.setAttribute('r', (0.2 + sp.t * 0.5).toFixed(3));
        sp.el.setAttribute('opacity', (0.85 * (1 - sp.t)).toFixed(3));
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function stopFx() { fxRunning = false; }

  /* ---------------- timer & hud ---------------- */

  setInterval(() => {
    const now = Date.now();
    const dt = state.lastTick ? (now - state.lastTick) / 1000 : 0;
    state.lastTick = now;
    if (state.running && !document.hidden && !state.won) {
      state.elapsed += dt;
      statTime.textContent = fmtTime(state.elapsed);
    }
  }, 500);

  function updateHud() {
    statTime.textContent = fmtTime(state.elapsed);
    statMoves.textContent = String(state.moves);
    const b = bestTimes[state.difficulty];
    statBest.textContent = b ? fmtTime(b) : '—';
    $('btn-undo').disabled = state.undoStack.length === 0;
  }

  /* ---------------- persistence ---------------- */

  function saveGame() {
    if (!state.puzzle || state.won) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        difficulty: state.difficulty,
        puzzle: state.puzzle,
        dirs: state.dirs,
        hinted: Array.from(state.hinted || []),
        moves: state.moves,
        hints: state.hints,
        elapsed: state.elapsed,
      }));
    } catch { }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch { }
  }

  function tryRestore() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s || !s.puzzle || !Array.isArray(s.dirs)) return false;
      const pz = s.puzzle;
      if (!pz.n || !Array.isArray(pz.givens) || !Array.isArray(pz.solution)) return false;
      if (E.isWin(pz.n, s.dirs, pz.poolAt, pz.caps)) return false;
      state.difficulty = s.difficulty in E.PRESETS ? s.difficulty : 'gentle';
      state.puzzle = pz;
      state.palette = poolPalette(pz.caps.length);
      state.dirs = s.dirs;
      state.hinted = new Uint8Array(pz.n * pz.n);
      if (Array.isArray(s.hinted)) {
        for (let i = 0; i < s.hinted.length && i < pz.n * pz.n; i++) state.hinted[i] = s.hinted[i];
      }
      state.moves = s.moves || 0;
      state.hints = s.hints || 0;
      state.elapsed = s.elapsed || 0;
      state.undoStack = [];
      return true;
    } catch { return false; }
  }

  /* ---------------- new puzzle ---------------- */

  function newPuzzle(difficulty) {
    stopFx();
    state.won = false;
    state.difficulty = difficulty;
    state.undoStack = [];
    state.moves = 0;
    state.hints = 0;
    state.elapsed = 0;
    state.sel = -1;
    state.settledChime = new Set();
    syncChips();
    veil.hidden = false;
    updateHud();
    // let the veil paint before the synchronous generation work
    requestAnimationFrame(() => setTimeout(() => {
      const pz = E.generate(difficulty);
      if (!pz) {
        setTimeout(() => newPuzzle(difficulty), 60);
        return;
      }
      state.puzzle = pz;
      state.palette = poolPalette(pz.caps.length);
      state.dirs = Array.from(pz.givens);
      state.hinted = new Uint8Array(pz.n * pz.n);
      state.els = renderBoard(boardSvg, pz, state.palette);
      updateBoard();
      updateHud();
      veil.hidden = true;
      state.running = true;
      state.lastTick = Date.now();
      saveGame();
    }, 30));
  }

  /* ---------------- help demo ---------------- */

  function buildDemo() {
    // Handcrafted solved 4x4: pools at (0,0)=6 and (3,3)=10.
    const n = 4;
    const puzzle = {
      n,
      poolAt: [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 1],
      caps: [6, 10],
      givens: null,
      solution: [],
    };
    const dirs = [
      -1, 3, 2, 2,   // (0,1)->W pool, (0,2)->S, (0,3)->S
      0, 3, 2, 2,    // (1,0)->N pool, (1,1)->W, (1,2)->S, (1,3)->S
      0, 1, 2, 2,    // (2,0)->N, (2,1)->E, (2,2)->S, (2,3)->S
      0, 1, 1, -1,   // (3,0)->N, (3,1)->E, (3,2)->E pool
    ];
    const holder = $('demo-board');
    const svg = svgEl('svg', { role: 'img', 'aria-label': 'Solved example: water flows to the two pools' });
    holder.innerHTML = '';
    holder.appendChild(svg);
    const palette = poolPalette(2);
    const els = renderBoard(svg, puzzle, palette);
    applyUpdate(puzzle, dirs, null, els, palette);
  }

  /* ---------------- input ---------------- */

  function cellFromEvent(evt) {
    const cell = evt.target.closest ? evt.target.closest('.cell') : null;
    if (!cell) return -1;
    const i = +cell.getAttribute('data-i');
    return Number.isNaN(i) ? -1 : i;
  }

  let pressTimer = null;
  let longFired = false;

  boardWrap.addEventListener('pointerdown', (evt) => {
    S.unlock();
    if (state.won || !state.puzzle || !veil.hidden) return;
    const i = cellFromEvent(evt);
    if (i < 0) return;
    longFired = false;
    clearTimeout(pressTimer);
    const cell = i;
    pressTimer = setTimeout(() => {
      longFired = true;
      if (rotateCell(cell, true) && navigator.vibrate) navigator.vibrate(8);
    }, 380);
  });

  boardWrap.addEventListener('pointerup', (evt) => {
    clearTimeout(pressTimer);
    if (state.won || !state.puzzle || !veil.hidden || longFired) return;
    const i = cellFromEvent(evt);
    if (i < 0) return;
    state.sel = i;
    rotateCell(i, false);
  });

  boardWrap.addEventListener('pointercancel', () => clearTimeout(pressTimer));

  boardWrap.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
    if (state.won || !state.puzzle || !veil.hidden) return;
    const i = cellFromEvent(evt);
    if (i >= 0) rotateCell(i, true);
  });

  boardWrap.addEventListener('keydown', (evt) => {
    if (!state.puzzle || state.won || !veil.hidden) return;
    const { n, poolAt } = state.puzzle;
    const key = evt.key;
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      evt.preventDefault();
      if (state.sel < 0) state.sel = firstSlope();
      else {
        let r = (state.sel / n) | 0, c = state.sel % n;
        if (key === 'ArrowUp') r = Math.max(0, r - 1);
        if (key === 'ArrowDown') r = Math.min(n - 1, r + 1);
        if (key === 'ArrowLeft') c = Math.max(0, c - 1);
        if (key === 'ArrowRight') c = Math.min(n - 1, c + 1);
        if (poolAt[r * n + c] < 0) state.sel = r * n + c;
      }
      updateBoard();
    } else if (key === ' ' || key === 'Enter') {
      evt.preventDefault();
      if (state.sel >= 0) rotateCell(state.sel, evt.shiftKey);
    } else if (key === 'h' || key === 'H') {
      evt.preventDefault(); hint();
    } else if (key === 'u' || key === 'U' || (key === 'z' && (evt.metaKey || evt.ctrlKey))) {
      evt.preventDefault(); undo();
    } else if (key === 'n' || key === 'N') {
      evt.preventDefault(); newPuzzle(state.difficulty);
    }
  });

  function firstSlope() {
    const { poolAt } = state.puzzle;
    for (let i = 0; i < poolAt.length; i++) if (poolAt[i] < 0) return i;
    return 0;
  }

  /* ---------------- wiring ---------------- */

  function syncChips() {
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.setAttribute('aria-checked', String(chip.dataset.diff === state.difficulty));
    });
  }

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.dataset.diff === state.difficulty) return;
      S.tick();
      newPuzzle(chip.dataset.diff);
    });
  });

  $('btn-new').addEventListener('click', () => { S.tick(); newPuzzle(state.difficulty); });
  $('btn-undo').addEventListener('click', undo);
  $('btn-hint').addEventListener('click', hint);
  $('btn-help').addEventListener('click', () => { S.tick(); buildDemo(); dlgHelp.showModal(); });
  $('btn-help-close').addEventListener('click', () => dlgHelp.close());
  $('btn-again').addEventListener('click', () => { dlgWin.close(); newPuzzle(state.difficulty); });
  $('btn-admire').addEventListener('click', () => dlgWin.close());

  const btnSound = $('btn-sound');
  function syncSound() {
    btnSound.setAttribute('aria-pressed', String(!muted));
    $('ic-sound-on').style.display = muted ? 'none' : '';
    $('ic-sound-off').style.display = muted ? '' : 'none';
    S.setMuted(muted);
  }
  btnSound.addEventListener('click', () => {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { }
    syncSound();
    if (!muted) S.tick();
  });

  document.addEventListener('visibilitychange', () => { state.lastTick = Date.now(); });

  /* ---------------- boot ---------------- */

  muted = (() => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
  })();
  syncSound();

  if (tryRestore()) {
    state.els = renderBoard(boardSvg, state.puzzle, state.palette);
    updateBoard();
    updateHud();
    state.running = true;
    state.lastTick = Date.now();
    toast('welcome back — the rain waited for you');
  } else {
    newPuzzle('gentle');
  }

  try {
    if (!localStorage.getItem(SEEN_KEY)) {
      localStorage.setItem(SEEN_KEY, '1');
      setTimeout(() => { buildDemo(); dlgHelp.showModal(); }, 600);
    }
  } catch { }
})();
