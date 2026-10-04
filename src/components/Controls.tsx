import React from 'react';
import { InputTool } from '../types/game';
import { Sun, Moon, Sparkles, Undo2, Redo2, Lightbulb, RotateCcw, CheckCircle2 } from 'lucide-react';

interface ControlsProps {
  selectedTool: InputTool;
  onSelectTool: (tool: InputTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onHint: () => void;
  onCheck: () => void;
  onRestart: () => void;
  isCompleted: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  selectedTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onHint,
  onCheck,
  onRestart,
  isCompleted,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-2 flex flex-col gap-3">
      {/* Primary Tool Selector */}
      <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        {/* Lumen Tool */}
        <button
          onClick={() => onSelectTool('lumen')}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-display text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
            selectedTool === 'lumen'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-bold scale-[1.02]'
              : 'text-slate-300 hover:text-amber-300 hover:bg-slate-800/60'
          }`}
        >
          <Sun className={`w-4 h-4 sm:w-5 sm:h-5 ${selectedTool === 'lumen' ? 'text-slate-950' : 'text-amber-400'}`} />
          <span>Lumen</span>
        </button>

        {/* Eclipse Tool */}
        <button
          onClick={() => onSelectTool('eclipse')}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-display text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
            selectedTool === 'eclipse'
              ? 'bg-slate-800 border border-slate-600 text-slate-100 shadow-md font-bold scale-[1.02]'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Moon className={`w-4 h-4 sm:w-5 sm:h-5 ${selectedTool === 'eclipse' ? 'text-slate-200' : 'text-slate-400'}`} />
          <span>Eclipse</span>
        </button>

        {/* Note / Mark Tool */}
        <button
          onClick={() => onSelectTool('marked')}
          className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-display text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
            selectedTool === 'marked'
              ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 shadow-md font-bold scale-[1.02]'
              : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${selectedTool === 'marked' ? 'text-cyan-300' : 'text-cyan-400'}`} />
          <span>Note</span>
        </button>

        {/* Clear Tool */}
        <button
          onClick={() => onSelectTool('eraser')}
          className={`px-3 py-2 sm:py-2.5 rounded-xl flex items-center justify-center gap-1 font-display text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
            selectedTool === 'eraser'
              ? 'bg-rose-500/20 border border-rose-400/50 text-rose-200 shadow-md'
              : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/60'
          }`}
          title="Eraser / Clear cell"
        >
          <span>Clear</span>
        </button>
      </div>

      {/* Auxiliary Action Bar: Undo, Redo, Hint, Check, Restart */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo || isCompleted}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo || isCompleted}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Redo</span>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onHint}
            disabled={isCompleted}
            className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
            title="Get a Deductive Hint"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Hint</span>
          </button>

          <button
            onClick={onCheck}
            disabled={isCompleted}
            className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
            title="Validate Current State"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>Check</span>
          </button>

          <button
            onClick={onRestart}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
            title="Reset Board"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Helpful Hint / Tip */}
      <div className="text-center text-[11px] text-slate-500 font-mono">
        <span className="hidden sm:inline">Desktop shortcut: Left-click for Lumen • Right-click for Eclipse • 1/2/3 for tools</span>
        <span className="sm:hidden">Tap to apply active tool • Select tool above</span>
      </div>
    </div>
  );
};
