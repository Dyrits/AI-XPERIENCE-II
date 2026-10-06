# AI-XPERIENCE, volume 2

One prompt, different AI models, new logic games.

Each branch receives the same prompt. The model invents a puzzle and builds a responsive web application to play it. This volume explores games in the spirit of sudoku, kakuro, hitori, and nonograms.

## Play the games

| Game | Model | Play |
| --- | --- | --- |
| Petal | GPT-6 Astra | [Open Petal](https://petal-5ai.pages.dev/) |
| Lumina | Gemini 3.8 Flash | [Open Lumina](https://lumina-e8t.pages.dev/) |
| Mothlight | Claude Opus 5.5 | [Open Mothlight](https://mothlight-3os.pages.dev/) |
| Conflux | GLM 5.3 | [Open Conflux](https://conflux-dqz.pages.dev/) |

**Petal** is a garden logic puzzle. Plant flowers in pairs, match the row and column counts, and keep separate pairs from sharing an edge.

**Lumina** is a celestial logic grid. Use sum targets, duplicate constraints, and non-adjacent shadows to deduce which cells to shade.

**Mothlight** is a night-time logic puzzle. Turn every moth toward a lamp. Each moth flies to the first lamp it faces, and each lamp's number says how many moths must reach it.

**Conflux** is a watershed puzzle. Turn the arrow on every slope so rain drains into the pools, with no loops, until each pool holds exactly the number of cells shown on it.

## The shared prompt

```text
Invent a new game like sudoku, kakuro, hitori, or nonograms.
Create a web application to play that game. It must be visually clean, appealing and entertaining.
Be creative.
It must be responsive.
Don't ask any question. Build it as you see fit.
```

## Browse the collection

Open [index.html](index.html) in a browser. The landing page links to all four hosted games and includes the shared prompt.

The page is self-contained HTML and CSS, with no build step, JavaScript, or external assets. It can also be served by any static web host.
