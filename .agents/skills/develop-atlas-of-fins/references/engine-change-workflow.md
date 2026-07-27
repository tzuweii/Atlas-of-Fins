# Shared-engine change workflow

Use this workflow only when save, migration, cross-system events, economy, navigation, fishing architecture, or another dependency chain needs independently recoverable checkpoints.

## Decide whether Slices are justified

A Slice must produce a playable, testable behavior and remove a real dependency risk. Do not create one solely to match an old alpha count.

Good boundaries include:

- save schema + migration before consumers depend on it;
- content/event contract before rewards and UI;
- system behavior before presentation;
- integration/stress after all functional pieces exist.

A focused design rule, catalog addition, UI correction, or text rewrite normally remains one change.

## When an explicit multi-Slice version starts

1. Confirm target version, base branch, completion boundary, and Git authorization.
2. Create a compact `docs/versions/vX.Y/VX_Y_IMPLEMENTATION_PLAN.md` containing only objectives, dependencies, save impact, gates, and real Slices.
3. Create `feat/vX.Y` only after checking the worktree and intended base.
4. For each Slice: mark one item active, implement the smallest complete behavior, add deterministic tests, run its proportional gate, update live owner documents, and commit only if authorized.
5. Do not carry a known failure or incomplete migration into the next Slice.

## Version finalization

Run full unit fixtures, Chromium, narrow-screen and relevant stress scenarios. Record actual environment, save sizes, browser exceptions, and domain-specific scenario counts. Integrate with `--ff-only` and push only when explicitly authorized.
