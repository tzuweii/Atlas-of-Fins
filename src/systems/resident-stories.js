import { RESIDENTS, residentById } from "../data/residents.js";
import { getResidentStoryScenes, residentStorySceneById } from "../data/resident-stories.js";
import { progressIncrement } from "./progress-events.js";

export function createResidentStoryState() {
  return {};
}

const cleanProgress = value => Math.max(0, Math.floor(Number(value) || 0));

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
        objectiveProgress: Math.min(nextScene.objective.goal, cleanProgress(saved.objectiveProgress)),
        acceptedDay: Math.max(1, Math.floor(Number(saved.acceptedDay) || 1))
      } : {})
    };
    return [resident.id, entry];
  }).filter(([, entry]) => entry.completedSceneIds.length || entry.rewardIds.length || entry.activeSceneId));
}

function triggerMet(state, trigger) {
  if (!trigger) return true;
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
    return state.world?.regionProgress?.[objective.regionId]?.mainResearchCompletedDay ? objective.goal : 0;
  }
  return Math.min(objective.goal, cleanProgress(entry?.objectiveProgress));
}

export function getResidentStoryStatus(state, residentId) {
  const scenes = getResidentStoryScenes(residentId);
  const entry = state.residentStories?.[residentId] || { completedSceneIds: [], rewardIds: [] };
  const completed = new Set(entry.completedSceneIds || []);
  const nextScene = scenes.find(scene => !completed.has(scene.id)) || null;
  const activeScene = entry.activeSceneId === nextScene?.id ? nextScene : null;
  const progress = activeScene ? objectiveProgress(state, activeScene, entry) : 0;
  const goal = activeScene?.objective?.goal || 0;
  const canAccept = Boolean(nextScene && !activeScene && triggerMet(state, nextScene.trigger));
  const canComplete = Boolean(activeScene && goal > 0 && progress >= goal);
  return {
    scenes,
    completedSceneIds: [...completed],
    rewardIds: [...new Set(entry.rewardIds || [])],
    nextScene,
    activeScene,
    objectiveProgress: progress,
    objectiveGoal: goal,
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
      objectiveProgress: 0,
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
    if (!scene || scene.objective?.kind !== "catch") continue;
    const increment = progressIncrement(scene.objective.condition, event);
    if (!increment) continue;
    nextStories[resident.id] = {
      ...entry,
      objectiveProgress: Math.min(scene.objective.goal, cleanProgress(entry.objectiveProgress) + increment)
    };
    changed = true;
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
