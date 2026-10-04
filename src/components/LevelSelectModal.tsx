import React, { useState } from 'react';
import { X, Star, CheckCircle, Lock, Sparkles } from 'lucide-react';
import { Difficulty, PuzzleDefinition } from '../types/game';
import { CAMPAIGN_PUZZLES, TUTORIAL_PUZZLES } from '../game/puzzles';

interface LevelSelectModalProps {
  isOpen: boolean;
  currentPuzzleId: string;
  onClose: () => void;
  onSelectPuzzle: (puzzle: PuzzleDefinition) => void;
  completedLevelIds: string[];
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  currentPuzzleId,
  onClose,
  onSelectPuzzle,
  completedLevelIds,
}) => {
  const [activeTab, setActiveTab] = useState<Difficulty | 'tutorial'>('dawn');

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

  const tabs: { id: Difficulty | 'tutorial'; label: string; size: string; count: number }[] = [
    { id: 'tutorial', label: 'Lessons', size: '4×4', count: TUTORIAL_PUZZLES.length },
    { id: 'dawn', label: 'Dawn', size: '4×4', count: 6 },
    { id: 'solar', label: 'Solar', size: '5×5', count: 6 },
    { id: 'eclipse', label: 'Eclipse', size: '6×6', count: 6 },
    { id: 'supernova', label: 'Supernova', size: '7×7', count: 6 },
  ];

  const currentPuzzles =
    activeTab === 'tutorial'
      ? TUTORIAL_PUZZLES
      : CAMPAIGN_PUZZLES.filter((p) => p.difficulty === activeTab);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Atlas of Constellations</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-white mt-0.5">Campaign Levels</h2>
          <p className="text-xs text-slate-400">
            Select a tier to challenge your logical deduction.
          </p>
        </div>

        {/* Tier Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span className="font-display">{tab.label}</span>
              <span className="text-[10px] font-mono opacity-70">{tab.size}</span>
            </button>
          ))}
        </div>

        {/* Level Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto py-2 pr-1 max-h-[360px]">
          {currentPuzzles.map((p, index) => {
            const isCompleted = completedLevelIds.includes(p.id);
            const isCurrent = p.id === currentPuzzleId;

            return (
              <button
                key={p.id}
                onClick={() => {
                  onSelectPuzzle(p);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  isCurrent
                    ? 'bg-amber-500/15 border-amber-400/60 shadow-md shadow-amber-500/10'
                    : isCompleted
                    ? 'bg-slate-900/80 border-slate-700/60 hover:border-slate-600'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-sm ${
                      isCurrent
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-200 font-display">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Grid: {p.size}×{p.size}
                    </div>
                  </div>
                </div>

                <div>
                  {isCompleted ? (
                    <div className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </div>
                  ) : isCurrent ? (
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                      Playing
                    </span>
                  ) : (
                    <span className="text-slate-600">
                      <Lock className="w-4 h-4 opacity-40" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
