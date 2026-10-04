import React, { useRef, useState } from 'react';
import { CellState, ValidationResult, InputTool } from '../types/game';
import { Sparkles, AlertCircle, Sun, Moon } from 'lucide-react';

interface GameBoardProps {
  grid: number[][];
  cellStates: CellState[][];
  rowTargets: number[];
  colTargets: number[];
  validation: ValidationResult;
  selectedTool: InputTool;
  onCellClick: (row: number, col: number, isRightClick?: boolean) => void;
  onCellDrag: (row: number, col: number) => void;
  isCompleted: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  cellStates,
  rowTargets,
  colTargets,
  validation,
  selectedTool: _selectedTool,
  onCellClick,
  onCellDrag,
  isCompleted,
}) => {
  const isDraggingRef = useRef(false);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);

  // Check if cell is part of an adjacency violation (two adjacent eclipse cells)
  const isAdjacencyViolator = (r: number, c: number): boolean => {
    return validation.adjacencyViolations.some(
      (v) => (v.cellA[0] === r && v.cellA[1] === c) || (v.cellB[0] === r && v.cellB[1] === c)
    );
  };

  // Check if cell is a duplicate lumen in its row or column
  const isDuplicateLumen = (r: number, c: number): boolean => {
    if (cellStates[r][c] !== 'lumen') return false;
    const val = grid[r][c];
    const rowStatus = validation.rowStatuses[r];
    const colStatus = validation.colStatuses[c];
    return (
      (rowStatus && rowStatus.duplicateValues.includes(val)) ||
      (colStatus && colStatus.duplicateValues.includes(val))
    );
  };

  const handleMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (isCompleted) return;
    if (e.button === 2) {
      // Right click: toggle Eclipse
      e.preventDefault();
      onCellClick(r, c, true);
    } else if (e.button === 0) {
      // Left click
      isDraggingRef.current = true;
      onCellClick(r, c, false);
    }
  };

  const handleMouseEnter = (r: number, c: number) => {
    setHoveredCell([r, c]);
    if (isDraggingRef.current && !isCompleted) {
      onCellDrag(r, c);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch drag support
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isCompleted) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const rowAttr = element.getAttribute('data-row');
      const colAttr = element.getAttribute('data-col');
      if (rowAttr !== null && colAttr !== null) {
        const r = parseInt(rowAttr, 10);
        const c = parseInt(colAttr, 10);
        onCellDrag(r, c);
      }
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center p-2 sm:p-4 select-none touch-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        setHoveredCell(null);
      }}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative inline-block rounded-2xl p-3 sm:p-5 board-container border border-slate-700/50 shadow-2xl shadow-black/80">
        {/* Subtle grid backdrop decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-cyan-500/5 rounded-2xl pointer-events-none" />

        <div className="relative flex flex-col">
          {/* Top Row: Empty Corner + Column Targets */}
          <div className="flex">
            {/* Top-Left Corner Box */}
            <div className="w-10 sm:w-14 md:w-16 h-10 sm:h-14 md:h-16 flex items-center justify-center mr-1 sm:mr-2">
              <div className="text-[10px] sm:text-xs font-mono text-slate-500 flex flex-col items-center justify-center opacity-60">
                <span className="text-amber-400/80">SUM</span>
                <span>TARGET</span>
              </div>
            </div>

            {/* Column Target Headers */}
            <div className="flex gap-1 sm:gap-2">
              {colTargets.map((target, c) => {
                const status = validation.colStatuses[c];
                const currentSum = status ? status.currentSum : 0;
                const isSatisfied = status ? status.isSatisfied : false;
                const isExceeded = status ? status.isExceeded : false;
                const hasDups = status ? status.hasDuplicates : false;
                const isColHovered = hoveredCell && hoveredCell[1] === c;

                return (
                  <div
                    key={`col-target-${c}`}
                    className={`w-10 sm:w-14 md:w-16 h-10 sm:h-14 md:h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-200 border ${
                      isSatisfied
                        ? 'bg-amber-500/20 border-amber-400/60 shadow-lg shadow-amber-500/10 text-amber-300'
                        : isExceeded || hasDups
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                        : isColHovered
                        ? 'bg-slate-800/90 border-slate-600 text-slate-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="font-display font-bold text-sm sm:text-lg md:text-xl leading-none">
                        {target}
                      </span>
                      {isSatisfied && <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />}
                      {(isExceeded || hasDups) && (
                        <AlertCircle className="w-3 h-3 text-rose-400 animate-bounce" />
                      )}
                    </div>
                    <div className="text-[9px] sm:text-[11px] font-mono leading-none mt-0.5 opacity-80">
                      <span className={currentSum > target ? 'text-rose-400 font-bold' : ''}>
                        {currentSum}
                      </span>
                      <span className="text-slate-500">/{target}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Rows: Row Target + Cells */}
          <div className="flex flex-col gap-1 sm:gap-2 mt-1 sm:mt-2">
            {grid.map((row, r) => {
              const rowStatus = validation.rowStatuses[r];
              const currentRowSum = rowStatus ? rowStatus.currentSum : 0;
              const isRowSatisfied = rowStatus ? rowStatus.isSatisfied : false;
              const isRowExceeded = rowStatus ? rowStatus.isExceeded : false;
              const hasRowDups = rowStatus ? rowStatus.hasDuplicates : false;
              const target = rowTargets[r];
              const isRowHovered = hoveredCell && hoveredCell[0] === r;

              return (
                <div key={`row-${r}`} className="flex items-center">
                  {/* Row Target Header */}
                  <div
                    className={`w-10 sm:w-14 md:w-16 h-10 sm:h-14 md:h-16 rounded-xl flex flex-col items-center justify-center mr-1 sm:mr-2 transition-all duration-200 border ${
                      isRowSatisfied
                        ? 'bg-amber-500/20 border-amber-400/60 shadow-lg shadow-amber-500/10 text-amber-300'
                        : isRowExceeded || hasRowDups
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                        : isRowHovered
                        ? 'bg-slate-800/90 border-slate-600 text-slate-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="font-display font-bold text-sm sm:text-lg md:text-xl leading-none">
                        {target}
                      </span>
                      {isRowSatisfied && <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />}
                      {(isRowExceeded || hasRowDups) && (
                        <AlertCircle className="w-3 h-3 text-rose-400 animate-bounce" />
                      )}
                    </div>
                    <div className="text-[9px] sm:text-[11px] font-mono leading-none mt-0.5 opacity-80">
                      <span className={currentRowSum > target ? 'text-rose-400 font-bold' : ''}>
                        {currentRowSum}
                      </span>
                      <span className="text-slate-500">/{target}</span>
                    </div>
                  </div>

                  {/* Row Cells */}
                  <div className="flex gap-1 sm:gap-2">
                    {row.map((val, c) => {
                      const state = cellStates[r][c];
                      const isLumen = state === 'lumen';
                      const isEclipse = state === 'eclipse';
                      const isMarked = state === 'marked';
                      const isAdjViolator = isAdjacencyViolator(r, c);
                      const isDup = isDuplicateLumen(r, c);

                      let cellStyle =
                        'bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-slate-600';
                      if (isLumen) {
                        cellStyle =
                          'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-amber-300 lumen-glow font-bold';
                      } else if (isEclipse) {
                        cellStyle =
                          'bg-[#0a0f1d] border-slate-800/80 text-slate-600 eclipse-sunken';
                      } else if (isMarked) {
                        cellStyle =
                          'bg-slate-800/90 border-cyan-500/50 text-slate-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]';
                      }

                      if (isAdjViolator) {
                        cellStyle += ' ring-2 ring-rose-500 border-rose-500 animate-pulse';
                      } else if (isDup) {
                        cellStyle += ' ring-2 ring-rose-400 border-rose-400 animate-pulse';
                      }

                      return (
                        <button
                          key={`cell-${r}-${c}`}
                          data-row={r}
                          data-col={c}
                          onMouseDown={(e) => handleMouseDown(r, c, e)}
                          onMouseEnter={() => handleMouseEnter(r, c)}
                          disabled={isCompleted}
                          aria-label={`Cell at row ${r + 1}, column ${c + 1}, value ${val}, state ${state}`}
                          className={`relative w-10 sm:w-14 md:w-16 h-10 sm:h-14 md:h-16 rounded-xl border flex items-center justify-center text-base sm:text-xl md:text-2xl font-display transition-all duration-150 transform active:scale-95 cursor-pointer ${cellStyle}`}
                        >
                          {/* Value Number */}
                          <span
                            className={`z-10 transition-opacity ${
                              isEclipse ? 'opacity-35 line-through decoration-slate-600' : 'opacity-100'
                            }`}
                          >
                            {val}
                          </span>

                          {/* Lumen Sun Icon / Accent */}
                          {isLumen && (
                            <Sun className="w-3.5 h-3.5 absolute top-1 right-1 text-amber-900/60 pointer-events-none" />
                          )}

                          {/* Eclipse Moon / Void Accent */}
                          {isEclipse && (
                            <Moon className="w-3 h-3 absolute top-1 right-1 text-slate-700 pointer-events-none" />
                          )}

                          {/* Marked Pencil Dot / Note Accent */}
                          {isMarked && (
                            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_4px_#38bdf8] pointer-events-none" />
                          )}

                          {/* Subtle adjacency violation warning badge */}
                          {isAdjViolator && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center text-[8px] text-white font-bold">
                              !
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
