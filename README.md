# Mothlight

A logic puzzle about moths and lamps, in the family of Sudoku, Kakuro and Nonograms.

## Rules

1. Every cell that isn't a lamp holds a moth. Turn each moth up, down, left or right.
2. A moth flies straight to the **first** lamp in the direction it faces. Lamps block the view; moths don't.
3. A lamp's number is how many moths fly to it. When the count matches, the lamp lights up.

Light every lamp to win. Each puzzle has exactly one solution, and you can always reach it by logic alone.

## Playing

Open `index.html` in a browser. There's no build step and no dependencies.

| Action | Touch | Mouse | Keyboard |
| --- | --- | --- | --- |
| Turn a moth | Tap | Click (right-click turns back) | Space |
| Aim directly | Swipe toward a lamp | Drag toward a lamp | W A S D |
| Clear a moth | Long-press | Long-press | Backspace |
| Move the cursor | | | Arrow keys |
| Undo / redo | Buttons | Buttons | Z / Y |
| Hint | Button | Button | H |

There are four difficulties (5×5 to 8×8) plus a **Daily moth**: everyone gets the same 7×7 puzzle each day, and solving it on consecutive days builds a streak. Progress, best times and settings are saved in `localStorage`.

A hint first points out any moth that's flying the wrong way. If none are, it places the next moth that can be deduced from the board.

## How it works

- `js/engine.js` builds the board geometry, solves puzzles by constraint propagation with backtracking, and generates them. The generator places lamps at random, picks a random solution and derives the lamp numbers. Wherever the solution isn't unique, it pins a moth, then removes any pins that turn out to be unnecessary. It keeps the best of many candidates.
- `js/app.js` handles rendering, input, sound (Web Audio), saving, and the win animation.
- `styles.css` contains the night-sky look. The layout is responsive, from phones up to desktop.
