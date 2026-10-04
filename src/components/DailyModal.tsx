import React, { useState } from 'react';
import { X, Calendar, Flame, Trophy, Play } from 'lucide-react';
import { PuzzleDefinition } from '../types/game';
import { generatePuzzle } from '../game/generator';

interface DailyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayDaily: (puzzle: PuzzleDefinition) => void;
  dailyStreak: number;
}

export const DailyModal: React.FC<DailyModalProps> = ({
  isOpen,
  onClose,
  onPlayDaily,
  dailyStreak,
}) => {
  const [selectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleStartDaily = () => {
    // Generate a 5x5 Solar level for the daily challenge
    const dailyPuzzle = generatePuzzle('solar');
    dailyPuzzle.title = `Daily Solaris: ${selectedDate}`;
    dailyPuzzle.isDaily = true;
    dailyPuzzle.dateStr = selectedDate;

    onPlayDaily(dailyPuzzle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-white">Daily Challenge</h2>
            <p className="text-xs text-slate-400">{dateFormatted}</p>
          </div>
        </div>

        {/* Streak & Stats */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40">
            <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
            <div>
              <div className="text-xs text-slate-400 font-medium">Daily Streak</div>
              <div className="text-lg font-bold font-mono text-amber-300">
                {dailyStreak} {dailyStreak === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40">
            <Trophy className="w-6 h-6 text-cyan-400" />
            <div>
              <div className="text-xs text-slate-400 font-medium">Tier</div>
              <div className="text-lg font-bold font-display text-cyan-300">5×5 Solar</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/60">
          A fresh celestial alignment generated for all players every day. Solve today’s puzzle to build and maintain your daily streak!
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartDaily}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Play Today's Challenge</span>
        </button>
      </div>
    </div>
  );
};
