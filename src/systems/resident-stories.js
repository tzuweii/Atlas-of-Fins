import { RESIDENTS } from "../data/residents.js";
import { getResidentStoryScenes, residentStorySceneById } from "../data/resident-stories.js";

export function createResidentStoryState() {
  return {};
}

export function normalizeResidentStoryState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return Object.fromEntries(RESIDENTS.map(resident => {
    const saved = source[resident.id] && typeof source[resident.id] === "object" ? source[resident.id] : {};
    const completedSceneIds = [...new Set(Array.isArray(saved.completedSceneIds) ? saved.completedSceneIds : [])]
      .filter(sceneId => residentStorySceneById(sceneId)?.residentId === resident.id);
    const validRewardIds = getResidentStoryScenes(resident.id).map(scene => scene.reward?.id).filter(Boolean);
    const rewardIds = [...new Set(Array.isArray(saved.rewardIds) ? saved.rewardIds : [])]
      .filter(rewardId => validRewardIds.includes(rewardId));
    return [resident.id, { completedSceneIds, rewardIds }];
  }).filter(([, entry]) => entry.completedSceneIds.length || entry.rewardIds.length));
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

export function getResidentStoryStatus(state, residentId) {
  const scenes = getResidentStoryScenes(residentId);
  const entry = state.residentStories?.[residentId] || { completedSceneIds: [], rewardIds: [] };
  const completed = new Set(entry.completedSceneIds || []);
  const nextScene = scenes.find(scene => !completed.has(scene.id)) || null;
  return {
    scenes,
    completedSceneIds: [...completed],
    rewardIds: [...new Set(entry.rewardIds || [])],
    nextScene,
    nextAvailable: Boolean(nextScene && triggerMet(state, nextScene.trigger)),
    complete: scenes.length > 0 && completed.size >= scenes.length
  };
}

export function advanceResidentStory(state, residentId) {
  const status = getResidentStoryStatus(state, residentId);
  if (!status.nextAvailable || !status.nextScene) return { ok: false, reason: "not-ready", status };
  const scene = status.nextScene;
  const entry = state.residentStories?.[residentId] || { completedSceneIds: [], rewardIds: [] };
  state.residentStories = {
    ...(state.residentStories || {}),
    [residentId]: {
      completedSceneIds: [...new Set([...(entry.completedSceneIds || []), scene.id])],
      rewardIds: [...new Set([...(entry.rewardIds || []), ...(scene.reward ? [scene.reward.id] : [])])]
    }
  };
  return { ok: true, scene, reward: scene.reward || null, status: getResidentStoryStatus(state, residentId) };
}

export function resetResidentStory(state, residentId) {
  if (!state?.developerMode) return false;
  state.residentStories = { ...(state.residentStories || {}) };
  delete state.residentStories[residentId];
  return true;
}
