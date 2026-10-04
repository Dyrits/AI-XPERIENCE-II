# LUMINA: Celestial Logic Grid ☀️🌑

An original pencil-and-paper style logic puzzle game inspired by Sudoku, Kakuro, and Hitori.

---

## 🌟 The Concept

**LUMINA** is played on an $N \times N$ celestial grid of rune stones inscribed with numbers. Every cell in the grid must be designated as either:
- **LUMEN (☀️)**: An illuminated star cell that contributes its value to the line's harmonic sum.
- **ECLIPSE (🌑)**: A shadowed void cell that does not contribute to the sum.
- **NOTE (✦)**: A tentative pencil mark for player deduction.

---

## 📜 The Three Rules of Lumina

Every puzzle is solvable with 100% deterministic human logic, without guessing.

1. **Harmonic Sums (The Kakuro Principle)**:
   The numbers outside each row and column indicate the exact target sum of all illuminated **LUMEN** cells in that line.
2. **Resonance Uniqueness (The Sudoku Principle)**:
   In any single row or column, no two illuminated **LUMEN** cells may display the same number value (all active numbers in a line must be unique).
3. **The Shadow Barrier (The Hitori Principle)**:
   No two **ECLIPSE** cells may share an edge horizontally or vertically. Shadows never touch! Whenever a cell is darkened into Eclipse, all 4 of its orthogonal neighbors MUST be illuminated as Lumen.

---

## 🎮 Features

- **Rich Campaign**: 27 verified levels spanning 4 difficulty tiers:
  - **Dawn (4×4)**: Gentle introduction to deductive patterns.
  - **Solar (5×5)**: Engaging, tactical cross-sum deductions.
  - **Eclipse (6×6)**: Deep multi-step logical chains.
  - **Supernova (7×7)**: Expert-tier logic challenges.
- **Daily Challenge Mode**: A new puzzle every day with persistent streak tracking.
- **Infinite Random Generator**: Instant on-device procedural generation with guaranteed unique solutions.
- **Custom Puzzle Forge & Sharing**: Export puzzles into compact codes to share with friends, or import shared puzzle codes.
- **Intelligent Deductive Hint Engine**: Rather than merely giving away the answer, hints explain the *why* (e.g., target sum met, duplicate prevention, shadow adjacency, or sum bounds).
- **Organic Web Audio Synthesizer**: Harmonious chimes for star activations, acoustic slate clicks for shadows, resonant chords on line completions, and celestial fanfare upon solving.
- **Fully Responsive & Accessible**: Flawless tactile controls on desktop, tablet, and mobile with keyboard shortcuts, right-click actions, and drag-to-paint.

---

## 🚀 Getting Started

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Keyboard Shortcuts
- `1` or `L`: Select **Lumen** tool
- `2` or `E`: Select **Eclipse** tool
- `3` or `N`: Select **Note** tool
- `4` or `C`: Select **Clear** tool
- `Ctrl + Z` / `Cmd + Z`: **Undo**
- `Ctrl + Y` / `Cmd + Y`: **Redo**
- `H`: Intelligent **Hint**
- `R`: **Restart** Board
- Right-click on desktop: Directly toggle **Eclipse**
