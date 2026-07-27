# Document synchronization

Update the owner of a changed fact, not every file that mentions the project.

| Changed fact | Live owner |
|---|---|
| Stable game rule or limit | `docs/GAME_DESIGN.md` |
| Main-story meaning, NPC arc, chapter handoff, story journal | `docs/MAIN_STORY.md` |
| Development routing or validation policy | `docs/DEVELOPMENT_GUIDE.md` |
| Implemented status or next work package | `docs/CURRENT.md` |
| Player/developer start instructions | `README.md` |
| External asset source or license | `docs/ASSET_LICENSES.md` |

## Routine change

1. Update the one live owner.
2. Update `docs/CURRENT.md` only if implemented state or next work changes.
3. Update `README.md` only if player-visible features or commands change.
4. Run the live-document link checker.

Do not update historical test counts, completed version plans, old progress logs, or superseded proposals.

## Version close

At a real version close, create/finalize its plan and evidence report under `docs/versions/vX.Y/`, update current player-visible facts, then freeze the version documents. Use the all-docs checker only to repair links, not to rewrite old decisions as current truth.

## Status language

Use `planned`, `in progress`, `implemented`, or `verified` precisely. A design decision is not implemented; a unit-tested subsystem is not necessarily browser-verified; historical documents remain historical even when current behavior changes.
