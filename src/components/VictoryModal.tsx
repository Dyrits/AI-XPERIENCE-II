import React, { useState } from 'react';
import { Star, Trophy, Clock, Footprints, Share2, ArrowRight, RotateCcw, Check } from 'lucide-react';
import { PuzzleDefinition } from '../types/game';

interface VictoryModalProps {
  isOpen: boolean;
  puzzle: PuzzleDefinition;
  timeSeconds: number;
  movesCount: number;
  hintsUsed: number;
  onNextLevel: () => void;
  onRestart: () => void;
  onOpenLevelSelect: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  puzzle,
  timeSeconds,
  movesCount,
  hintsUsed,
  onNextLevel,
  onRestart,
  onOpenLevelSelect,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const stars = hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1;

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const shareText = `LUMINA: Celestial Logic Grid ☀️\nLevel: ${puzzle.title} (${puzzle.size}×${puzzle.size})\nTime: ${formatTime(timeSeconds)} • Moves: ${movesCount}\nRating: ${starStr}\nCan you align the light? ✨`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 flex flex-col items-center text-center relative animate-in fade-in zoom-in-95 duration-200">
        {/* Glow badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/40 -mt-12 sm:-mt-14 mb-3 border-2 border-amber-200">
          <Trophy className="w-8 h-8 text-slate-950" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-wide">
          Constellation Aligned!
        </h2>
        <p className="text-xs text-amber-300 font-mono tracking-wider mt-1 uppercase">
          {puzzle.title} • {puzzle.difficulty}
        </p>

        {/* Stars */}
        <div className="flex items-center gap-2 my-5">
          {[1, 2, 3].map((starIdx) => (
            <Star
              key={`star-${starIdx}`}
              className={`w-8 h-8 transition-transform duration-300 ${
                starIdx <= stars
                  ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] scale-110'
                  : 'text-slate-700 fill-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-3 p-3 bg-slate-900/90 rounded-2xl border border-slate-800 mb-6">
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Solve Time</span>
            </div>
            <span className="text-lg font-bold font-mono text-slate-100">
              {formatTime(timeSeconds)}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/40">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
              <Footprints className="w-3.5 h-3.5 text-amber-400" />
              <span>Moves</span>
            </div>
            <span className="text-lg font-bold font-mono text-slate-100">
              {movesCount}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onNextLevel}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
          >
            <span>Next Puzzle</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={handleShare}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>Share Result</span>
                </>
              )}
            </button>

            <button
              onClick={onRestart}
              className="py-2.5 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Replay Puzzle"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>

            <button
              onClick={onOpenLevelSelect}
              className="py-2.5 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              Levels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
