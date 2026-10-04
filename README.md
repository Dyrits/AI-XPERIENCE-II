# Petal

A browser-based logic puzzle where flowers grow in pairs. Built with React and Vite.

## Play

```sh
npm install
npm run dev
```

Open the URL printed by Vite. No account, API keys, database, or backend service is needed.

### The rules

- Every flower must have exactly one flower directly above, below, left, or right of it.
- Each number gives the total flowers in that row or column.
- Different pairs cannot share an edge, but they may touch diagonally.
- Pebbles and flowers with a small dot are fixed clues.
- You win when all the flowers are correctly placed. Marking every empty square is optional.

Click or tap to plant or remove a flower. Right-click, use the **Mark empty** tool, or press **X** to mark a cell empty. Use arrow keys to navigate, Enter or Space to apply the selected tool, and Delete to clear a cell.

Daily gardens use your local date. Free play creates a new seeded puzzle. Gentle, Thoughtful, and Tricky puzzles have progressively fewer fixed clues. A solver checks every generated puzzle for a unique solution.

Hints reveal one cell from the solution; they are not claimed to be logical deductions. **Check** highlights incorrect entries without changing them. Progress, elapsed time, the selected garden, and hint counts are stored locally in your browser. The game remains playable when browser storage is unavailable, but progress cannot be saved then.

## Verify

```sh
npm test
npx playwright install chromium
npm run test:browser
npm run build
npm run format:check
```

Browser tests start their own Vite server on port 5189. Keep that port free. Engine tests use Node's built-in test runner.

## Project layout

- `src/game.js`: deterministic generation, solution counting, board validation, and hints.
- `src/game.test.js`: puzzle rule and generator tests.
- `src/App.jsx`: play interface, local progress, dialogs, keyboard controls, and illustrations.
- `src/styles.css`: responsive layouts, visual styling, and reduced-motion support.
- `tests/browser.spec.js`: browser-level gameplay and accessibility regressions.

The production build is a static site in `dist/`. Run `npm run preview` to inspect it, or serve that directory with any static host. Fonts load from Google Fonts with local sans-serif fallbacks. All other assets are bundled or inline SVG.
