import { RESIDENTS, residentById } from "../data/residents.js";
import { getResidentStoryScenes, residentStorySceneById } from "../data/resident-stories.js";
import { isManualProgressEvent, progressIncrement } from "./progress-events.js";

export function createResidentStoryState() {
  return {};
}

const cleanProgress = value => Math.max(0, Math.floor(Number(value) || 0));
const uniqueStrings = values => [...new Set(Array.isArray(values) ? values.filter(value => typeof value === "string" && value) : [])];

function normalizeObjectiveFields(scene, saved) {
  const objective = scene?.objective;
  if (!objective) return {};
  if (objective.kind === "catch-contexts") {
    const allowed = Array.isArray(objective.requiredValues) ? new Set(objective.requiredValues) : null;
    return {
      objectiveContextValues: uniqueStrings(saved.objectiveContextValues)
        .filter(value => !allowed || allowed.has(value))
        .slice(0, objective.goal)
    };
  }
  if (objective.kind === "checklist") {
    const savedParts = saved.objectivePartProgress && typeof saved.objectivePartProgress === "object"
      ? saved.objectivePartProgress
      : {};
    return {
      objectivePartProgress: Object.fromEntries((objective.parts || []).map(part => [
        part.id,
        Math.min(part.goal, cleanProgress(savedParts[part.id]))
      ]))
    };
  }
  return { objectiveProgress: Math.min(objective.goal, cleanProgress(saved.objectiveProgress)) };
}

export function normalizeResidentStoryState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return Object.fromEntries(RESIDENTS.map(resident => {
    const scenes = getResidentStoryScenes(resident.id);
    const saved = source[resident.id] && typeof source[resident.id] === "object" ? source[resident.id] : {};
    const completedSceneIds = [...new Set(Array.isArray(saved.completedSceneIds) ? saved.completedSceneIds : [])]
      .filter(sceneId => residentStorySceneById(sceneId)?.residentId === resident.id);
    const completed = new Set(completedSceneIds);
    const nextScene = scenes.find(scene => !completed.has(scene.id)) || null;
    const activeSceneId = saved.activeSceneId === nextScene?.id ? saved.activeSceneId : null;
    const validRewardIds = scenes.map(scene => scene.reward?.id).filter(Boolean);
    const rewardIds = [...new Set(Array.isArray(saved.rewardIds) ? saved.rewardIds : [])]
      .filter(rewardId => validRewardIds.includes(rewardId));
    const entry = {
      completedSceneIds,
      rewardIds,
      ...(activeSceneId ? {
        activeSceneId,
        ...normalizeObjectiveFields(nextScene, saved),
        acceptedDay: Math.max(1, Math.floor(Number(saved.acceptedDay) || 1))
      } : {})
    };
    return [resident.id, entry];
  }).filter(([, entry]) => entry.completedSceneIds.length || entry.rewardIds.length || entry.activeSceneId));
}

function triggerMet(state, trigger) {
  if (!trigger) return true;
  if (trigger.type === "tutorial-completed") return state.completedTutorial === true;
  if (trigger.type === "visited-region") return state.world?.visitedRegionIds?.includes(trigger.regionId);
  if (trigger.type === "region-species") {
    return (state.world?.regionProgress?.[trigger.regionId]?.discoveredFishIds?.length || 0) >= trigger.count;
  }
  if (trigger.type === "observation") return Boolean(state.observations?.recordsById?.[trigger.observationId]);
  if (trigger.type === "research-node") {
    return Object.values(state.world?.regionProgress || {}).some(progress => progress.completedResearchIds?.includes(trigger.nodeId));
  }
  if (trigger.type === "region-main-research") {
    return Boolean(state.world?.regionProgress?.[trigger.regionId]?.mainResearchCompletedDay);
  }
  return false;
}

function objectiveProgress(state, scene, entry) {
  const objective = scene?.objective;
  if (!objective) return 0;
  if (objective.kind === "observation") {
    return state.observations?.recordsById?.[objective.observationId] ? objective.goal : 0;
  }
  if (objective.kind === "region-main-research") {
    const progress = state.world?.regionProgress?.[objective.regionId];
    if (progress?.mainResearchCompletedDay && !(progress.discoveredFishIds?.length > 0)) return objective.goal;
    return Math.min(objective.goal, new Set(progress?.discoveredFishIds || []).size);
  }
  if (objective.kind === "catch-contexts") return Math.min(objective.goal, uniqueStrings(entry?.objectiveContextValues).length);
  if (objective.kind === "checklist") {
    return (objective.parts || []).filter(part => cleanProgress(entry?.objectivePartProgress?.[part.id]) >= part.goal).length;
  }
  return Math.min(objective.goal, cleanProgress(entry?.objectiveProgress));
}

function objectiveDetails(state, scene, entry) {
  const objective = scene?.objective;
  if (!objective) return [];
  if (Array.isArray(objective.requirements)) {
    const completedSceneIds = new Set(state.residentStories?.[scene.residentId]?.completedSceneIds || []);
    return objective.requirements.map(requirement => {
      let progress = 0;
      if (requirement.kind === "completed-scenes") {
        progress = (requirement.sceneIds || []).filter(sceneId => completedSceneIds.has(sceneId)).length;
      }
      if (requirement.kind === "region-species") {
        progress = new Set(state.world?.regionProgress?.[requirement.regionId]?.discoveredFishIds || []).size;
      }
      return {
        id: requirement.id,
        label: requirement.label,
        progress: Math.min(requirement.goal, progress),
        goal: requirement.goal
      };
    });
  }
  if (objective.kind === "catch-contexts" && Array.isArray(objective.steps)) {
    const completed = new Set(uniqueStrings(entry?.objectiveContextValues));
    return objective.steps.map(step => ({
      id: step.value,
      label: step.label,
      progress: completed.has(step.value) ? 1 : 0,
      goal: 1
    }));
  }
  if (objective.kind === "checklist") {
    return (objective.parts || []).map(part => ({
      id: part.id,
      label: part.label,
      progress: Math.min(part.goal, cleanProgress(entry?.objectivePartProgress?.[part.id])),
      goal: part.goal
    }));
  }
  return [];
}

export function getResidentStoryStatus(state, residentId) {
  const scenes = getResidentStoryScenes(residentId);
  const entry = state.residentStories?.[residentId] || { completedSceneIds: [], rewardIds: [] };
  const completed = new Set(entry.completedSceneIds || []);
  const nextScene = scenes.find(scene => !completed.has(scene.id)) || null;
  const activeScene = entry.activeSceneId === nextScene?.id ? nextScene : null;
  const progress = activeScene ? objectiveProgress(state, activeScene, entry) : 0;
  const goal = activeScene?.objective?.goal || 0;
  const details = activeScene ? objectiveDetails(state, activeScene, entry) : [];
  const canAccept = Boolean(nextScene && !activeScene && triggerMet(state, nextScene.trigger));
  const requirementsMet = !details.length || details.every(detail => detail.progress >= detail.goal);
  const canComplete = Boolean(activeScene && goal > 0 && progress >= goal && requirementsMet);
  return {
    scenes,
    completedSceneIds: [...completed],
    rewardIds: [...new Set(entry.rewardIds || [])],
    nextScene,
    activeScene,
    objectiveProgress: progress,
    objectiveGoal: goal,
    objectiveDetails: details,
    canAccept,
    canComplete,
    nextAvailable: canAccept || canComplete,
    complete: scenes.length > 0 && completed.size >= scenes.length
  };
}

export function acceptResidentStory(state, residentId) {
  const status = getResidentStoryStatus(state, residentId);
  if (!status.canAccept || !status.nextScene) return { ok: false, reason: "not-ready", status };
  const scene = status.nextScene;
  const entry = state.residentStories?.[residentId] || { completedSceneIds: [], rewardIds: [] };
  state.residentStories = {
    ...(state.residentStories || {}),
    [residentId]: {
      completedSceneIds: [...new Set(entry.completedSceneIds || [])],
      rewardIds: [...new Set(entry.rewardIds || [])],
      activeSceneId: scene.id,
      ...normalizeObjectiveFields(scene, {}),
      acceptedDay: Math.max(1, Math.floor(Number(state.day) || 1))
    }
  };
  return { ok: true, scene, status: getResidentStoryStatus(state, residentId) };
}

export function applyResidentStoryProgress(state, event) {
  if (!state?.residentStories || !event) return state?.residentStories || {};
  let changed = false;
  const nextStories = { ...state.residentStories };
  for (const resident of RESIDENTS) {
    const entry = nextStories[resident.id];
    const scene = residentStorySceneById(entry?.activeSceneId);
    const objective = scene?.objective;
    if (!scene || !objective) continue;
    if (objective.kind === "catch") {
      const increment = progressIncrement(objective.condition, event);
      if (!increment) continue;
      nextStories[resident.id] = {
        ...entry,
        objectiveProgress: Math.min(objective.goal, cleanProgress(entry.objectiveProgress) + increment)
      };
      changed = true;
      continue;
    }
    if (objective.kind === "catch-contexts") {
      if (!progressIncrement(objective.condition, event)) continue;
      const value = event?.[objective.uniqueKey];
      if (typeof value !== "string" || !value) continue;
      if (Array.isArray(objective.requiredValues) && !objective.requiredValues.includes(value)) continue;
      const values = uniqueStrings([...(entry.objectiveContextValues || []), value]).slice(0, objective.goal);
      if (values.length === (entry.objectiveContextValues || []).length) continue;
      nextStories[resident.id] = { ...entry, objectiveContextValues: values };
      changed = true;
      continue;
    }
    if (objective.kind === "preferred-weather-catch") {
      const matches = isManualProgressEvent(event)
        && event.type === "catch"
        && event.regionId === objective.regionId
        && event.fish?.preferredWeatherIds?.includes(event.weather);
      if (!matches) continue;
      nextStories[resident.id] = {
        ...entry,
        objectiveProgress: Math.min(objective.goal, cleanProgress(entry.objectiveProgress) + 1)
      };
      changed = true;
      continue;
    }
    if (objective.kind === "checklist") {
      const partProgress = { ...(entry.objectivePartProgress || {}) };
      let partChanged = false;
      for (const part of objective.parts || []) {
        const increment = progressIncrement(part.condition, event);
        if (!increment) continue;
        const next = Math.min(part.goal, cleanProgress(partProgress[part.id]) + increment);
        if (next === cleanProgress(partProgress[part.id])) continue;
        partProgress[part.id] = next;
        partChanged = true;
      }
      if (!partChanged) continue;
      nextStories[resident.id] = { ...entry, objectivePartProgress: partProgress };
      changed = true;
    }
  }
  return changed ? nextStories : state.residentStories;
}

export function completeResidentStory(state, residentId) {
  const status = getResidentStoryStatus(state, residentId);
  const resident = residentById(residentId);
  const dockedAtResident = resident
    && state.world?.currentRegionId === resident.regionId
    && state.world?.docking?.status === "docked"
    && state.world.docking.regionId === resident.regionId;
  if (!status.canComplete || !status.activeScene || !dockedAtResident) {
    return { ok: false, reason: dockedAtResident ? "not-ready" : "wrong-port", status };
  }
  const scene = status.activeScene;
  const entry = state.residentStories?.[residentId] || { completedSceneIds: [], rewardIds: [] };
  state.residentStories = {
    ...(state.residentStories || {}),
    [residentId]: {
      completedSceneIds: [...new Set([...(entry.completedSceneIds || []), scene.id])],
      rewardIds: [...new Set([...(entry.rewardIds || []), ...(scene.reward ? [scene.reward.id] : [])])]
    }
  };
  if (scene.reward?.type === "route-chart" && scene.reward.routeId) {
    state.world = {
      ...state.world,
      unlockedRouteIds: [...new Set([...(state.world?.unlockedRouteIds || []), scene.reward.routeId])]
    };
  }
  return {
    ok: true,
    scene,
    reward: scene.reward || null,
    status: getResidentStoryStatus(state, residentId)
  };
}

export function resetResidentStory(state, residentId) {
  if (!state?.developerMode) return false;
  state.residentStories = { ...(state.residentStories || {}) };
  delete state.residentStories[residentId];
  return true;
}
