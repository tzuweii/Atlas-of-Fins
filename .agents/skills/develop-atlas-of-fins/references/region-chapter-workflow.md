# Region + chapter content workflow

This is the default long-term production loop for Atlas of Fins.

## Content contract

Before implementation, answer:

1. What single observation, object, or natural clue arrives from the previous chapter?
2. What ecological relationship defines this region?
3. Which fish, locations, weather/tide differences, observations, and research make that relationship playable?
4. How does one principal resident make it emotionally concrete across four to six short scenes?
5. Which three to five fixed story events and journal pages prove the chapter progressed?
6. What permanent trace remains in the port, ship home, or chart?
7. What single natural clue points to the next region?

## Implementation order

1. Add stable region, route, location, fish, resident, scene, event, and journal IDs.
2. Extend content validation so missing and duplicate references fail clearly.
3. Build route and region hardware: map point, travel, docking, fishing locations, pools, observation, research, and local presentation.
4. Add resident scenes and story events using legal states the player can reach through regional play.
5. Add fixed journal copy and map each page to an explicit fish or story unlock.
6. Add only the developer positioning needed to reach new data states.
7. Test save normalization, out-and-back travel, chapter order, journal unlocks, narrow layout, and browser exceptions.

## Story continuity

- `docs/MAIN_STORY.md` owns the six-chapter arc. Region specs reference it instead of duplicating it.
- One primary handoff enters and one exits each chapter.
- Residents stay in their region and do not follow or message the player across seas.
- Journal text summarizes completed content; it does not unlock gameplay or invent unseen events.
- Hardware can land first as an explicitly unfinished skeleton, but a region is not complete until its resident, chapter, and fixed journal are integrated.

## Content-only save behavior

Prefer normalization from stable IDs. Adding catalog rows should not bump the save version by habit. Raise the schema only when an older valid state would otherwise be ambiguous, unsafe, or impossible to preserve.
