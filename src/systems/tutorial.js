export const TUTORIAL_VERSION = 5;
export const TUTORIAL_TOTAL_STEPS = 14;

const LEGACY_STEP_MAP = new Map([
  [0, 0],
  [1, 2],
  [2, 6],
  [3, 7],
  [4, 8],
  [5, 12],
  [6, TUTORIAL_TOTAL_STEPS]
]);

const VERSION_TWO_STEP_MAP = new Map([
  [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7],
  [8, 7], [9, 8], [10, 10], [11, 11], [12, 12], [13, 13], [14, TUTORIAL_TOTAL_STEPS]
]);

const VERSION_THREE_STEP_MAP = new Map([
  [0, 0], [1, 1], [2, 1], [3, 2], [4, 3], [5, 4], [6, 5], [7, 6],
  [8, 7], [9, 7], [10, 8], [11, 10], [12, 11], [13, 12], [14, 13],
  [15, TUTORIAL_TOTAL_STEPS]
]);

const VERSION_FOUR_STEP_MAP = new Map([
  [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7],
  [8, 7], [9, 8], [10, 10], [11, 11], [12, 12], [13, 13],
  [14, TUTORIAL_TOTAL_STEPS]
]);

function boundedStep(value) {
  return Math.min(TUTORIAL_TOTAL_STEPS, Math.max(0, Math.floor(Number(value) || 0)));
}

export function normalizeTutorialProgress(raw = {}) {
  const completed = raw.completedTutorial === true;
  if (completed || raw.developerMode === true) {
    return {
      tutorialVersion: TUTORIAL_VERSION,
      completedTutorial: true,
      tutorialStep: TUTORIAL_TOTAL_STEPS,
      tutorialCatchUid: null
    };
  }

  const sourceVersion = Number(raw.tutorialVersion);
  const sourceStep = Math.max(0, Math.floor(Number(raw.tutorialStep) || 0));
  const step = sourceVersion === TUTORIAL_VERSION
    ? boundedStep(sourceStep)
    : sourceVersion === 4
      ? (VERSION_FOUR_STEP_MAP.get(sourceStep) ?? 0)
      : sourceVersion === 3
        ? (VERSION_THREE_STEP_MAP.get(sourceStep) ?? 0)
        : sourceVersion === 2
          ? (VERSION_TWO_STEP_MAP.get(sourceStep) ?? 0)
          : (LEGACY_STEP_MAP.get(sourceStep) ?? 0);
  return {
    tutorialVersion: TUTORIAL_VERSION,
    completedTutorial: step >= TUTORIAL_TOTAL_STEPS,
    tutorialStep: step,
    tutorialCatchUid: typeof raw.tutorialCatchUid === "string" && raw.tutorialCatchUid ? raw.tutorialCatchUid : null
  };
}

export function tutorialIsActive(state) {
  return state?.completedTutorial !== true
    && Number(state?.tutorialVersion) === TUTORIAL_VERSION
    && boundedStep(state?.tutorialStep) < TUTORIAL_TOTAL_STEPS;
}

export function completeTutorial(state) {
  if (!state || typeof state !== "object") return false;
  const changed = state.completedTutorial !== true
    || Number(state.tutorialVersion) !== TUTORIAL_VERSION
    || boundedStep(state.tutorialStep) !== TUTORIAL_TOTAL_STEPS
    || state.tutorialCatchUid !== null;
  state.tutorialVersion = TUTORIAL_VERSION;
  state.completedTutorial = true;
  state.tutorialStep = TUTORIAL_TOTAL_STEPS;
  state.tutorialCatchUid = null;
  return changed;
}
