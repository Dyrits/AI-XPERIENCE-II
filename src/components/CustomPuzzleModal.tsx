import React, { useState } from 'react';
import { X, Wrench, Download, Copy, Check, Play } from 'lucide-react';
import { PuzzleDefinition, Difficulty } from '../types/game';
import { generatePuzzle } from '../game/generator';

interface CustomPuzzleModalProps {
  isOpen: boolean;
  currentPuzzle: PuzzleDefinition;
  onClose: () => void;
  onLoadPuzzle: (puzzle: PuzzleDefinition) => void;
}

export const CustomPuzzleModal: React.FC<CustomPuzzleModalProps> = ({
  isOpen,
  currentPuzzle,
  onClose,
  onLoadPuzzle,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('solar');
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [copied, setCopied] = useState(false);

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

  // Encode current puzzle to compact base64
  const exportPuzzleCode = (puzzle: PuzzleDefinition): string => {
    const data = {
      t: puzzle.title,
      s: puzzle.size,
      d: puzzle.difficulty,
      g: puzzle.grid,
      r: puzzle.rowTargets,
      c: puzzle.colTargets,
    };
    return btoa(JSON.stringify(data));
  };

  const currentCode = exportPuzzleCode(currentPuzzle);

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerate = () => {
    const newPuzzle = generatePuzzle(selectedDifficulty);
    onLoadPuzzle(newPuzzle);
    onClose();
  };

  const handleImport = () => {
    try {
      setImportError('');
      const decoded = JSON.parse(atob(importCode.trim()));
      if (!decoded.s || !decoded.g || !decoded.r || !decoded.c) {
        throw new Error('Invalid puzzle format');
      }
      const imported: PuzzleDefinition = {
        id: `custom-${Date.now()}`,
        title: decoded.t || 'Custom Cosmos',
        size: decoded.s,
        difficulty: decoded.d || 'solar',
        grid: decoded.g,
        rowTargets: decoded.r,
        colTargets: decoded.c,
      };
      onLoadPuzzle(imported);
      onClose();
    } catch {
      setImportError('Invalid puzzle code. Please check and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-white">Puzzle Forge & Share</h2>
            <p className="text-xs text-slate-400">Generate fresh boards or share puzzles via code</p>
          </div>
        </div>

        {/* Section 1: Generate Custom Puzzle */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
            1. Generate Random Difficulty
          </div>

          <div className="grid grid-cols-4 gap-2">
            {(['dawn', 'solar', 'eclipse', 'supernova'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(d)}
                className={`py-2 px-1 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  selectedDifficulty === d
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Generate & Play ({selectedDifficulty})</span>
          </button>
        </div>

        {/* Section 2: Share / Export Current Puzzle */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              2. Share Current Board
            </div>
            <button
              onClick={handleCopyCode}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 truncate">
            {currentCode}
          </div>
        </div>

        {/* Section 3: Import / Load Puzzle Code */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
            3. Import Shared Puzzle
          </div>

          <input
            type="text"
            placeholder="Paste puzzle code here..."
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60"
          />

          {importError && (
            <div className="text-xs text-rose-400 font-medium">{importError}</div>
          )}

          <button
            onClick={handleImport}
            disabled={!importCode.trim()}
            className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Load & Play Puzzle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
