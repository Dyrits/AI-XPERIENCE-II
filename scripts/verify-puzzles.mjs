// Verification and generation script for Lumina puzzles
function solve(grid, rowTargets, colTargets, maxSol = 2) {
  const size = grid.length;
  const solutions = [];
  const board = Array.from({ length: size }, () => Array(size).fill(-1));
  const rowSums = Array(size).fill(0);
  const colSums = Array(size).fill(0);
  const rowValues = Array.from({ length: size }, () => new Set());
  const colValues = Array.from({ length: size }, () => new Set());

  const rowMax = Array(size).fill(0);
  const colMax = Array(size).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      rowMax[r] += grid[r][c];
      colMax[c] += grid[r][c];
    }
  }

  function search(idx) {
    if (solutions.length >= maxSol) return true;
    if (idx === size * size) {
      for (let i = 0; i < size; i++) {
        if (rowSums[i] !== rowTargets[i] || colSums[i] !== colTargets[i]) return false;
      }
      solutions.push(board.map(r => r.map(v => (v === 1 ? 'lumen' : 'eclipse'))));
      return solutions.length >= maxSol;
    }

    const r = Math.floor(idx / size);
    const c = idx % size;
    const val = grid[r][c];

    // Try Lumen (1)
    const canLumen =
      rowSums[r] + val <= rowTargets[r] &&
      colSums[c] + val <= colTargets[c] &&
      !rowValues[r].has(val) &&
      !colValues[c].has(val);

    if (canLumen) {
      board[r][c] = 1;
      rowSums[r] += val;
      colSums[c] += val;
      rowValues[r].add(val);
      colValues[c].add(val);
      rowMax[r] -= val;
      colMax[c] -= val;

      if (rowSums[r] + rowMax[r] >= rowTargets[r] && colSums[c] + colMax[c] >= colTargets[c]) {
        if (search(idx + 1)) return true;
      }

      board[r][c] = -1;
      rowSums[r] -= val;
      colSums[c] -= val;
      rowValues[r].delete(val);
      colValues[c].delete(val);
      rowMax[r] += val;
      colMax[c] += val;
    }

    // Try Eclipse (0)
    let canEclipse = true;
    if (r > 0 && board[r - 1][c] === 0) canEclipse = false;
    if (c > 0 && board[r][c - 1] === 0) canEclipse = false;

    rowMax[r] -= val;
    colMax[c] -= val;
    if (rowSums[r] + rowMax[r] < rowTargets[r] || colSums[c] + colMax[c] < colTargets[c]) {
      canEclipse = false;
    }

    if (canEclipse) {
      board[r][c] = 0;
      if (search(idx + 1)) return true;
      board[r][c] = -1;
    }

    rowMax[r] += val;
    colMax[c] += val;

    return false;
  }

  search(0);
  return solutions;
}

function generate(size, maxVal, targetEclipseRatio = 0.3) {
  for (let it = 0; it < 500; it++) {
    // Generate valid mask
    const mask = Array.from({ length: size }, () => Array(size).fill(1));
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) cells.push([r, c]);
    }
    // Shuffle
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const targetEclipses = Math.floor(size * size * targetEclipseRatio);
    let eclipseCount = 0;
    for (const [r, c] of cells) {
      if (eclipseCount >= targetEclipses) break;
      let hasAdj = false;
      for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && mask[nr][nc] === 0) {
          hasAdj = true;
          break;
        }
      }
      if (!hasAdj) {
        mask[r][c] = 0;
        eclipseCount++;
      }
    }

    // Grid numbers
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    for (let r = 0; r < size; r++) {
      const usedRow = new Set();
      for (let c = 0; c < size; c++) {
        let v = Math.floor(Math.random() * maxVal) + 1;
        if (mask[r][c] === 1) {
          let tr = 0;
          while (usedRow.has(v) && tr < 30) {
            v = Math.floor(Math.random() * maxVal) + 1;
            tr++;
          }
          usedRow.add(v);
        }
        grid[r][c] = v;
      }
    }

    // Ensure col uniqueness for lumen
    let colOk = true;
    for (let c = 0; c < size; c++) {
      const usedCol = new Set();
      for (let r = 0; r < size; r++) {
        if (mask[r][c] === 1) {
          if (usedCol.has(grid[r][c])) {
            // try swap with an eclipse cell in same row or random
            colOk = false;
            break;
          }
          usedCol.add(grid[r][c]);
        }
      }
      if (!colOk) break;
    }
    if (!colOk) continue;

    const rowTargets = Array(size).fill(0);
    const colTargets = Array(size).fill(0);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (mask[r][c] === 1) {
          rowTargets[r] += grid[r][c];
          colTargets[c] += grid[r][c];
        }
      }
    }

    const sols = solve(grid, rowTargets, colTargets, 2);
    if (sols.length === 1) {
      return { size, grid, rowTargets, colTargets, solution: sols[0] };
    }
  }
  return null;
}

console.log("Generating sample puzzles...");
for (const s of [4, 5, 6]) {
  const p = generate(s, s <= 4 ? 6 : s === 5 ? 7 : 8);
  console.log(`Size ${s}: ${p ? 'SUCCESS' : 'FAILED'}`);
}
