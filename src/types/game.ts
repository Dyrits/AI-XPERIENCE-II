export type CellState = 'empty' | 'lumen' | 'eclipse' | 'marked';

export interface CellData {
  row: number;
  col: number;
  value: number;
  state: CellState;
}

export type Difficulty = 'dawn' | 'solar' | 'eclipse' | 'supernova';

export interface PuzzleDefinition {
  id: string;
  title: string;
  size: number;
  difficulty: Difficulty;
  grid: number[][];
  rowTargets: number[];
  colTargets: number[];
  solution?: ('lumen' | 'eclipse')[][];
  isDaily?: boolean;
  dateStr?: string;
}

export interface LineStatus {
  index: number;
  currentSum: number;
  targetSum: number;
  isComplete: boolean;
  isSatisfied: boolean;
  isExceeded: boolean;
  hasDuplicates: boolean;
  duplicateValues: number[];
}

export interface AdjacencyViolation {
  cellA: [number, number];
  cellB: [number, number];
}

export interface ValidationResult {
  isSolved: boolean;
  rowStatuses: LineStatus[];
  colStatuses: LineStatus[];
  adjacencyViolations: AdjacencyViolation[];
  hasAnyViolation: boolean;
  allCellsDecided: boolean;
}

export interface GameMove {
  row: number;
  col: number;
  prevState: CellState;
  newState: CellState;
}

export type InputTool = 'lumen' | 'eclipse' | 'marked' | 'eraser';

export interface GameStats {
  puzzlesSolved: number;
  totalTimeSeconds: number;
  currentStreak: number;
  bestStreak: number;
  hintsUsed: number;
}
