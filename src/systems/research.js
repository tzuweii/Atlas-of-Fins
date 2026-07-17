import { RESEARCH_NODES, getRegionResearch } from "../data/research.js";

function regionalProgress(state, regionId) {
  return state?.world?.regionProgress?.[regionId] || null;
}

function requirementMet(state, requirement) {
  if (!requirement) return false;
  if (requirement.type === "visited-region") return state.world?.visitedRegionIds?.includes(requirement.regionId);
  if (requirement.type === "observation") return Boolean(state.observations?.recordsById?.[requirement.observationId]);
  if (requirement.type === "spot-discovery") {
    return regionalProgress(state, requirement.regionId)?.caughtSpotIds?.includes(requirement.spotId);
  }
  if (requirement.type === "region-time-discovery") {
    return regionalProgress(state, requirement.regionId)?.caughtTimeIds?.includes(requirement.timeId);
  }
  return false;
}

export function getRegionResearchStatus(state, regionId) {
  const research = getRegionResearch(regionId);
  if (!research) return null;
  const progress = regionalProgress(state, regionId) || {};
  const speciesCount = new Set(progress.discoveredFishIds || []).size;
  const completedNodeIds = [...new Set(progress.completedResearchIds || [])]
    .filter(nodeId => research.nodeIds.includes(nodeId));
  return {
    research,
    speciesCount,
    completedNodeIds,
    nodeCount: research.nodeIds.length,
    mainComplete: Boolean(progress.mainResearchCompletedDay) || speciesCount >= research.mainSpeciesGoal,
    fullComplete: Boolean(progress.fullResearchCompletedDay) || speciesCount >= research.fullSpeciesGoal,
    rewardIds: [...new Set(progress.researchRewardIds || [])]
  };
}

export function evaluateResearchProgress(state, regionId = state?.world?.currentRegionId) {
  const research = getRegionResearch(regionId);
  const currentProgress = regionalProgress(state, regionId);
  if (!research || !currentProgress) return { updated: false, completedNodes: [], rewards: [] };

  const completed = new Set(currentProgress.completedResearchIds || []);
  const completedNodes = [];
  for (const node of RESEARCH_NODES.filter(entry => entry.regionId === regionId)) {
    if (completed.has(node.id) || !requirementMet(state, node.requirement)) continue;
    completed.add(node.id);
    completedNodes.push(node);
  }

  const speciesCount = new Set(currentProgress.discoveredFishIds || []).size;
  const rewardIds = new Set(currentProgress.researchRewardIds || []);
  const rewards = [];
  let mainResearchCompletedDay = currentProgress.mainResearchCompletedDay || null;
  let fullResearchCompletedDay = currentProgress.fullResearchCompletedDay || null;
  if (speciesCount >= research.mainSpeciesGoal) {
    mainResearchCompletedDay ||= Math.max(1, Math.floor(Number(state.day) || 1));
    if (!rewardIds.has(research.mainReward.id)) {
      rewardIds.add(research.mainReward.id);
      rewards.push(research.mainReward);
    }
  }
  if (speciesCount >= research.fullSpeciesGoal) {
    fullResearchCompletedDay ||= Math.max(1, Math.floor(Number(state.day) || 1));
    for (const reward of research.fullRewards) {
      if (rewardIds.has(reward.id)) continue;
      rewardIds.add(reward.id);
      rewards.push(reward);
    }
  }

  const updated = completedNodes.length > 0 || rewards.length > 0
    || mainResearchCompletedDay !== currentProgress.mainResearchCompletedDay
    || fullResearchCompletedDay !== currentProgress.fullResearchCompletedDay;
  if (updated) {
    state.world.regionProgress[regionId] = {
      ...currentProgress,
      completedResearchIds: [...completed],
      mainResearchCompletedDay,
      fullResearchCompletedDay,
      researchRewardIds: [...rewardIds]
    };
  }
  return { updated, completedNodes, rewards, speciesCount };
}

export function completeRegionResearchForDeveloper(state, regionId) {
  const research = getRegionResearch(regionId);
  const progress = regionalProgress(state, regionId);
  if (!state?.developerMode || !research || !progress) return false;
  state.world.regionProgress[regionId] = {
    ...progress,
    completedResearchIds: [...research.nodeIds],
    mainResearchCompletedDay: progress.mainResearchCompletedDay || state.day,
    fullResearchCompletedDay: progress.fullResearchCompletedDay || state.day,
    researchRewardIds: [research.mainReward, ...research.fullRewards].map(reward => reward.id)
  };
  return true;
}
