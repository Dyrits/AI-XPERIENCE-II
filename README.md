# Conflux

An original watershed logic puzzle, in the family of sudoku, kakuro, hitori and nonograms.

Rain falls on every cell of a grid. **Pools** (the numbered cells) collect it; every other cell is a **slope** whose arrow can be turned. Rotate the slopes so that water flows, cell after cell, into the pools — until every pool is *exactly* full.

## The rules

1. Every slope's arrow points to an orthogonal neighbour. Tap (or space) turns it clockwise; long-press, right-click or shift-space turns it back. Grey arrows are carved in stone and never move.
2. Water follows the arrows and must always reach a pool — arrows may never form a loop.
3. The number on a pool is exactly how many cells drain into it, counting the pool itself.
4. The ring around each pool fills as water is routed to it. Exactly full is right; overfull is a flood.

When the whole board drains and every ring sits exactly on its number, the watershed settles and you win.

## Play

Open `index.html` in any browser, or serve the folder:

```sh
python3 -m http.server 8080
```

Three difficulties are generated on demand — *Gentle rain* (6×6), *Steady storm* (8×8) and *Deluge* (10×10). The board is a living map: as you turn slopes, cells take on the colour of the pool they currently drain to, so your reasoning shows up as regions of tint. Progress, best times and sound settings persist in `localStorage`.

Keyboard: arrow keys move, space/enter rotate, shift rotates back, `u` undo, `h` hint, `n` new rain.

## How puzzles are made

Every puzzle is generated in the browser and is guaranteed to have exactly one solution.

1. Springs are scattered with minimum spacing; each gets a capacity, all capacities summing to the grid.
2. Basins are grown by random frontier expansion, and each cell's arrow is oriented along a tree towards its spring — a full valid watershed.
3. Arrows are carved away one at a time, keeping each removal only while the puzzle stays provably unique.

Uniqueness is decided by a solver that enumerates basin **partitions** (connected regions matching the capacities) and counts the arrow layouts inside each basin with the directed matrix-tree theorem — givens pin a cell's out-flow to its carved direction. A second, independent solver that searches arrow assignments directly cross-checks it; the test suite verifies both agree on hundreds of random boards.

```sh
node tests/engine.test.js   # correctness + uniqueness + timing
node tests/bench.js steady 5
```

## Files

- `index.html` / `styles.css` — the page and the night-rain theme
- `js/engine.js` — generation, solving, flow analysis (no dependencies)
- `js/app.js` — board rendering, input, effects, persistence
- `js/sound.js` — small WebAudio synth (pentatonic plinks)
- `tests/` — node test suite and benchmark

Built as GLM-5.3's entry for AI-XPERIENCE volume 2 — one prompt, many models.
