import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Flower2,
  Leaf,
  Lightbulb,
  MoveUpRight,
  RotateCcw,
  Shuffle,
  Sprout,
  Sun,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { createPuzzle, evaluateBoard, getDailySeed, getHint } from './game.js';

const STORAGE_KEY = 'petal-gardens-v1';
const SESSION_KEY = 'petal-active-garden-v1';
const initialBoard = (puzzle) =>
  Array.from({ length: 36 }, (_, i) => puzzle.givens[i] || 0);
const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

function Flower({
  className = '',
  color = 'currentColor',
  center = '#f7edc4',
}) {
  return (
    <svg
      className={`flower ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <g fill={color}>
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse
            key={angle}
            cx="32"
            cy="18"
            rx="10.5"
            ry="15.5"
            transform={`rotate(${angle} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="8.5" fill={center} />
    </svg>
  );
}

function GardenArt({ small = false }) {
  return (
    <svg
      className={small ? 'garden-art small' : 'garden-art'}
      viewBox="0 0 310 205"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M82 184C88 142 111 107 112 52M188 189C172 150 190 114 204 84M136 186C139 164 157 145 161 123"
        stroke="#839176"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M92 144C57 147 52 125 56 112C77 111 91 123 92 144Z"
        fill="#a5b393"
      />
      <path
        d="M103 112C126 114 143 100 141 84C119 82 105 96 103 112Z"
        fill="#c5cdb9"
      />
      <path
        d="M180 150C208 153 226 138 225 123C201 122 187 134 180 150Z"
        fill="#a5b393"
      />
      <path
        d="M179 163C154 165 145 150 145 138C163 136 179 145 179 163Z"
        fill="#c5cdb9"
      />
      <g transform="translate(77 14) rotate(10 35 35)">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse
            key={a}
            cx="35"
            cy="15"
            rx="14"
            ry="21"
            transform={`rotate(${a} 35 35)`}
            fill="#ab92c6"
          />
        ))}
        <circle cx="35" cy="35" r="12" fill="#f5e9b7" />
        <circle cx="32" cy="33" r="1.6" fill="#71643d" />
        <circle cx="39" cy="33" r="1.6" fill="#71643d" />
        <path
          d="M32 38Q35 41 39 38"
          stroke="#71643d"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(176 48) rotate(-12 30 30)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse
            key={a}
            cx="30"
            cy="14"
            rx="13"
            ry="18"
            transform={`rotate(${a} 30 30)`}
            fill="#e4aeb1"
          />
        ))}
        <circle cx="30" cy="30" r="10" fill="#f8edc2" />
        <circle cx="27" cy="29" r="1.5" fill="#71643d" />
        <circle cx="33" cy="29" r="1.5" fill="#71643d" />
        <path
          d="M27 33Q30 36 34 33"
          stroke="#71643d"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M50 185Q143 195 233 185"
        stroke="#d4dacb"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M250 43V55M244 49H256M46 70V79M41.5 74.5H50.5"
        stroke="#b3a4c2"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="258" cy="137" r="3" fill="#d6c99f" />
      <circle cx="153" cy="30" r="2" fill="#d6c99f" />
    </svg>
  );
}

function Rules({ detailed = false }) {
  return (
    <div className={`rules ${detailed ? 'detailed' : ''}`}>
      <div className="rule">
        <div className="rule-art pair-art">
          <span>
            <Flower />
          </span>
          <span>
            <Flower />
          </span>
        </div>
        <div>
          <h3>Flowers grow in pairs</h3>
          <p>
            Every flower needs exactly one neighbor, side by side or up and
            down.
          </p>
        </div>
      </div>
      <div className="rule">
        <div className="rule-art count-art">
          <b>2</b>
          <span>
            <Flower />
          </span>
          <span className="empty-mini" />
          <span>
            <Flower />
          </span>
          <ArrowRight size={13} />
        </div>
        <div>
          <h3>Follow the numbers</h3>
          <p>
            Each number tells you how many flowers belong in that row or column.
          </p>
        </div>
      </div>
      <div className="rule">
        <div className="rule-art separate-art">
          <span>
            <Flower />
          </span>
          <span>
            <Flower />
          </span>
          <i />
          <span>
            <Flower color="#dda4ac" />
          </span>
          <span>
            <Flower color="#dda4ac" />
          </span>
        </div>
        <div>
          <h3>Give each pair some space</h3>
          <p>
            Different pairs can't share an edge. Touching at the corners is
            okay.
          </p>
        </div>
      </div>
      {detailed && (
        <div className="given-explanation">
          <Leaf size={19} />
          <p>
            Small dots mark flowers already planted for you. Pebbles are fixed
            empty spaces. Neither can be changed.
          </p>
        </div>
      )}
    </div>
  );
}

function readSaved(puzzle) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')[
      puzzle.id
    ];
    if (
      saved?.board?.length === 36 &&
      saved.board.every(
        (v, i) =>
          [0, 1, -1].includes(v) &&
          (!puzzle.givens[i] || puzzle.givens[i] === v),
      )
    ) {
      return {
        board: saved.board,
        seconds:
          Number.isSafeInteger(saved.seconds) && saved.seconds >= 0
            ? saved.seconds
            : 0,
        hints:
          Number.isSafeInteger(saved.hints) && saved.hints >= 0
            ? saved.hints
            : 0,
      };
    }
  } catch {
    /* Storage is optional, including in private browsing. */
  }
  return { board: initialBoard(puzzle), seconds: 0, hints: 0 };
}

function readSession() {
  let mode = 'daily',
    difficulty = 'gentle',
    seed = getDailySeed();
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (
      saved &&
      ['daily', 'free'].includes(saved.mode) &&
      ['gentle', 'standard', 'tricky'].includes(saved.difficulty)
    ) {
      mode = saved.mode;
      difficulty = saved.difficulty;
      if (
        mode === 'free' &&
        typeof saved.seed === 'string' &&
        saved.seed.length < 120
      )
        seed = saved.seed;
      else mode = 'daily';
    }
  } catch {
    /* An unavailable or invalid save starts a fresh daily garden. */
  }
  const puzzle = createPuzzle(seed, difficulty);
  return { mode, difficulty, seed, puzzle, ...readSaved(puzzle) };
}

export default function App() {
  const [initial] = useState(readSession);
  const [mode, setMode] = useState(initial.mode);
  const [difficulty, setDifficulty] = useState(initial.difficulty);
  const [seed, setSeed] = useState(initial.seed);
  const [puzzle, setPuzzle] = useState(initial.puzzle);
  const [board, setBoard] = useState(initial.board);
  const [seconds, setSeconds] = useState(initial.seconds);
  const [hints, setHints] = useState(initial.hints);
  const [history, setHistory] = useState([]);
  const [tool, setTool] = useState('plant');
  const [modal, setModal] = useState(null);
  const [sound, setSound] = useState(false);
  const [toast, setToast] = useState('');
  const [checked, setChecked] = useState(false);
  const [hintCell, setHintCell] = useState(null);
  const [celebration, setCelebration] = useState(false);
  const [activeCell, setActiveCell] = useState(0);
  const audioRef = useRef(null);
  const toastTimer = useRef(null);
  const gridRef = useRef(null);
  const dialogRef = useRef(null);
  const result = evaluateBoard(puzzle, board);
  const total = puzzle.rows.reduce((a, b) => a + b, 0);
  const planted = board.filter((v) => v === 1).length;

  useEffect(() => {
    if (result.solved) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !modal)
        setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [result.solved, modal]);

  useEffect(() => {
    try {
      let all = {};
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
          all = parsed;
      } catch {
        /* Replace a corrupted save instead of losing future progress. */
      }
      delete all[puzzle.id];
      all[puzzle.id] = { board, seconds, hints };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Object.fromEntries(Object.entries(all).slice(-40))),
      );
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ mode, difficulty, seed }),
      );
    } catch {
      /* The game remains playable without local storage. */
    }
  }, [board, seconds, puzzle.id, hints, mode, difficulty, seed]);

  useEffect(() => {
    if (result.solved && celebration) setModal('complete');
  }, [result.solved, celebration]);

  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === 'Escape') setModal(null);
      if (e.key === 'Tab') {
        const elements = dialogRef.current?.querySelectorAll(
          'button, select, [href]',
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialogRef.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === dialogRef.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previous?.focus();
    };
  }, [modal]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4800);
  }

  function playNote(value) {
    if (!sound) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      ctx.resume();
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(value === 1 ? 660 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.055, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      /* Browsers without audio support still play normally. */
    }
  }

  function changeCell(index, mark = tool === 'mark') {
    if (puzzle.givens[index] || result.solved) return;
    const value = mark ? -1 : 1;
    setHistory((h) => [...h, board]);
    setBoard((b) =>
      b.map((v, i) => (i === index ? (v === value ? 0 : value) : v)),
    );
    setChecked(false);
    setHintCell(null);
    setCelebration(true);
    playNote(value);
  }

  function startPuzzle(nextMode, nextDifficulty = difficulty, fresh = false) {
    const seed =
      nextMode === 'daily'
        ? getDailySeed()
        : `free-${Date.now()}-${Math.random()}`;
    const next = createPuzzle(seed, nextDifficulty);
    const saved =
      nextMode === 'daily' && !fresh
        ? readSaved(next)
        : { board: initialBoard(next), seconds: 0, hints: 0 };
    setMode(nextMode);
    setDifficulty(nextDifficulty);
    setSeed(seed);
    setPuzzle(next);
    setBoard(saved.board);
    setSeconds(saved.seconds);
    setHints(saved.hints);
    setHistory([]);
    setChecked(false);
    setHintCell(null);
    setCelebration(false);
    setModal(null);
    setToast('');
  }

  function undo() {
    if (!history.length) return;
    setBoard(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setChecked(false);
    setHintCell(null);
    setCelebration(false);
  }

  function revealHint() {
    const hint = getHint(puzzle, board);
    if (!hint) {
      notify('Your garden is complete. Beautifully grown!');
      return;
    }
    setHistory((h) => [...h, board]);
    setBoard((b) => b.map((v, i) => (i === hint.index ? hint.value : v)));
    setHints((h) => h + 1);
    setHintCell(hint.index);
    setChecked(false);
    setCelebration(true);
    notify(
      `Row ${Math.floor(hint.index / 6) + 1}, column ${(hint.index % 6) + 1}. ${hint.message}`,
    );
  }

  function checkGarden() {
    setChecked(true);
    const wrong = board.filter(
      (v, i) => v !== 0 && v !== puzzle.solution[i] && !puzzle.givens[i],
    ).length;
    if (result.solved) setModal('complete');
    else if (wrong)
      notify(
        `${wrong} ${wrong === 1 ? 'cell needs' : 'cells need'} another look. Check the highlighted spaces.`,
      );
    else
      notify('Everything planted so far is in the right place. Keep growing!');
  }

  function gridKeyDown(event, index) {
    const shifts = {
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
    };
    if (event.key in shifts) {
      event.preventDefault();
      const [rowShift, colShift] = shifts[event.key];
      const row = Math.max(0, Math.min(5, Math.floor(index / 6) + rowShift));
      const col = Math.max(0, Math.min(5, (index % 6) + colShift));
      const next = row * 6 + col;
      setActiveCell(next);
      gridRef.current?.querySelector(`[data-index="${next}"]`)?.focus();
    } else if (event.key.toLowerCase() === 'x') {
      event.preventDefault();
      changeCell(index, true);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      if (!puzzle.givens[index] && board[index] !== 0 && !result.solved) {
        setHistory((h) => [...h, board]);
        setBoard((b) => b.map((v, i) => (i === index ? 0 : v)));
        setChecked(false);
      }
    }
  }

  const displayDate = new Date(
    `${mode === 'daily' ? seed : getDailySeed()}T12:00:00`,
  ).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="./" aria-label="Petal home">
          <Flower />
          <span>
            petal<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={mode === 'daily' ? 'nav-link active' : 'nav-link'}
            onClick={() =>
              (mode !== 'daily' || seed !== getDailySeed()) &&
              startPuzzle('daily')
            }
          >
            <Sun size={16} />
            Daily garden
          </button>
          <button
            className={mode === 'free' ? 'nav-link active' : 'nav-link'}
            onClick={() => mode !== 'free' && startPuzzle('free')}
          >
            <Sprout size={16} />
            Free play
          </button>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button sound-button"
            aria-label={sound ? 'Turn sound off' : 'Turn sound on'}
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            className="help-button"
            aria-label="How to play"
            onClick={() => setModal('help')}
          >
            <CircleHelp size={18} />
            <span>How to play</span>
          </button>
        </div>
      </header>

      <main>
        <section className="intro">
          <div className="intro-copy">
            <div className="intro-label">
              <span />
              <span>A little logic. A little bloom.</span>
            </div>
            <h1>
              Good things
              <br className="mobile-break" /> grow in pairs.
            </h1>
            <p>
              A fresh kind of logic puzzle. Plant flowers, find their partners,
              <br className="desktop-break" /> and make a little room for your
              mind to wander.
            </p>
          </div>
          <GardenArt />
        </section>

        <div className="play-layout">
          <section
            className={`game-card ${result.solved ? 'is-solved' : ''}`}
            aria-label="Petal puzzle"
          >
            <div className="game-heading">
              <div>
                <div className="garden-label">
                  <span className="sun-chip">
                    <Sun size={15} />
                  </span>
                  {mode === 'daily'
                    ? `Daily garden · ${displayDate}`
                    : 'Your own little garden'}
                </div>
                <h2>
                  {mode === 'daily'
                    ? 'A moment to bloom'
                    : 'Room for another bloom'}
                </h2>
              </div>
              <div className="difficulty-wrap">
                <span className={`difficulty-dot ${difficulty}`} />
                <select
                  aria-label="Puzzle difficulty"
                  value={difficulty}
                  onChange={(e) => startPuzzle(mode, e.target.value)}
                >
                  <option value="gentle">Gentle</option>
                  <option value="standard">Thoughtful</option>
                  <option value="tricky">Tricky</option>
                </select>
                <ChevronDown size={13} />
              </div>
            </div>
            <div className="game-meta">
              <span>
                <Flower2 size={15} />
                {planted} of {total} flowers
              </span>
              <span className="timer">
                <Clock3 size={14} />
                <span>{formatTime(seconds)}</span>
              </span>
            </div>

            <div className="board-area">
              <div
                className="board-shell"
                ref={gridRef}
                role="group"
                aria-label="Six by six garden. Use arrow keys to move between cells."
              >
                <div className="grid-corner">
                  <ArrowDown size={14} />
                </div>
                {puzzle.cols.map((count, i) => (
                  <div
                    key={`col-${i}`}
                    role="img"
                    className={`clue col-clue ${result.colCounts[i] === count ? 'satisfied' : ''} ${result.colCounts[i] > count ? 'over' : ''}`}
                    aria-label={`Column ${i + 1}: ${result.colCounts[i]} of ${count} flowers`}
                  >
                    {count}
                  </div>
                ))}
                {puzzle.rows.map((count, row) => (
                  <div className="board-row" key={row}>
                    <div
                      role="img"
                      className={`clue row-clue ${result.rowCounts[row] === count ? 'satisfied' : ''} ${result.rowCounts[row] > count ? 'over' : ''}`}
                      aria-label={`Row ${row + 1}: ${result.rowCounts[row]} of ${count} flowers`}
                    >
                      {count}
                    </div>
                    {Array.from({ length: 6 }, (_, col) => {
                      const index = row * 6 + col,
                        value = board[index],
                        given = !!puzzle.givens[index];
                      const wrong =
                        checked &&
                        value !== 0 &&
                        value !== puzzle.solution[index];
                      return (
                        <button
                          key={index}
                          data-index={index}
                          tabIndex={activeCell === index ? 0 : -1}
                          onFocus={() => setActiveCell(index)}
                          className={`cell ${value === 1 ? 'planted' : value === -1 ? 'marked' : ''} ${given ? 'given' : ''} ${given && value === -1 ? 'stone-cell' : ''} ${wrong ? 'incorrect' : ''} ${hintCell === index ? 'hinted' : ''}`}
                          aria-label={`Row ${row + 1}, column ${col + 1}: ${value === 1 ? 'flower' : given ? 'pebble' : value === -1 ? 'marked empty' : 'unplanted'}${given ? ', fixed' : ''}${wrong ? ', incorrect' : ''}${hintCell === index ? ', revealed by a hint' : ''}`}
                          aria-description={`Row needs ${count} flowers; column needs ${puzzle.cols[col]} flowers. Currently ${result.rowCounts[row]} in this row and ${result.colCounts[col]} in this column.`}
                          aria-disabled={given || result.solved}
                          onClick={() => changeCell(index)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            changeCell(index, true);
                          }}
                          onKeyDown={(e) => gridKeyDown(e, index)}
                        >
                          {value === 1 ? (
                            <>
                              <Flower />
                              {given && <span className="given-dot" />}
                            </>
                          ) : given ? (
                            <span className="pebble">
                              <span />
                            </span>
                          ) : value === -1 ? (
                            <X size={18} strokeWidth={1.5} />
                          ) : (
                            <span className="soil-dot" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="board-instructions">
              <span className="mouse-icon" />
              Click to plant<span className="instruction-dot">·</span>
              Right-click to mark empty
            </div>
            <div className="tool-selector" aria-label="Cell action">
              <button
                className={tool === 'plant' ? 'selected' : ''}
                aria-pressed={tool === 'plant'}
                onClick={() => setTool('plant')}
              >
                <Flower2 size={16} />
                Plant a flower
              </button>
              <button
                className={tool === 'mark' ? 'selected' : ''}
                aria-pressed={tool === 'mark'}
                onClick={() => setTool('mark')}
              >
                <X size={16} />
                Mark empty
              </button>
            </div>
            <div className="game-toolbar">
              <div>
                <button onClick={undo} disabled={!history.length}>
                  <Undo2 size={17} />
                  <span>Undo</span>
                </button>
                <button onClick={() => setModal('reset')}>
                  <RotateCcw size={16} />
                  <span>Reset</span>
                </button>
              </div>
              <div>
                <button className="check-button" onClick={checkGarden}>
                  <Check size={17} />
                  <span>Check</span>
                </button>
                <button
                  className="hint-button"
                  onClick={revealHint}
                  disabled={result.solved}
                >
                  <Lightbulb size={16} />
                  <span>A little hint</span>
                </button>
              </div>
            </div>
            {result.solved && (
              <div className="solved-banner">
                <Flower2 size={18} />
                <span>A beautifully solved garden.</span>
                <button onClick={() => startPuzzle('free')}>
                  Grow another <ArrowRight size={15} />
                </button>
              </div>
            )}
          </section>

          <aside className="sidebar">
            <section className="how-to">
              <div className="section-title">
                <h2>A few seeds of wisdom</h2>
                <Sprout size={20} />
              </div>
              <p className="section-intro">
                Three simple rules. A garden of possibilities.
              </p>
              <Rules />
              <button className="text-link" onClick={() => setModal('help')}>
                Let's take a closer look <MoveUpRight size={15} />
              </button>
            </section>
            <section className="pause-card">
              <div className="pause-flower">
                <Flower color="#b6a0ce" center="#f5edcb" />
                <span className="little-spark">✦</span>
              </div>
              <h3>
                Less scrolling.
                <br />
                More blooming.
              </h3>
              <p>
                No scores to chase. No rush to finish.
                <br />
                Just you and a small, happy puzzle.
              </p>
              <span className="pause-bottom">
                <Leaf size={13} />
                Take your time. This is your space.
              </span>
            </section>
            <button
              className="another-garden"
              onClick={() => startPuzzle('free')}
            >
              <span className="shuffle-icon">
                <Shuffle size={18} />
              </span>
              <span>
                <strong>Something a little different?</strong>
                <small>Grow a garden in free play</small>
              </span>
              <ArrowRight size={17} />
            </button>
          </aside>
        </div>
        <div className="below-game">
          <span>
            <span className="tiny-leaf">
              <Leaf size={15} />
            </span>
            {mode === 'daily'
              ? 'A new garden every day. A little better, one bloom at a time.'
              : 'A new possibility with every garden. Stay as long as you like.'}
          </span>
          <span className="autosave">
            <span />
            Progress saved on this device
          </span>
        </div>
      </main>

      <footer>
        <a className="footer-brand" href="./">
          <Flower />
          petal.
        </a>
        <span>A small daily ritual for a curious mind.</span>
        <button onClick={() => setModal('about')}>
          Made to make room <span>♡</span>
        </button>
      </footer>

      <div
        className={`toast ${toast ? 'visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        <Lightbulb size={18} />
        <span>{toast}</span>
        {toast && (
          <button
            onClick={() => setToast('')}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className={`modal ${modal === 'complete' ? 'completion-modal' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            ref={dialogRef}
          >
            <button
              className="modal-close icon-button"
              onClick={() => setModal(null)}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
            {modal === 'help' && (
              <>
                <span className="modal-flower">
                  <Flower />
                </span>
                <h2 id="modal-title">Let's grow something.</h2>
                <p className="modal-intro">
                  Fill the garden with pairs of flowers. A little logic will
                  show you where each one belongs.
                </p>
                <Rules detailed />
                <div className="keyboard-tips">
                  <strong>Make yourself at home</strong>
                  <p>
                    Click or tap to plant a flower. Click it again to remove it.
                    Choose “Mark empty” or right-click to mark a space you want
                    to leave clear.
                  </p>
                  <p>
                    On a keyboard, use arrow keys to move, Enter or Space to
                    plant, and X to mark empty. Empty spaces don't all need
                    marking to finish.
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setModal(null)}
                >
                  Ready to bloom <Flower2 size={17} />
                </button>
              </>
            )}
            {modal === 'reset' && (
              <>
                <span className="modal-flower">
                  <Sprout size={36} />
                </span>
                <h2 id="modal-title">A fresh start?</h2>
                <p className="modal-intro">
                  Clear your flowers and marks in this garden. The starting
                  clues will stay just where they are.
                </p>
                <div className="modal-actions">
                  <button
                    className="secondary-button"
                    onClick={() => setModal(null)}
                  >
                    Keep growing
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setBoard(initialBoard(puzzle));
                      setSeconds(0);
                      setHints(0);
                      setHistory([]);
                      setChecked(false);
                      setHintCell(null);
                      setCelebration(false);
                      setModal(null);
                    }}
                  >
                    Reset garden
                  </button>
                </div>
              </>
            )}
            {modal === 'complete' && (
              <>
                <GardenArt small />
                <span className="completion-label">Look what you grew</span>
                <h2 id="modal-title">A garden in full bloom.</h2>
                <p className="modal-intro">
                  Every flower found its partner.
                  <br />A little patience makes lovely things.
                </p>
                <div className="completion-stats">
                  <div>
                    <Clock3 size={18} />
                    <strong>{formatTime(seconds)}</strong>
                    <span>Time well spent</span>
                  </div>
                  <div>
                    <Flower2 size={18} />
                    <strong>{total / 2}</strong>
                    <span>Happy pairs</span>
                  </div>
                  <div>
                    <Lightbulb size={18} />
                    <strong>{hints}</strong>
                    <span>Little hints</span>
                  </div>
                </div>
                <button
                  className="primary-button"
                  onClick={() => startPuzzle('free')}
                >
                  Grow another garden <ArrowRight size={17} />
                </button>
                <button
                  className="text-link centered"
                  onClick={() => setModal(null)}
                >
                  Admire my garden
                </button>
              </>
            )}
            {modal === 'about' && (
              <>
                <span className="modal-flower">
                  <Flower />
                </span>
                <h2 id="modal-title">A little room to think.</h2>
                <p className="modal-intro">
                  Petal is an original pairing puzzle inspired by the quiet
                  satisfaction of a well-tended garden.
                </p>
                <p className="about-copy">
                  Every puzzle has exactly one solution. Your daily garden is
                  seeded by today's date, and free play always has another patch
                  waiting. Everything runs in your browser, and your progress
                  stays on this device.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setModal(null)}
                >
                  Back to my garden <Sprout size={17} />
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
