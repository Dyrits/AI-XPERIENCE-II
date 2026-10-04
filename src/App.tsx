import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  CellState,
  PuzzleDefinition,
  InputTool,
  GameMove,
  Difficulty,
} from './types/game';
import { CAMPAIGN_PUZZLES } from './game/puzzles';
import { validateBoard } from './game/rules';
import { getIntelligentHint, Hint } from './game/solver';
import { generatePuzzle } from './game/generator';
import { sound } from './audio/sound';

import { Header } from './components/Header';
import { GameBoard } from './components/GameBoard';
import { Controls } from './components/Controls';
import { TutorialModal } from './components/TutorialModal';
import { VictoryModal } from './components/VictoryModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { DailyModal } from './components/DailyModal';
import { CustomPuzzleModal } from './components/CustomPuzzleModal';
import { Lightbulb, X, Sparkles, Moon } from 'lucide-react';

export const App: React.FC = () => {
  // 1. Current Puzzle & Board State
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleDefinition>(() => {
    return CAMPAIGN_PUZZLES[0];
  });

  const [cellStates, setCellStates] = useState<CellState[][]>(() => {
    return Array.from({ length: currentPuzzle.size }, () =>
      Array(currentPuzzle.size).fill('empty')
    );
  });

  // 2. Gameplay & Tool State
  const [selectedTool, setSelectedTool] = useState<InputTool>('lumen');
  const [history, setHistory] = useState<GameMove[][]>([]);
  const [redoStack, setRedoStack] = useState<GameMove[][]>([]);
  const [movesCount, setMovesCount] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [activeHint, setActiveHint] = useState<Hint | null>(null);

  // 3. Audio & Modals
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [showTutorial, setShowTutorial] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  // 4. Persistence
  const [completedLevels, setCompletedLevels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lumina_completed_levels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dailyStreak, setDailyStreak] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lumina_daily_streak');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Track previous line satisfaction to trigger sounds
  const prevSatisfiedLines = useRef<Set<string>>(new Set());

  // Real-time validation
  const validation = validateBoard(
    currentPuzzle.grid,
    cellStates,
    currentPuzzle.rowTargets,
    currentPuzzle.colTargets
  );

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && !isCompleted) {
      interval = setInterval(() => {
        setTimeSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isCompleted]);

  // Audio trigger on Row/Column Satisfaction
  useEffect(() => {
    const currentSatisfied = new Set<string>();
    validation.rowStatuses.forEach((status, idx) => {
      if (status.isSatisfied) currentSatisfied.add(`r-${idx}`);
    });
    validation.colStatuses.forEach((status, idx) => {
      if (status.isSatisfied) currentSatisfied.add(`c-${idx}`);
    });

    let newSatisfaction = false;
    currentSatisfied.forEach((key) => {
      if (!prevSatisfiedLines.current.has(key)) {
        newSatisfaction = true;
      }
    });

    if (newSatisfaction && !isCompleted) {
      sound.playLineSatisfied();
    }

    prevSatisfiedLines.current = currentSatisfied;
  }, [validation.rowStatuses, validation.colStatuses, isCompleted]);

  // Victory Handler
  useEffect(() => {
    if (validation.isSolved && !isCompleted) {
      setIsCompleted(true);
      setIsTimerRunning(false);
      sound.playVictoryFanfare();

      // Confetti firework
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#06b6d4', '#38bdf8', '#ffffff'],
      });

      // Update completed levels
      setCompletedLevels((prev) => {
        if (!prev.includes(currentPuzzle.id)) {
          const nextCompleted = [...prev, currentPuzzle.id];
          localStorage.setItem('lumina_completed_levels', JSON.stringify(nextCompleted));
          return nextCompleted;
        }
        return prev;
      });

      // If daily puzzle, update daily streak
      if (currentPuzzle.isDaily) {
        setDailyStreak((prev) => {
          const next = prev + 1;
          localStorage.setItem('lumina_daily_streak', next.toString());
          return next;
        });
      }

      window.setTimeout(() => {
        setShowVictory(true);
      }, 800);

      return () => {
        // Only clear if unmounted or puzzle changed
      };
    }
  }, [validation.isSolved, isCompleted, currentPuzzle.id, currentPuzzle.isDaily]);

  // Reset/Load new puzzle
  const loadPuzzle = useCallback((newPuzzle: PuzzleDefinition) => {
    setCurrentPuzzle(newPuzzle);
    setCellStates(
      Array.from({ length: newPuzzle.size }, () => Array(newPuzzle.size).fill('empty'))
    );
    setHistory([]);
    setRedoStack([]);
    setMovesCount(0);
    setTimeSeconds(0);
    setIsCompleted(false);
    setIsTimerRunning(true);
    setHintsUsed(0);
    setActiveHint(null);
    prevSatisfiedLines.current.clear();
  }, []);

  // Cell Interaction
  const handleCellClick = useCallback(
    (r: number, c: number, isRightClick: boolean = false) => {
      if (isCompleted) return;

      const currentState = cellStates[r][c];
      let targetState: CellState;

      if (isRightClick) {
        // Right click directly toggles Eclipse
        targetState = currentState === 'eclipse' ? 'empty' : 'eclipse';
      } else {
        // Left click: apply current tool or cycle if already selected
        if (selectedTool === 'lumen') {
          targetState = currentState === 'lumen' ? 'empty' : 'lumen';
        } else if (selectedTool === 'eclipse') {
          targetState = currentState === 'eclipse' ? 'empty' : 'eclipse';
        } else if (selectedTool === 'marked') {
          targetState = currentState === 'marked' ? 'empty' : 'marked';
        } else {
          // Eraser
          targetState = 'empty';
        }
      }

      if (targetState === currentState) return;

      // Play Sound
      if (targetState === 'lumen') {
        const pitch = 1.0 + (currentPuzzle.grid[r][c] - 1) * 0.08;
        sound.playLumenChime(pitch);
      } else if (targetState === 'eclipse') {
        sound.playEclipseClick();
      } else {
        sound.playPencilTick();
      }

      // Apply move and push to history
      const move: GameMove = {
        row: r,
        col: c,
        prevState: currentState,
        newState: targetState,
      };

      setCellStates((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = targetState;
        return next;
      });

      setHistory((prev) => [...prev, [move]]);
      setRedoStack([]);
      setMovesCount((m) => m + 1);

      // Clear active hint if this cell was part of it
      if (activeHint && activeHint.row === r && activeHint.col === c) {
        setActiveHint(null);
      }
    },
    [cellStates, selectedTool, isCompleted, currentPuzzle.grid, activeHint]
  );

  const handleCellDrag = useCallback(
    (r: number, c: number) => {
      if (isCompleted) return;
      const currentState = cellStates[r][c];
      const targetState: CellState =
        selectedTool === 'eraser' ? 'empty' : selectedTool;

      if (currentState === targetState) return;

      if (targetState === 'lumen') {
        sound.playLumenChime();
      } else if (targetState === 'eclipse') {
        sound.playEclipseClick();
      } else {
        sound.playPencilTick();
      }

      const move: GameMove = {
        row: r,
        col: c,
        prevState: currentState,
        newState: targetState,
      };

      setCellStates((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = targetState;
        return next;
      });

      setHistory((prev) => [...prev, [move]]);
      setRedoStack([]);
      setMovesCount((m) => m + 1);
    },
    [cellStates, selectedTool, isCompleted]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (history.length === 0 || isCompleted) return;
    const lastMoves = history[history.length - 1];

    setCellStates((prev) => {
      const next = prev.map((row) => [...row]);
      for (const m of lastMoves) {
        next[m.row][m.col] = m.prevState;
      }
      return next;
    });

    setHistory((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, lastMoves]);
    sound.playPencilTick();
  }, [history, isCompleted]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || isCompleted) return;
    const nextMoves = redoStack[redoStack.length - 1];

    setCellStates((prev) => {
      const next = prev.map((row) => [...row]);
      for (const m of nextMoves) {
        next[m.row][m.col] = m.newState;
      }
      return next;
    });

    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setHistory((prev) => [...prev, nextMoves]);
    sound.playPencilTick();
  }, [redoStack, isCompleted]);

  // Restart Board
  const handleRestart = useCallback(() => {
    setCellStates(
      Array.from({ length: currentPuzzle.size }, () =>
        Array(currentPuzzle.size).fill('empty')
      )
    );
    setHistory([]);
    setRedoStack([]);
    setMovesCount(0);
    setTimeSeconds(0);
    setIsCompleted(false);
    setIsTimerRunning(true);
    setActiveHint(null);
    prevSatisfiedLines.current.clear();
  }, [currentPuzzle.size]);

  // Hint Generator
  const handleHint = useCallback(() => {
    if (isCompleted) return;
    const hint = getIntelligentHint(
      currentPuzzle.grid,
      cellStates,
      currentPuzzle.rowTargets,
      currentPuzzle.colTargets
    );
    if (hint) {
      setActiveHint(hint);
      setHintsUsed((h) => h + 1);
      sound.playLumenChime(1.4);
    }
  }, [currentPuzzle, cellStates, isCompleted]);

  // Apply active hint directly
  const handleApplyHint = useCallback(() => {
    if (!activeHint) return;
    handleCellClick(activeHint.row, activeHint.col, activeHint.suggestedState === 'eclipse');
    setActiveHint(null);
  }, [activeHint, handleCellClick]);

  // Darken all remaining empty cells when all sums are met
  const handleFillRemainingShadows = useCallback(() => {
    if (isCompleted) return;
    const moves: GameMove[] = [];
    const nextStates = cellStates.map((row, r) =>
      row.map((st, c) => {
        if (st === 'empty' || st === 'marked') {
          moves.push({
            row: r,
            col: c,
            prevState: st,
            newState: 'eclipse',
          });
          return 'eclipse';
        }
        return st;
      })
    );

    if (moves.length > 0) {
      sound.playEclipseClick();
      setCellStates(nextStates);
      setHistory((prev) => [...prev, moves]);
      setRedoStack([]);
      setMovesCount((m) => m + 1);
    }
  }, [cellStates, isCompleted]);

  // Next Campaign Level
  const handleNextLevel = useCallback(() => {
    setShowVictory(false);
    const currentIndex = CAMPAIGN_PUZZLES.findIndex((p) => p.id === currentPuzzle.id);
    if (currentIndex >= 0 && currentIndex < CAMPAIGN_PUZZLES.length - 1) {
      loadPuzzle(CAMPAIGN_PUZZLES[currentIndex + 1]);
    } else {
      // Loop or go to level select
      setShowLevelSelect(true);
    }
  }, [currentPuzzle.id, loadPuzzle]);

  // Quick Random Puzzle
  const handleGenerateInfinite = useCallback(() => {
    const diffs: Difficulty[] = ['dawn', 'solar', 'eclipse', 'supernova'];
    const randomDiff = diffs[Math.floor(Math.random() * diffs.length)];
    const p = generatePuzzle(randomDiff);
    loadPuzzle(p);
  }, [loadPuzzle]);

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid shortcuts if input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === '1' || e.key.toLowerCase() === 'l') {
        setSelectedTool('lumen');
      } else if (e.key === '2' || e.key.toLowerCase() === 'e') {
        setSelectedTool('eclipse');
      } else if (e.key === '3' || e.key.toLowerCase() === 'n') {
        setSelectedTool('marked');
      } else if (e.key === '4' || e.key.toLowerCase() === 'c') {
        setSelectedTool('eraser');
      } else if (e.key.toLowerCase() === 'h') {
        handleHint();
      } else if (e.key.toLowerCase() === 'r') {
        handleRestart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleHint, handleRestart]);

  return (
    <div className="min-h-screen celestial-bg flex flex-col justify-between py-2 text-slate-100">
      {/* Header */}
      <Header
        puzzle={currentPuzzle}
        timeSeconds={timeSeconds}
        movesCount={movesCount}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(sound.toggleMute())}
        onOpenTutorial={() => setShowTutorial(true)}
        onOpenLevelSelect={() => setShowLevelSelect(true)}
        onOpenDaily={() => setShowDaily(true)}
        onGenerateInfinite={handleGenerateInfinite}
        onOpenCustomModal={() => setShowCustom(true)}
        onRestart={handleRestart}
      />

      {/* Main Game Stage */}
      <main className="flex-1 flex flex-col items-center justify-center relative w-full px-2 sm:px-4">
        {/* Active Hint Banner */}
        {activeHint && (
          <div className="w-full max-w-lg mb-2 p-3 sm:p-4 rounded-2xl bg-amber-500/15 border border-amber-400/50 shadow-xl shadow-amber-500/10 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                  Deductive Insight • Cell ({activeHint.row + 1}, {activeHint.col + 1})
                </span>
                <button
                  onClick={() => setActiveHint(null)}
                  aria-label="Dismiss hint"
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">
                {activeHint.reason}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={handleApplyHint}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Hint ({activeHint.suggestedState.toUpperCase()})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All Sums Met Banner */}
        {validation.allSumsMet && !validation.isSolved && !isCompleted && (
          <div className="w-full max-w-lg mb-2 p-3 rounded-2xl bg-amber-500/15 border border-amber-400/50 shadow-xl shadow-amber-500/10 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <Moon className="w-5 h-5 text-indigo-300 shrink-0" />
              <div className="text-xs text-slate-200">
                <span className="font-bold text-amber-300">All target sums matched!</span> Turn the remaining empty cells into <strong className="text-slate-100">Eclipse (🌑)</strong> to complete the puzzle.
              </div>
            </div>
            <button
              onClick={handleFillRemainingShadows}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shrink-0 shadow-sm transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Darken All</span>
            </button>
          </div>
        )}

        {/* Puzzle Board */}
        <GameBoard
          grid={currentPuzzle.grid}
          cellStates={cellStates}
          rowTargets={currentPuzzle.rowTargets}
          colTargets={currentPuzzle.colTargets}
          validation={validation}
          selectedTool={selectedTool}
          onCellClick={handleCellClick}
          onCellDrag={handleCellDrag}
          isCompleted={isCompleted}
        />
      </main>

      {/* Footer Controls */}
      <footer className="w-full">
        <Controls
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          canUndo={history.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onHint={handleHint}
          onCheck={() => {
            if (validation.hasAnyViolation) {
              sound.playEclipseClick();
            } else {
              sound.playLineSatisfied();
            }
          }}
          onRestart={handleRestart}
          isCompleted={isCompleted}
        />
      </footer>

      {/* Modals */}
      <TutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onStartCampaign={() => {
          loadPuzzle(CAMPAIGN_PUZZLES[0]);
        }}
      />

      <VictoryModal
        isOpen={showVictory}
        puzzle={currentPuzzle}
        timeSeconds={timeSeconds}
        movesCount={movesCount}
        hintsUsed={hintsUsed}
        onNextLevel={handleNextLevel}
        onRestart={() => {
          setShowVictory(false);
          handleRestart();
        }}
        onOpenLevelSelect={() => {
          setShowVictory(false);
          setShowLevelSelect(true);
        }}
      />

      <LevelSelectModal
        isOpen={showLevelSelect}
        currentPuzzleId={currentPuzzle.id}
        onClose={() => setShowLevelSelect(false)}
        onSelectPuzzle={loadPuzzle}
        completedLevelIds={completedLevels}
      />

      <DailyModal
        isOpen={showDaily}
        onClose={() => setShowDaily(false)}
        onPlayDaily={loadPuzzle}
        dailyStreak={dailyStreak}
      />

      <CustomPuzzleModal
        isOpen={showCustom}
        currentPuzzle={currentPuzzle}
        onClose={() => setShowCustom(false)}
        onLoadPuzzle={loadPuzzle}
      />
    </div>
  );
};
