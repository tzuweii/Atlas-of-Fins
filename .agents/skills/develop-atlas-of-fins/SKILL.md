---
name: develop-atlas-of-fins
description: Develop, repair, validate, document, or release Atlas of Fins. Routes mature content work through a region-plus-story-chapter pipeline, uses engineering Slices only for risky shared-system or save changes, preserves data-driven content and HTML/CSS/SVG contracts, and can manage version branches, commits, integration, or pushes when the user explicitly includes them.
---

# Develop Atlas of Fins

Treat Atlas of Fins as a mature game whose default evolution is adding complete region content packs and a connected main-story chapter. Do not turn every design rule or content change into a new version Slice.

## Establish scope

1. Confirm the repository with `package.json`, `docs/README.md`, and Git root.
2. Read [references/project-contract.md](references/project-contract.md).
3. Inspect `git status --short --branch`; preserve unrelated user changes.
4. Match authorization exactly. Review stays read-only; change requests may edit and validate; commit, merge, branch deletion, or push require the request to include them.
5. Route the task before creating a plan:
   - **Design rule or focused repair:** edit the current rule, code, and direct tests. It is version-neutral unless the user says otherwise.
   - **Region + chapter content:** use the default content workflow below.
   - **Shared engine or save change:** use engineering Slices only when the risk actually needs checkpoints.
   - **Version finalization:** perform release-level validation and Git integration only within the authorized boundary.

## Default: region + chapter content

Read [references/region-chapter-workflow.md](references/region-chapter-workflow.md), then:

1. Read only `docs/GAME_DESIGN.md`, `docs/MAIN_STORY.md`, `docs/DEVELOPMENT_GUIDE.md`, `docs/CURRENT.md`, and the target region specification if one exists.
2. Define the previous-chapter handoff, the region's ecological identity, the resident arc, the fixed journal pages, and one next-chapter hook before declaring the region complete.
3. Implement data IDs and validation first, then region hardware (route, locations, fish, observation, research), then NPC scenes, events, and fixed journal pages.
4. Region hardware may exist temporarily as a content skeleton, but do not mark the region complete without its chapter content.
5. Add developer positioning only when existing data-driven controls cannot reach the new state.
6. Validate in proportion to the content risk. Update `docs/MAIN_STORY.md` for story truth and replace only the affected part of `docs/CURRENT.md`.

## Exception: shared engine change

Read [references/engine-change-workflow.md](references/engine-change-workflow.md) when changing saves, migrations, cross-system events, economy, navigation architecture, fishing architecture, or another dependency chain that benefits from independently playable checkpoints.

- A focused design-rule implementation can remain one verified change.
- A version plan and `feat/vX.Y` branch are created only when the user starts a version or the requested delivery truly spans multiple Slices.
- Every Slice must leave the game playable and save-compatible, but a small change does not need an artificial `Slice A`.

## Documents

Use [references/document-sync.md](references/document-sync.md). A fact has one live owner:

- permanent gameplay rule → `docs/GAME_DESIGN.md`
- six-region story and journal chapter continuity → `docs/MAIN_STORY.md`
- workflow → `docs/DEVELOPMENT_GUIDE.md`
- current state and next work package → `docs/CURRENT.md`
- external asset source or license → `docs/ASSET_LICENSES.md`

`docs/versions/` and `docs/archive/` are frozen history. Do not synchronize them during routine work.

## Validate by risk

- Focused rule or text/data change: syntax/content validation plus direct unit tests.
- Fish, location, NPC, or journal page: above plus save reload and one browser path.
- Complete region: above plus outbound/return travel, narrow screen, and uncaught exception checks.
- Shared system/save or release: full unit fixtures, Chromium flow, relevant stress models, document links, and migration/backup evidence.

Use `scripts/check-doc-consistency.mjs` for live-document links. Use `--all-docs` only for release maintenance. Use `scripts/validate-slice.sh`, `--region`, or `--full` according to the same risk levels.

## Git and version boundaries

1. Do not infer v0.6 or create its Slice from an unrelated design-rule change.
2. Do not bump versions, create branches, commit, merge, or push unless the requested workflow includes that action.
3. When a multi-Slice version is explicitly started, use `feat/vX.Y`, one recoverable commit per real Slice, and `--ff-only` integration.
4. Never reset, discard, amend, force-push, or delete branches without explicit authorization.
5. Stop before a Git checkpoint if tests are red, save compatibility is unverified, or unrelated changes overlap the task.
