# v3 save baselines

These JSON files are immutable inputs captured for the v0.4 Slice A migration suite:

- **v3-normal-save.json**: an early normal journey with partial daily-goal progress.
- **v3-progressed-save.json**: a higher-completion normal journey with claimed rewards and an active bay event.
- **v3-developer-save.json**: the legacy 20-species developer-save shape that must be backfilled without touching the normal save.

Keep these files at schema version 3. Add new fixtures instead of rewriting them when the save schema changes.
