export const TIDEGLOW_SOURCES = Object.freeze([
  { id: "fish_discovery", eventType: "fish.discovered", points: 1, refKey: "fishId", sourcePrefix: "fish", label: "新魚初遇" },
  { id: "region_arrival", eventType: "region.arrived", points: 5, refKey: "regionId", sourcePrefix: "arrival", label: "首次抵達海域" },
  { id: "formal_observation", eventType: "observation.recorded", points: 3, refKey: "observationId", sourcePrefix: "observation", label: "正式觀察" },
  { id: "research_node", eventType: "research.node.completed", points: 2, refKey: "nodeId", sourcePrefix: "research-node", label: "研究節點" },
  { id: "region_research", eventType: "research.region.completed", points: 5, refKey: "regionId", sourcePrefix: "region-research", label: "區域研究" },
  { id: "resident_story", eventType: "resident.story.completed", points: 1, refKey: "milestoneId", sourcePrefix: "resident-story", label: "居民故事" }
]);

export function tideglowSourceByEventType(eventType) {
  return TIDEGLOW_SOURCES.find(source => source.eventType === eventType) || null;
}

export function tideglowSourceId(source, refs = {}) {
  if (!source) return null;
  const value = refs?.[source.refKey];
  if (typeof value !== "string" || !value.trim()) return null;
  if (source.id === "resident_story") {
    const residentId = refs?.residentId;
    if (typeof residentId !== "string" || !residentId.trim()) return null;
    return `${source.sourcePrefix}:${residentId}:${value}`;
  }
  return `${source.sourcePrefix}:${value}`;
}
