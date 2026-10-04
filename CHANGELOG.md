## CHG-0001 · 2026-10-04 · Build Petal

Type: Code
Event: Delivery
Scope: Original responsive logic puzzle

Summary: Created Petal from an empty repository in response to the request for an original, appealing, entertaining, responsive puzzle web application. Includes uniquely solvable paired-flower gardens, daily and free-play modes, three difficulty levels, hints, checks, undo, reset, local saves, optional sound, keyboard controls, and a completion screen.
References: [Run and play](README.md), [puzzle engine](src/game.js), [browser verification](tests/browser.spec.js).
Validation: Production build, seven engine tests, thirteen browser tests, and formatting checks pass. Desktop and phone screenshots were inspected. Independent review covered game validity, saved state, keyboard access, hint announcements, dates, and narrow layouts.
Evidence: Engine verification additionally covered 3,000 generated puzzles across three difficulty levels, with valid, unique solutions. Browser regression tests cover interaction, completion, saved free play, daily restoration, 320px and 375px layouts, focus management, keyboard boundaries, clue descriptions, hints, incorrect entries, midnight rollover, corrupt storage, and sound toggling. The repository had no starting commit.
