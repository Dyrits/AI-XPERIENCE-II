(function () {
  'use strict';

  const M = window.Mothlight;
  const $ = (sel) => document.querySelector(sel);
  const STORE_KEY = 'mothlight.v1';
  const DIR_NAMES = ['up', 'right', 'down', 'left'];
  const KEY_DIRS = { w: 0, d: 1, s: 2, a: 3 };
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = {
    board: $('#board'),
    trails: $('#trails'),
    loading: $('#loading'),
    message: $('#message'),
    litCount: $('#lit-count'),
    lampTotal: $('#lamp-total'),
    modeLabel: $('#mode-label'),
    timer: $('#timer'),
    chips: [...document.querySelectorAll('.chip')],
    daily: $('#btn-daily'),
    dailySub: $('#daily-sub'),
    undo: $('#btn-undo'),
    redo: $('#btn-redo'),
    hint: $('#btn-hint'),
    restart: $('#btn-restart'),
    newBtn: $('#btn-new'),
    trailsBtn: $('#btn-trails'),
    soundBtn: $('#btn-sound'),
    helpBtn: $('#btn-help'),
    helpModal: $('#help-modal'),
    winModal: $('#win-modal'),
    stats: $('#stats'),
    toast: $('#toast'),
  };

  const state = {
    puzzle: null,
    mode: 'random',        // 'random' | 'daily'
    difficulty: 'medium',
    dailyDate: null,
    dirs: [],
    angles: [],
    history: [],
    future: [],
    hints: 0,
    solved: false,
    elapsed: 0,
    tStart: 0,
    running: false,
    cursor: 0,
    prevLit: [],
  };
  let prefs = { trails: true, sound: true, seenHelp: false };
  let stats = { solved: {}, best: {}, daily: { last: null, streak: 0, done: [] } };
  let cells = [], lampEls = [], mothEls = [], lineEls = [];

  /* ---------------- Persistence ---------------- */

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!data) return null;
      prefs = Object.assign(prefs, data.prefs);
      stats = Object.assign(stats, data.stats);
      stats.daily = Object.assign({ last: null, streak: 0, done: [] }, stats.daily);
      return data.game || null;
    } catch (e) {
      return null;
    }
  }

  function save() {
    if (!state.puzzle) return;
    const p = state.puzzle;
    const game = {
      puzzle: { difficulty: p.difficulty, seed: p.seed, size: p.size, lampCells: p.lampCells, nums: p.nums, solution: p.solution, givens: p.givens },
      mode: state.mode,
      difficulty: state.difficulty,
      dailyDate: state.dailyDate,
      dirs: state.dirs,
      history: state.history.slice(-300),
      hints: state.hints,
      solved: state.solved,
      elapsed: currentElapsed(),
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ prefs, stats, game }));
    } catch (e) { /* storage full or disabled: play on */ }
  }

  /* ---------------- Sound ---------------- */

  const Sound = {
    ctx: null,
    ensure() {
      if (!prefs.sound) return null;
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, { dur = 0.35, type = 'sine', vol = 0.05, when = 0 } = {}) {
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    },
    flutter() { this.tone(1400 + Math.random() * 300, { dur: 0.05, type: 'triangle', vol: 0.018 }); },
    lit(step) {
      const f = NOTES[Math.min(step, NOTES.length - 1)];
      this.tone(f, { dur: 0.6, vol: 0.05 });
      this.tone(f * 2, { dur: 0.4, vol: 0.012, when: 0.02 });
    },
    over() { this.tone(160, { dur: 0.16, type: 'sawtooth', vol: 0.02 }); },
    win() {
      [0, 2, 4, 5, 7, 9].forEach((n, i) => this.tone(NOTES[n], { dur: 0.9, vol: 0.045, when: i * 0.09 }));
    },
  };

  /* ---------------- Timer ---------------- */

  function currentElapsed() {
    return state.running ? performance.now() - state.tStart : state.elapsed;
  }
  function startTimer() {
    if (state.running || state.solved) return;
    state.tStart = performance.now() - state.elapsed;
    state.running = true;
  }
  function stopTimer() {
    if (!state.running) return;
    state.elapsed = performance.now() - state.tStart;
    state.running = false;
  }
  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
  }
  setInterval(() => { el.timer.textContent = fmtTime(currentElapsed()); }, 250);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopTimer(); save(); } else if (state.puzzle && !state.solved && !anyModalOpen()) startTimer();
  });

  /* ---------------- Rendering ---------------- */

  function svgEl(tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function mothNode() {
    const fly = document.createElement('div');
    fly.className = 'moth-fly';
    const rot = document.createElement('div');
    rot.className = 'moth-rot';
    const svg = svgEl('svg', { 'aria-hidden': 'true' });
    svg.appendChild(svgEl('use', { href: '#moth' }));
    rot.appendChild(svg);
    fly.appendChild(rot);
    return fly;
  }

  function lampNode(n) {
    const core = document.createElement('div');
    core.className = 'lamp-core';
    const pips = svgEl('svg', { class: 'pips', viewBox: '-50 -50 100 100', 'aria-hidden': 'true' });
    const r = n <= 6 ? 4.4 : n <= 10 ? 3.6 : 2.8;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      pips.appendChild(svgEl('circle', { cx: (Math.cos(a) * 46).toFixed(2), cy: (Math.sin(a) * 46).toFixed(2), r }));
    }
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = n;
    core.append(pips, num);
    return core;
  }

  function buildBoard() {
    const { board, nums, givens } = state.puzzle;
    const S = board.size;
    const givenSet = new Set(givens);
    el.board.style.setProperty('--n', S);
    el.board.classList.remove('solved');
    el.board.innerHTML = '';
    el.trails.innerHTML = '';
    el.trails.setAttribute('viewBox', `0 0 ${S} ${S}`);
    cells = []; lampEls = []; mothEls = []; lineEls = [];

    for (let idx = 0; idx < S * S; idx++) {
      const l = board.lampAt[idx];
      let cell;
      if (l >= 0) {
        cell = document.createElement('div');
        cell.className = 'cell lamp';
        cell.dataset.lamp = l;
        cell.appendChild(lampNode(nums[l]));
        lampEls[l] = cell;
      } else {
        const m = board.mothAt[idx];
        cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell moth resting' + (givenSet.has(m) ? ' given' : '');
        cell.dataset.moth = m;
        cell.appendChild(mothNode());
        mothEls[m] = cell;
        const line = svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 0 });
        el.trails.appendChild(line);
        lineEls[m] = line;
      }
      cell.setAttribute('role', 'gridcell');
      cell.tabIndex = -1;
      cell.dataset.idx = idx;
      el.board.appendChild(cell);
      cells.push(cell);
    }
    el.trails.classList.toggle('off', !prefs.trails);
    el.lampTotal.textContent = nums.length;
    state.prevLit = nums.map(() => null);
    setCursor(Math.min(state.cursor, S * S - 1), false);
  }

  function lampTarget(m) {
    const d = state.dirs[m];
    return d >= 0 ? state.puzzle.board.moths[m].targets[d] : -1;
  }

  function render(flapped = []) {
    const { board, nums } = state.puzzle;
    const S = board.size;
    const counts = M.lampCounts(board, state.dirs);
    let lit = 0, anyOver = false, newlyLit = false, newlyOver = false;

    nums.forEach((n, l) => {
      const c = counts[l];
      const isLit = c === n, isOver = c > n;
      const node = lampEls[l];
      node.classList.toggle('lit', isLit);
      node.classList.toggle('over', isOver);
      node.style.setProperty('--heat', n ? Math.min(1, c / n).toFixed(2) : 0);
      node.querySelectorAll('.pips circle').forEach((p, i) => p.classList.toggle('on', i < c));
      node.setAttribute('aria-label', `Lamp ${n}: ${c} moth${c === 1 ? '' : 's'} arriving`);
      const prev = state.prevLit[l];
      if (prev !== null && isLit && prev !== 'lit') {
        newlyLit = true;
        node.classList.remove('just-lit');
        void node.offsetWidth;
        node.classList.add('just-lit');
      }
      if (prev !== null && isOver && prev !== 'over') newlyOver = true;
      state.prevLit[l] = isLit ? 'lit' : isOver ? 'over' : 'dim';
      if (isLit) lit++;
      if (isOver) anyOver = true;
    });

    board.moths.forEach((moth, m) => {
      const node = mothEls[m];
      const d = state.dirs[m];
      node.classList.toggle('resting', d < 0);
      node.querySelector('.moth-rot').style.transform = `rotate(${state.angles[m]}deg)`;
      node.setAttribute('aria-label', `Moth at row ${moth.r + 1}, column ${moth.c + 1}, ${d < 0 ? 'resting' : 'facing ' + DIR_NAMES[d]}${node.classList.contains('given') ? ', pinned' : ''}`);
      const line = lineEls[m];
      const t = lampTarget(m);
      if (t < 0) {
        line.style.display = 'none';
      } else {
        const li = board.lampCells[t];
        const [dr, dc] = M.DIRS[d];
        const x1 = moth.c + 0.5 + dc * 0.24, y1 = moth.r + 0.5 + dr * 0.24;
        const x2 = (li % S) + 0.5 - dc * 0.36, y2 = Math.floor(li / S) + 0.5 - dr * 0.36;
        line.style.display = '';
        line.setAttribute('x1', x1); line.setAttribute('y1', y1);
        line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      }
    });

    flapped.forEach((m) => {
      const node = mothEls[m];
      node.classList.remove('flap');
      void node.offsetWidth;
      node.classList.add('flap');
    });

    if (newlyLit) Sound.lit(lit - 1);
    else if (newlyOver) Sound.over();

    el.litCount.textContent = lit;
    el.undo.disabled = !state.history.length || state.solved;
    el.redo.disabled = !state.future.length || state.solved;
    el.hint.disabled = state.solved;

    const placed = state.dirs.filter((d) => d >= 0).length;
    const total = state.dirs.length;
    if (state.solved) setMessage('Every moth found its lamp.', 'good');
    else if (anyOver) setMessage('A lamp is crowded: too many moths are heading for it.', 'bad');
    else if (placed === total && lit < nums.length) setMessage('All moths are flying, but some lamps are still dark.', 'bad');
    else if (placed === 0) setMessage('Tap a moth to turn it toward a lamp.');
    else setMessage(`${placed} of ${total} moths in flight`);

    if (!state.solved && lit === nums.length && placed === total) onSolved();
  }

  function setMessage(text, tone = '') {
    el.message.textContent = text;
    el.message.className = 'message' + (tone ? ' ' + tone : '');
  }

  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.toast.classList.remove('show'), 1800);
  }

  /* ---------------- Moves ---------------- */

  function isLocked(m) {
    return state.solved || state.puzzle.givens.includes(m);
  }

  function applyDir(m, d) {
    const from = state.dirs[m];
    state.dirs[m] = d;
    if (d < 0) return;
    let cur = state.angles[m];
    if (from < 0) cur = Math.round(cur / 360) * 360;
    const delta = ((((d * 90 - cur) % 360) + 540) % 360) - 180;
    state.angles[m] = cur + delta;
  }

  function setDir(m, d, merge) {
    if (isLocked(m) || state.dirs[m] === d) return;
    const top = state.history[state.history.length - 1];
    if (merge && top && top.merge === merge && top.m === m) top.to = d;
    else state.history.push({ m, from: state.dirs[m], to: d, merge });
    state.future = [];
    applyDir(m, d);
    startTimer();
    Sound.flutter();
    render(d >= 0 ? [m] : []);
    save();
  }

  function cycle(m, step) {
    if (isLocked(m)) return;
    const list = [-1, ...state.puzzle.board.moths[m].options];
    const i = list.indexOf(state.dirs[m]);
    setDir(m, list[(i + step + list.length) % list.length]);
  }

  function aim(m, d, merge) {
    if (isLocked(m)) return;
    if (!state.puzzle.board.moths[m].options.includes(d)) {
      const node = mothEls[m];
      node.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
        { duration: 220 }
      );
      return;
    }
    setDir(m, d, merge);
  }

  function undo() {
    if (state.solved) return;
    const mv = state.history.pop();
    if (!mv) return;
    state.future.push(mv);
    applyDir(mv.m, mv.from);
    render(mv.from >= 0 ? [mv.m] : []);
    save();
  }

  function redo() {
    if (state.solved) return;
    const mv = state.future.pop();
    if (!mv) return;
    state.history.push(mv);
    applyDir(mv.m, mv.to);
    render(mv.to >= 0 ? [mv.m] : []);
    save();
  }

  function hint() {
    if (!state.puzzle || state.solved) return;
    const { solution } = state.puzzle;
    const wrong = [];
    state.dirs.forEach((d, m) => { if (d >= 0 && d !== solution[m]) wrong.push(m); });
    state.hints++;
    if (wrong.length) {
      wrong.forEach((m) => {
        mothEls[m].classList.add('wrong');
        setTimeout(() => mothEls[m] && mothEls[m].classList.remove('wrong'), 2400);
      });
      toast(wrong.length === 1 ? 'This moth is flying the wrong way' : `${wrong.length} moths are flying the wrong way`);
      save();
      return;
    }
    let m = M.findDeduction(state.puzzle, state.dirs);
    if (m < 0) {
      const open = state.dirs.map((d, i) => (d < 0 ? i : -1)).filter((i) => i >= 0);
      if (!open.length) return;
      m = open[Math.floor(Math.random() * open.length)];
    }
    setDir(m, solution[m]);
    const node = mothEls[m];
    node.classList.remove('hinted');
    void node.offsetWidth;
    node.classList.add('hinted');
    setCursor(state.puzzle.board.moths[m].idx, false);
  }

  function restart() {
    if (!state.puzzle || state.solved) return;
    const { solution, givens } = state.puzzle;
    state.puzzle.board.moths.forEach((_, m) => applyDir(m, givens.includes(m) ? solution[m] : -1));
    state.history = [];
    state.future = [];
    render();
    save();
    toast('Board cleared');
  }

  /* ---------------- Game lifecycle ---------------- */

  function todayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function setPuzzle(puzzle, restore) {
    state.puzzle = M.hydrate(puzzle);
    const n = state.puzzle.board.moths.length;
    state.dirs = new Array(n).fill(-1);
    state.angles = new Array(n).fill(0);
    state.puzzle.givens.forEach((g) => applyDir(g, state.puzzle.solution[g]));
    state.history = [];
    state.future = [];
    state.hints = 0;
    state.solved = false;
    state.elapsed = 0;
    state.running = false;
    state.cursor = 0;
    if (restore) {
      restore.dirs.forEach((d, m) => { if (d >= 0) applyDir(m, d); });
      state.history = restore.history || [];
      state.hints = restore.hints || 0;
      state.elapsed = restore.elapsed || 0;
      state.solved = !!restore.solved;
    }
    buildBoard();
    render();
    if (state.solved) el.board.classList.add('solved');
    updateChrome();
    if (!state.solved && !anyModalOpen()) startTimer();
    save();
  }

  function newGame(difficulty, mode = 'random') {
    stopTimer();
    state.difficulty = difficulty;
    state.mode = mode;
    state.dailyDate = mode === 'daily' ? todayKey() : null;
    updateChrome();
    el.loading.hidden = false;
    // Let the loading veil paint before the generator runs.
    setTimeout(() => {
      const seed = mode === 'daily'
        ? M.hashString('mothlight:' + state.dailyDate)
        : (crypto.getRandomValues(new Uint32Array(1))[0] >>> 0);
      const puzzle = M.generate(difficulty, seed);
      el.loading.hidden = true;
      setPuzzle(puzzle);
    }, 40);
  }

  function startDaily() {
    const key = todayKey();
    if (state.mode === 'daily' && state.dailyDate === key && state.puzzle) {
      toast(state.solved ? 'You already lit today’s lamps' : 'You’re playing the daily moth');
      return;
    }
    newGame('hard', 'daily');
  }

  function updateChrome() {
    el.chips.forEach((c) => c.setAttribute('aria-checked', String(state.mode === 'random' && c.dataset.diff === state.difficulty)));
    const isDaily = state.mode === 'daily';
    el.daily.classList.toggle('active', isDaily);
    const doneToday = stats.daily.done.includes(todayKey());
    el.daily.classList.toggle('done', doneToday);
    el.dailySub.textContent = doneToday
      ? `Solved today · ${stats.daily.streak}-day streak`
      : stats.daily.streak && stats.daily.last === todayKey(new Date(Date.now() - 864e5))
        ? `Keep your ${stats.daily.streak}-day streak going`
        : 'Same puzzle for everyone today';
    const label = M.DIFFICULTIES[state.difficulty].label;
    el.modeLabel.textContent = isDaily
      ? `Daily · ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : label;
    el.trailsBtn.setAttribute('aria-pressed', String(prefs.trails));
    el.soundBtn.setAttribute('aria-pressed', String(prefs.sound));
    el.soundBtn.querySelector('use').setAttribute('href', prefs.sound ? '#i-sound' : '#i-mute');
    renderStats();
  }

  function renderStats() {
    const total = Object.values(stats.solved).reduce((a, b) => a + b, 0);
    const best = stats.best[state.difficulty];
    el.stats.innerHTML = `
      <div class="stat"><b>${total}</b><span>Solved</span></div>
      <div class="stat"><b>${best ? fmtTime(best) : '—'}</b><span>Best ${M.DIFFICULTIES[state.difficulty].label}</span></div>
      <div class="stat"><b>${stats.daily.streak || 0}</b><span>Daily streak</span></div>`;
  }

  function onSolved() {
    state.solved = true;
    stopTimer();
    const time = state.elapsed;
    const diff = state.difficulty;
    stats.solved[diff] = (stats.solved[diff] || 0) + 1;
    const prevBest = stats.best[diff];
    const record = !prevBest || time < prevBest;
    if (record) stats.best[diff] = time;
    if (state.mode === 'daily') {
      const key = state.dailyDate;
      if (!stats.daily.done.includes(key)) {
        const yesterday = todayKey(new Date(new Date(key + 'T12:00:00').getTime() - 864e5));
        stats.daily.streak = stats.daily.last === yesterday ? stats.daily.streak + 1 : 1;
        stats.daily.last = key;
        stats.daily.done = stats.daily.done.concat(key).slice(-60);
      }
    }
    save();
    el.board.classList.add('solved');
    el.undo.disabled = el.redo.disabled = el.hint.disabled = true;
    celebrate().then(() => showWin(time, record, prevBest));
  }

  function showWin(time, record, prevBest) {
    $('#win-time').textContent = fmtTime(time);
    const bestEl = $('#win-best');
    bestEl.textContent = fmtTime(record ? time : prevBest);
    bestEl.classList.toggle('record', record);
    $('#win-hints').textContent = state.hints;
    const subs = [
      'All the moths made it home.',
      'The night hums with warm light.',
      'Not a single moth left in the dark.',
      'The lamps thank you, softly.',
    ];
    $('#win-sub').textContent = record && prevBest
      ? 'A new best time! The moths are impressed.'
      : state.mode === 'daily'
        ? `Daily moth solved · ${stats.daily.streak}-day streak`
        : subs[Math.floor(Math.random() * subs.length)];
    updateChrome();
    el.winModal.returnValue = '';
    el.winModal.showModal();
  }

  /* ---------------- Celebration ---------------- */

  function centerOf(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function sparks(x, y, count = 10, spread = 60) {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('div');
      s.className = 'spark';
      s.style.left = x - 3 + 'px';
      s.style.top = y - 3 + 'px';
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2;
      const dist = spread * (0.4 + Math.random() * 0.8);
      s.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist + 20}px) scale(0.2)`, opacity: 0 },
        ],
        { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }
      ).onfinish = () => s.remove();
    }
  }

  function celebrate() {
    Sound.win();
    if (reducedMotion) return new Promise((r) => setTimeout(r, 300));
    const { board } = state.puzzle;
    const order = board.moths.map((_, m) => m).sort(() => Math.random() - 0.5);
    const flights = [];
    order.forEach((m, i) => {
      const t = lampTarget(m);
      if (t < 0) return;
      const fly = mothEls[m].querySelector('.moth-fly');
      const a = centerOf(mothEls[m]);
      const b = centerOf(lampEls[t]);
      const dx = b.x - a.x, dy = b.y - a.y;
      const wobble = (Math.random() - 0.5) * 18;
      const anim = fly.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${dx * 0.55 - dy * 0.08 + wobble}px, ${dy * 0.55 + dx * 0.08 - wobble}px) scale(0.85)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0 },
        ],
        { duration: 820, delay: i * 55, easing: 'cubic-bezier(.45,0,.7,.2)', fill: 'forwards' }
      );
      flights.push(anim);
      anim.finished.then(() => {
        const node = lampEls[t];
        node.classList.remove('flare');
        void node.offsetWidth;
        node.classList.add('flare');
        sparks(b.x, b.y, 4, 30);
      });
    });
    return Promise.all(flights.map((f) => f.finished)).then(() => {
      lampEls.forEach((node, i) => setTimeout(() => {
        const c = centerOf(node);
        sparks(c.x, c.y, 14, 90);
      }, i * 60));
      return new Promise((r) => setTimeout(() => {
        // Moths drift back so the finished board can be admired.
        flights.forEach((f) => f.cancel());
        mothEls.forEach((n) => n.querySelector('.moth-fly').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 }));
        r();
      }, 650));
    });
  }

  /* ---------------- Input ---------------- */

  let drag = null;
  let session = 0;

  el.board.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.moth');
    if (!cell) return;
    const m = +cell.dataset.moth;
    setCursor(+cell.dataset.idx, false);
    Sound.ensure();
    if (e.button === 2) { e.preventDefault(); cycle(m, -1); return; }
    if (e.button !== 0) return;
    drag = { m, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, long: false, merge: ++session };
    drag.timer = setTimeout(() => {
      if (drag && !drag.moved && !isLocked(m)) {
        drag.long = true;
        setDir(m, -1);
        if (navigator.vibrate) navigator.vibrate(12);
      }
    }, 500);
    try { cell.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
  });

  el.board.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const threshold = Math.max(14, mothEls[drag.m].offsetWidth * 0.28);
    if (Math.hypot(dx, dy) < threshold) return;
    drag.moved = true;
    clearTimeout(drag.timer);
    const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    if (d !== drag.lastDir) {
      drag.lastDir = d;
      aim(drag.m, d, drag.merge);
    }
  });

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    clearTimeout(drag.timer);
    if (!cancelled && !drag.moved && !drag.long) cycle(drag.m, 1);
    drag = null;
  }
  el.board.addEventListener('pointerup', (e) => endDrag(e, false));
  el.board.addEventListener('pointercancel', (e) => endDrag(e, true));
  el.board.addEventListener('contextmenu', (e) => e.preventDefault());

  // Hover: show which moths can see a lamp, and which lamps a moth can reach.
  function clearHover() {
    cells.forEach((c) => c.classList.remove('sight', 'focus'));
    lineEls.forEach((l) => l.classList.remove('hot'));
  }
  el.board.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !state.puzzle) return;
    clearHover();
    const lamp = e.target.closest('.lamp');
    const moth = e.target.closest('.moth');
    const { board } = state.puzzle;
    if (lamp) {
      const l = +lamp.dataset.lamp;
      const links = board.lampLinks[l];
      for (let k = 0; k < links.length; k += 2) {
        const m = links[k];
        mothEls[m].classList.add('sight');
        if (state.dirs[m] === links[k + 1]) lineEls[m].classList.add('hot');
      }
      lamp.classList.add('focus');
    } else if (moth) {
      const m = +moth.dataset.moth;
      board.moths[m].targets.forEach((t) => { if (t >= 0) lampEls[t].classList.add('focus'); });
      lineEls[m].classList.add('hot');
    }
  });
  el.board.addEventListener('pointerleave', clearHover);

  function setCursor(idx, focus = true) {
    if (!cells.length) return;
    cells.forEach((c) => c.classList.remove('cursor'));
    cells[state.cursor] && (cells[state.cursor].tabIndex = -1);
    state.cursor = idx;
    const c = cells[idx];
    c.tabIndex = 0;
    if (focus) { c.classList.add('cursor'); c.focus({ preventScroll: true }); }
  }

  function anyModalOpen() {
    return el.helpModal.open || el.winModal.open;
  }

  document.addEventListener('keydown', (e) => {
    if (anyModalOpen() || !state.puzzle) return;
    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if (mod && key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && key === 'y') { e.preventDefault(); redo(); return; }
    if (mod || e.altKey) return;
    const S = state.puzzle.size;
    const r = Math.floor(state.cursor / S), c = state.cursor % S;
    const m = state.puzzle.board.mothAt[state.cursor];
    const onBoard = el.board.contains(document.activeElement) || document.activeElement === document.body;

    const moves = { arrowup: [-1, 0], arrowdown: [1, 0], arrowleft: [0, -1], arrowright: [0, 1] };
    if (moves[key]) {
      e.preventDefault();
      const [dr, dc] = moves[key];
      setCursor(((r + dr + S) % S) * S + ((c + dc + S) % S));
      return;
    }
    if (key in KEY_DIRS && m >= 0) { setCursor(state.cursor); aim(m, KEY_DIRS[key]); return; }
    if ((key === ' ' || key === 'enter') && onBoard && m >= 0) { e.preventDefault(); setCursor(state.cursor); cycle(m, e.shiftKey ? -1 : 1); return; }
    if ((key === 'backspace' || key === 'delete' || key === 'x' || key === '0') && m >= 0) { e.preventDefault(); setDir(m, -1); return; }
    if (key === 'z') undo();
    else if (key === 'y') redo();
    else if (key === 'h') hint();
    else if (key === 'n') newGame(state.difficulty);
    else if (key === 't') toggleTrails();
    else if (key === 'm') toggleSound();
    else if (key === '?' || key === '/') openHelp();
  });

  /* ---------------- Controls ---------------- */

  function toggleTrails() {
    prefs.trails = !prefs.trails;
    el.trails.classList.toggle('off', !prefs.trails);
    updateChrome();
    save();
    toast(prefs.trails ? 'Flight paths on' : 'Flight paths off');
  }
  function toggleSound() {
    prefs.sound = !prefs.sound;
    updateChrome();
    save();
    if (prefs.sound) Sound.lit(4);
  }
  function openHelp() {
    stopTimer();
    el.helpModal.showModal();
  }

  el.chips.forEach((chip) => chip.addEventListener('click', () => newGame(chip.dataset.diff)));
  el.daily.addEventListener('click', startDaily);
  el.undo.addEventListener('click', undo);
  el.redo.addEventListener('click', redo);
  el.hint.addEventListener('click', hint);
  el.restart.addEventListener('click', restart);
  el.newBtn.addEventListener('click', () => newGame(state.mode === 'daily' ? 'hard' : state.difficulty));
  el.trailsBtn.addEventListener('click', toggleTrails);
  el.soundBtn.addEventListener('click', toggleSound);
  el.helpBtn.addEventListener('click', openHelp);

  el.helpModal.addEventListener('close', () => {
    if (!prefs.seenHelp) { prefs.seenHelp = true; save(); }
    if (state.puzzle && !state.solved) startTimer();
  });
  el.winModal.addEventListener('close', () => {
    if (el.winModal.returnValue === 'next') newGame(state.mode === 'daily' ? 'hard' : state.difficulty);
  });
  // Click on the backdrop closes dialogs.
  [el.helpModal, el.winModal].forEach((dlg) => dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  }));

  /* ---------------- How-to illustrations ---------------- */

  // Each example: cols, rows, cells left-to-right; 'L<n>' lamp, '^>v<' moth, '.' resting moth.
  const EXAMPLES = {
    aim: { cols: 4, cells: ['>', '>', 'L3', '<'] },
    block: { cols: 4, cells: ['>', 'L1', 'L0', '.'] },
    count: { cols: 3, cells: ['L2', 'v', '<', '>', 'L3', '<', '^', '>', 'L1'] },
  };
  const ARROWS = { '^': 0, '>': 1, v: 2, '<': 3 };

  function buildExamples() {
    document.querySelectorAll('.rule-art').forEach((host) => {
      const ex = EXAMPLES[host.dataset.example];
      const mini = document.createElement('div');
      mini.className = 'mini';
      mini.style.setProperty('--cols', ex.cols);
      ex.cells.forEach((code) => {
        const cell = document.createElement('div');
        if (code[0] === 'L') {
          cell.className = 'cell lamp lit';
          cell.appendChild(lampNode(+code.slice(1)));
          cell.querySelectorAll('.pips circle').forEach((p) => p.classList.add('on'));
        } else {
          cell.className = 'cell moth' + (code === '.' ? ' resting' : '');
          const node = mothNode();
          if (code !== '.') node.querySelector('.moth-rot').style.transform = `rotate(${ARROWS[code] * 90}deg)`;
          cell.appendChild(node);
        }
        mini.appendChild(cell);
      });
      host.appendChild(mini);
    });
  }

  /* ---------------- Boot ---------------- */

  function boot() {
    const saved = load();
    buildExamples();
    if (saved && saved.puzzle) {
      state.mode = saved.mode || 'random';
      state.difficulty = saved.difficulty || 'medium';
      state.dailyDate = saved.dailyDate || null;
      // A stale daily from a previous day becomes a regular game.
      if (state.mode === 'daily' && state.dailyDate !== todayKey()) state.mode = 'random';
      setPuzzle(saved.puzzle, saved);
    } else {
      newGame('easy');
    }
    if (!prefs.seenHelp) openHelp();
    updateChrome();
  }

  boot();
})();
