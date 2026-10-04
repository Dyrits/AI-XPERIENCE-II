import React, { useState } from 'react';
import { X, Sun, Moon, Sparkles, Check, ChevronRight, ChevronLeft } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCampaign: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onStartCampaign,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Close on Escape key
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

  const steps = [
    {
      title: 'Welcome to LUMINA',
      subtitle: 'The Celestial Logic Grid',
      content: (
        <div className="flex flex-col gap-4 text-slate-300 text-sm leading-relaxed">
          <p>
            <strong className="text-amber-300 font-semibold">LUMINA</strong> is an original
            pencil-and-paper style logic puzzle game inspired by Sudoku, Kakuro, and Hitori.
          </p>
          <p>
            Each cell contains a number. Your goal is to decide which cells to{' '}
            <strong className="text-amber-400">illuminate (Lumen ☀️)</strong> and which to{' '}
            <strong className="text-slate-400">darken into shadow (Eclipse 🌑)</strong>.
          </p>
          <div className="flex items-center justify-center gap-6 py-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-display font-bold text-slate-950 text-xl shadow-lg shadow-amber-500/30">
                5
              </div>
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5" /> LUMEN (Lit)
              </span>
            </div>

            <div className="text-slate-600 text-xl font-bold">vs</div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-[#0c1220] border border-slate-800 flex items-center justify-center font-display text-slate-600 text-xl line-through">
                5
              </div>
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Moon className="w-3.5 h-3.5" /> ECLIPSE (Void)
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 italic text-center">
            There are only 3 simple rules to master. Every puzzle has a unique, deterministic logical solution!
          </p>
        </div>
      ),
    },
    {
      title: 'Rule 1: Harmonic Sums',
      subtitle: 'Like Kakuro or Nonograms',
      content: (
        <div className="flex flex-col gap-4 text-slate-300 text-sm leading-relaxed">
          <p>
            The numbers outside each row and column are <strong className="text-amber-400">Target Sums</strong>.
          </p>
          <p>
            The sum of all <strong className="text-amber-300">LUMEN</strong> cells in a line must add up
            EXACTLY to that target. Eclipse cells do NOT contribute to the sum.
          </p>

          {/* Visual Example */}
          <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400 flex flex-col items-center justify-center text-amber-300 font-bold text-sm">
                <span>8</span>
                <span className="text-[9px] text-amber-400/80">TARGET</span>
              </div>
              <span className="text-slate-500 font-mono">→</span>
              <div className="flex gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold flex items-center justify-center text-lg">
                  5
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#0c1220] border border-slate-800 text-slate-600 flex items-center justify-center text-lg line-through">
                  4
                </div>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold flex items-center justify-center text-lg">
                  3
                </div>
              </div>
            </div>
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> 5 + 3 = 8 (Target Satisfied!)
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Rule 2: Resonance Uniqueness',
      subtitle: 'Like Sudoku',
      content: (
        <div className="flex flex-col gap-4 text-slate-300 text-sm leading-relaxed">
          <p>
            In any row or column, <strong className="text-amber-400">no two LUMEN cells may have the same number</strong>.
          </p>
          <p>
            If a row contains two <span className="font-mono text-amber-300 font-bold">4</span>s, at most
            ONE of them can be illuminated. The other must be an Eclipse!
          </p>

          {/* Visual Example */}
          <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold flex items-center justify-center text-lg">
                4
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold flex items-center justify-center text-lg">
                2
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500 text-rose-300 font-bold flex items-center justify-center text-lg">
                4
              </div>
            </div>
            <div className="text-xs text-rose-400 font-medium text-center">
              ❌ Invalid: Two active 4s in the same row! One must be Eclipse.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Rule 3: The Shadow Barrier',
      subtitle: 'Like Hitori',
      content: (
        <div className="flex flex-col gap-4 text-slate-300 text-sm leading-relaxed">
          <p>
            <strong className="text-indigo-400">No two ECLIPSE cells may touch horizontally or vertically</strong>.
          </p>
          <p>
            Shadows can never share an edge. This means whenever you darken a cell into an Eclipse,{' '}
            <strong className="text-amber-300">all four orthogonal neighbors MUST be Lumen</strong>!
          </p>

          {/* Visual Cross Example */}
          <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
            <div className="grid grid-cols-3 gap-1.5 w-36">
              <div />
              <div className="h-10 rounded-lg bg-amber-500/30 border border-amber-400 flex items-center justify-center text-xs font-bold text-amber-300">
                ☀️ Lit
              </div>
              <div />

              <div className="h-10 rounded-lg bg-amber-500/30 border border-amber-400 flex items-center justify-center text-xs font-bold text-amber-300">
                ☀️ Lit
              </div>
              <div className="h-10 rounded-lg bg-[#0a0f1d] border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                🌑 Dark
              </div>
              <div className="h-10 rounded-lg bg-amber-500/30 border border-amber-400 flex items-center justify-center text-xs font-bold text-amber-300">
                ☀️ Lit
              </div>

              <div />
              <div className="h-10 rounded-lg bg-amber-500/30 border border-amber-400 flex items-center justify-center text-xs font-bold text-amber-300">
                ☀️ Lit
              </div>
              <div />
            </div>
            <div className="text-xs text-emerald-400 font-medium text-center mt-2">
              ✓ Every Eclipse is surrounded by Light. Shadows never touch!
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 relative animate-in fade-in zoom-in-95 duration-200">
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
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Guide ({currentStep + 1} of {steps.length})</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-white mt-1">
            {steps[currentStep].title}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {steps[currentStep].subtitle}
          </p>
        </div>

        {/* Content Body */}
        <div className="min-h-[260px] flex items-center">{steps[currentStep].content}</div>

        {/* Step Indicator & Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={`dot-${i}`}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-amber-400' : 'w-2 bg-slate-800'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-md shadow-amber-500/20 transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onStartCampaign();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/30 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Begin First Puzzle</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
