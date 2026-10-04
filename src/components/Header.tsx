import React from 'react';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Grid3X3,
  Calendar,
  Shuffle,
  Wrench,
} from 'lucide-react';
import { PuzzleDefinition } from '../types/game';

interface HeaderProps {
  puzzle: PuzzleDefinition;
  timeSeconds: number;
  movesCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenTutorial: () => void;
  onOpenLevelSelect: () => void;
  onOpenDaily: () => void;
  onGenerateInfinite: () => void;
  onOpenCustomModal: () => void;
  onRestart: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  puzzle,
  timeSeconds,
  movesCount,
  isMuted,
  onToggleMute,
  onOpenTutorial,
  onOpenLevelSelect,
  onOpenDaily,
  onGenerateInfinite,
  onOpenCustomModal,
  onRestart,
}) => {
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'dawn':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'solar':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'eclipse':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'supernova':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <header className="w-full max-w-4xl mx-auto px-4 pt-3 pb-2 flex flex-col gap-3">
      {/* Top Bar: Brand, Navigation, Audio, Help */}
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <div className="w-4 h-4 rounded-full bg-[#080d1a] translate-x-1 -translate-y-0.5" />
            <Sparkles className="w-3.5 h-3.5 text-amber-200 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-wider text-slate-100 flex items-center gap-2 font-display">
              LUMINA
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400/80 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                Logic Grid
              </span>
            </h1>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenTutorial}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-amber-300 text-xs font-medium border border-slate-700/60 transition-colors shadow-sm"
            title="How to Play"
            aria-label="How to Play"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-amber-300 border border-slate-700/60 transition-colors shadow-sm"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mode Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
        {/* Modes */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <button
            onClick={onOpenLevelSelect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold tracking-wide transition-all"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Campaign</span>
          </button>

          <button
            onClick={onOpenDaily}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700/40 text-xs font-medium transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Daily</span>
          </button>

          <button
            onClick={onGenerateInfinite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700/40 text-xs font-medium transition-all"
          >
            <Shuffle className="w-3.5 h-3.5 text-purple-400" />
            <span>Random</span>
          </button>

          <button
            onClick={onOpenCustomModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-slate-700/40 text-xs font-medium transition-all"
          >
            <Wrench className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Builder</span>
          </button>
        </div>

        {/* Level Stats */}
        <div className="flex items-center gap-3 text-xs ml-auto">
          {/* Difficulty & Title */}
          <div className="flex items-center gap-2">
            <span className="text-slate-200 font-semibold max-w-[120px] sm:max-w-none truncate">
              {puzzle.title}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${getDifficultyBadge(
                puzzle.difficulty
              )}`}
            >
              {puzzle.difficulty} ({puzzle.size}×{puzzle.size})
            </span>
          </div>

          {/* Timer & Moves */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800 font-mono text-slate-400">
            <span className="text-slate-200 font-medium">{formatTime(timeSeconds)}</span>
            <span className="text-slate-500">•</span>
            <span>{movesCount} {movesCount === 1 ? 'move' : 'moves'}</span>
          </div>

          {/* Reset */}
          <button
            onClick={onRestart}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
            title="Reset Board"
            aria-label="Reset Board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
