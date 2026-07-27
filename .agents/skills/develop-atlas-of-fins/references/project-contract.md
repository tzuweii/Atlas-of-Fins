# Atlas of Fins project contract

## Live sources of truth

Read only what the task needs:

- `package.json`: executable version and commands.
- `README.md`: player/developer entry points.
- `docs/GAME_DESIGN.md`: stable gameplay rules.
- `docs/MAIN_STORY.md`: six-region story, NPC arcs, handoffs, and main-story journal pages.
- `docs/DEVELOPMENT_GUIDE.md`: workflow and validation policy.
- `docs/CURRENT.md`: implemented state and next content pack.
- `docs/ASSET_LICENSES.md`: asset provenance.

`docs/versions/` is completed version history. `docs/archive/` is superseded reasoning or status history. Neither is a routine synchronization target.

## Stable engineering boundaries

- Keep content data-driven with stable unique IDs and validate references at startup/test time.
- Keep region, route, fish habitat, observation, research, resident story, and journal content separate from UI rendering.
- Preserve main and backup saves byte-for-byte before migrations that rewrite a valid older state.
- Keep normal and developer saves isolated.
- New content IDs usually do not require a save-version bump; migrate only when old state cannot normalize safely.
- Automatic/offline fishing must not discover rare fish, advance main story, create journal unlocks, or emit retroactive rewards.
- Journal pages are fixed catalog content. Saves store encounter lines and read/unread state, not daily prose history or copied story text.
- Use the existing HTML/CSS/SVG visual baseline and established asset resolver unless an authorized art task changes it.
- Preserve pointer, keyboard, touch, responsive layout, and non-color state cues when the affected UI uses them.

## Working-tree safety

- Inspect status and diff before editing.
- Preserve unrelated changes and untracked files.
- Never use destructive Git recovery for convenience.
- A request to implement does not imply permission to commit, merge, or push.
