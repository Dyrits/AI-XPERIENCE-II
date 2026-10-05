/*
 * Conflux sound — tiny WebAudio synth. All calls are safe before the first
 * user gesture; the context spins up lazily and resumes on demand.
 */
(function (root) {
  'use strict';

  let ctx = null;
  let master = null;
  let muted = false;

  // C-major pentatonic across two octaves: the board plays in key.
  const SCALE = [
    261.63, 293.66, 329.63, 392.0, 440.0,
    523.25, 587.33, 659.25, 784.0, 880.0,
  ];

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    return true;
  }

  function tone(freq, t0, dur, { type = 'sine', vol = 0.14, glide = 0 } = {}) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  const api = {
    unlock() { ensure(); },

    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 1;
    },

    // Rotate: musical plink, pitch keyed to the cell's position.
    plink(cellIdx, n) {
      if (!ensure()) return;
      const r = (cellIdx / n) | 0, c = cellIdx % n;
      const deg = (r * 2 + c * 3) % SCALE.length;
      tone(SCALE[deg], ctx.currentTime, 0.16, { type: 'triangle', vol: 0.1 });
    },

    // A pool's ring lands exactly on its number.
    settle() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      tone(SCALE[2], t, 0.5, { type: 'sine', vol: 0.1 });
      tone(SCALE[4], t + 0.07, 0.55, { type: 'sine', vol: 0.09 });
      tone(SCALE[7], t + 0.15, 0.6, { type: 'sine', vol: 0.07 });
    },

    // Carved slope refuses to move.
    thud() {
      if (!ensure()) return;
      tone(110, ctx.currentTime, 0.18, { type: 'sine', vol: 0.07, glide: 0.6 });
    },

    tick() {
      if (!ensure()) return;
      tone(SCALE[0] * 2, ctx.currentTime, 0.06, { type: 'sine', vol: 0.045 });
    },

    win() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      [0, 2, 4, 5, 7].forEach((deg, i) => {
        tone(SCALE[deg], t + i * 0.11, 0.7, { type: 'triangle', vol: 0.09 });
      });
      // soft pad underneath
      tone(SCALE[0] / 2, t + 0.1, 1.8, { type: 'sine', vol: 0.05 });
      tone(SCALE[4] / 2, t + 0.1, 1.8, { type: 'sine', vol: 0.045 });
    },
  };

  root.ConfluxSound = api;
})(typeof self !== 'undefined' ? self : this);
