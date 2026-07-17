import {
  BAY_EVENTS, FISH, RESEARCH_NODES, TIMES, WONDERS, observationSubjectById, regionById,
  residentById, residentStorySceneById, routeById, shipById
} from "../data.js";
import {
  DAILY_POETIC_LINES, FISH_ENCOUNTER_LINES, JOURNAL_ENTRY_TYPE_LABELS,
  JOURNAL_TEMPLATE_VERSION, journalTemplateByEventType
} from "../data/journal-templates.js";

export const JOURNAL_VERSION = 1;
export const DAILY_JOURNAL_LIMIT = 180;
export const DAILY_ARCHIVE_BATCH_SIZE = 10;

const isObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const safeDate = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
const strings = value => [...new Set(Array.isArray(value) ? value.filter(item => typeof item === "string" && item) : [])];
const dayNumber = value => Math.max(1, Math.floor(Number(value) || 1));
const stableIndex = (value, length) => {
  let hash = 0;
  for (const char of String(value || "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return length ? hash % length : 0;
};
const fill = (text, values) => Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value || ""), text);

const emptyRefs = () => ({ fishIds: [], residentIds: [], researchIds: [], shipIds: [], routeIds: [], regionIds: [], observationIds: [], wonderIds: [] });

function normalizeRefs(raw) {
  const source = isObject(raw) ? raw : {};
  return Object.fromEntries(Object.keys(emptyRefs()).map(key => [key, strings(source[key])]));
}

function introEntry() {
  return {
    id: "journal:intro",
    sourceId: "intro:v0.5",
    eventId: null,
    type: "intro",
    sailingDay: 1,
    occurredAt: null,
    title: "把潮聲整理成冊",
    body: "今天，我開始把走過的潮聲整理成冊。",
    poeticLine: "往後只記下真正遇見的事，讓空白也保有自己的安靜。",
    regionId: null,
    shipId: "drifting_home",
    templateId: "journal_intro",
    refs: emptyRefs()
  };
}

export function createJournalState() {
  const intro = introEntry();
  return {
    version: JOURNAL_VERSION,
    templateVersion: JOURNAL_TEMPLATE_VERSION,
    introCreated: true,
    fishEncounterLineById: {},
    permanentEntries: [intro],
    dailyEntries: [],
    dailyArchives: [],
    unreadEntryIds: [intro.id],
    pendingNoticeEntryIds: [intro.id]
  };
}

function normalizePermanentEntry(raw) {
  if (!isObject(raw) || typeof raw.id !== "string" || typeof raw.title !== "string" || typeof raw.body !== "string") return null;
  return {
    ...raw,
    id: raw.id,
    sourceId: typeof raw.sourceId === "string" ? raw.sourceId : raw.id,
    eventId: typeof raw.eventId === "string" ? raw.eventId : null,
    type: typeof raw.type === "string" ? raw.type : "intro",
    sailingDay: dayNumber(raw.sailingDay),
    occurredAt: safeDate(raw.occurredAt),
    title: raw.title,
    body: raw.body,
    poeticLine: typeof raw.poeticLine === "string" ? raw.poeticLine : "",
    regionId: typeof raw.regionId === "string" ? raw.regionId : null,
    shipId: typeof raw.shipId === "string" ? raw.shipId : null,
    templateId: typeof raw.templateId === "string" ? raw.templateId : null,
    refs: normalizeRefs(raw.refs)
  };
}

function normalizeDailyEntry(raw) {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  const sailingDay = dayNumber(raw.sailingDay);
  const facts = Array.isArray(raw.facts) ? raw.facts.filter(fact => isObject(fact) && typeof fact.key === "string" && typeof fact.text === "string").map(fact => ({ key: fact.key, text: fact.text })) : [];
  if (!facts.length && typeof raw.body !== "string") return null;
  return {
    ...raw,
    id: raw.id,
    type: "daily",
    sailingDay,
    createdAt: safeDate(raw.createdAt),
    updatedAt: safeDate(raw.updatedAt),
    sealedAt: safeDate(raw.sealedAt),
    sealed: Boolean(raw.sealed),
    title: typeof raw.title === "string" ? raw.title : `第 ${sailingDay} 日 · 今日潮記`,
    body: typeof raw.body === "string" ? raw.body : facts.map(fact => fact.text).join("；") + "。",
    poeticLine: typeof raw.poeticLine === "string" ? raw.poeticLine : "船身隨潮水慢慢呼吸，今天的事也各自找到了一行位置。",
    regionId: typeof raw.regionId === "string" ? raw.regionId : null,
    shipId: typeof raw.shipId === "string" ? raw.shipId : null,
    facts,
    eventIds: strings(raw.eventIds),
    refs: normalizeRefs(raw.refs)
  };
}

function normalizeArchive(raw) {
  if (!isObject(raw) || typeof raw.id !== "string" || typeof raw.body !== "string") return null;
  return {
    ...raw,
    id: raw.id,
    type: "archive",
    dayFrom: dayNumber(raw.dayFrom),
    dayTo: dayNumber(raw.dayTo),
    createdAt: safeDate(raw.createdAt),
    title: typeof raw.title === "string" ? raw.title : "十日回望",
    body: raw.body,
    poeticLine: typeof raw.poeticLine === "string" ? raw.poeticLine : "十天的潮聲疊在一起，仍能看見每次靠岸留下的細小亮處。",
    regionId: typeof raw.regionId === "string" ? raw.regionId : null,
    refs: normalizeRefs(raw.refs),
    stats: isObject(raw.stats) ? { ...raw.stats } : {}
  };
}

export function normalizeJournalState(raw) {
  const source = isObject(raw) ? raw : {};
  const base = createJournalState();
  const permanentEntries = [];
  const seenSources = new Set();
  for (const candidate of Array.isArray(source.permanentEntries) ? source.permanentEntries : base.permanentEntries) {
    const entry = normalizePermanentEntry(candidate);
    if (!entry || seenSources.has(entry.sourceId)) continue;
    seenSources.add(entry.sourceId);
    permanentEntries.push(entry);
  }
  if (!permanentEntries.some(entry => entry.id === "journal:intro")) permanentEntries.unshift(introEntry());
  const dailyEntries = (Array.isArray(source.dailyEntries) ? source.dailyEntries : []).map(normalizeDailyEntry).filter(Boolean);
  const dailyArchives = (Array.isArray(source.dailyArchives) ? source.dailyArchives : []).map(normalizeArchive).filter(Boolean);
  const validEntryIds = new Set([...permanentEntries, ...dailyEntries, ...dailyArchives].map(entry => entry.id));
  const state = {
    version: JOURNAL_VERSION,
    templateVersion: JOURNAL_TEMPLATE_VERSION,
    introCreated: true,
    fishEncounterLineById: Object.fromEntries(Object.entries(isObject(source.fishEncounterLineById) ? source.fishEncounterLineById : {})
      .filter(([fishId, line]) => FISH.some(fish => fish.id === fishId) && typeof line === "string" && line.trim())),
    permanentEntries,
    dailyEntries,
    dailyArchives,
    unreadEntryIds: strings(source.unreadEntryIds).filter(id => validEntryIds.has(id)),
    pendingNoticeEntryIds: strings(source.pendingNoticeEntryIds).filter(id => validEntryIds.has(id))
  };
  return archiveExcessDailyEntries(state);
}

function encounterLine(event, fish) {
  const pool = FISH_ENCOUNTER_LINES[event.timeId] || FISH_ENCOUNTER_LINES.day;
  const spotName = event.spotId ? (event.spotId === "shore" ? "近岸淺灘" : event.spotId === "reef" ? "礁石邊緣" : "潮水裡") : "潮水裡";
  return fill(pool[stableIndex(`${event.eventId}:${fish.id}`, pool.length)], { fishName: fish.name, spotName });
}

function entryRefs(event) {
  const refs = emptyRefs();
  const mappings = {
    fishId: "fishIds", residentId: "residentIds", milestoneId: "researchIds", nodeId: "researchIds",
    shipId: "shipIds", routeId: "routeIds", regionId: "regionIds", observationId: "observationIds", wonderId: "wonderIds"
  };
  for (const [key, target] of Object.entries(mappings)) if (typeof event.refs?.[key] === "string") refs[target].push(event.refs[key]);
  if (event.regionId && !refs.regionIds.includes(event.regionId)) refs.regionIds.push(event.regionId);
  if (event.shipId && !refs.shipIds.includes(event.shipId)) refs.shipIds.push(event.shipId);
  return refs;
}

function permanentSourceId(event) {
  if (event.type === "fish.discovered") return `fish:${event.refs?.fishId}`;
  if (event.type === "route.departed") return `route:${event.refs?.routeId}:${event.refs?.fromRegionId}:${event.refs?.toRegionId}`;
  if (event.type === "region.arrived") return `arrival:${event.refs?.regionId}`;
  if (event.type === "observation.recorded") return `observation:${event.refs?.observationId}`;
  if (event.type === "wonder.recorded") return `wonder:${event.refs?.wonderId}`;
  if (event.type === "research.node.completed") return `research-node:${event.refs?.nodeId}`;
  if (event.type === "research.region.completed") return `region-research:${event.refs?.regionId}`;
  if (event.type === "resident.story.completed") return `resident-story:${event.refs?.residentId}:${event.refs?.milestoneId}`;
  if (event.type === "ship.purchased") return `ship:${event.refs?.shipId}`;
  if (event.type === "region.completed") return `region-complete:${event.refs?.regionId}`;
  if (event.type === "world.completed") return "world-complete";
  return null;
}

function permanentCopy(event) {
  const fish = FISH.find(item => item.id === event.refs?.fishId);
  const region = regionById(event.refs?.regionId || event.regionId);
  const route = routeById(event.refs?.routeId);
  const ship = shipById(event.refs?.shipId || event.shipId);
  const resident = residentById(event.refs?.residentId);
  const scene = residentStorySceneById(event.refs?.milestoneId);
  const observation = observationSubjectById(event.refs?.observationId);
  const wonder = WONDERS.find(item => item.id === event.refs?.wonderId);
  const research = RESEARCH_NODES.find(item => item.id === event.refs?.nodeId);
  if (event.type === "fish.discovered" && fish) return {
    title: `初遇 · ${fish.name}`,
    body: `我第一次在${region?.name || "這片海"}認出${fish.name}。${fish.short}`,
    poeticLine: `牠離開水面後，仍有一小段${event.weatherId === "rain" ? "雨色" : "潮光"}留在圖鑑邊緣。`
  };
  if (event.type === "route.departed" && route) {
    const from = regionById(event.refs?.fromRegionId), to = regionById(event.refs?.toRegionId);
    return { title: `航程 · ${from?.name || "出發地"}往${to?.name || "目的地"}`, body: `我讓${ship?.name || "船"}沿著${route.name}離岸。這是第一次把這個方向完整走進航圖。`, poeticLine: "港口的燈慢慢退到身後，前方的水色沒有催促。" };
  }
  if (event.type === "region.arrived" && region) return { title: `第一次抵達 · ${region.name}`, body: `我第一次把船停進${region.portName}。纜繩落下後，新的水色與港口聲音都有了可以回來的位置。`, poeticLine: "遠方不再只是航圖上的名字，而成了船邊真實晃動的光。" };
  if (event.type === "observation.recorded" && observation) return { title: `正式觀察 · ${observation.name}`, body: `我在${region?.name || "這片海"}完成了${observation.name}的正式觀察。沒有追趕，只把牠出現的時段與海況照實記下。`, poeticLine: "礁影仍留在原處，名字則安靜地住進觀察冊。" };
  if (event.type === "wonder.recorded" && wonder) return { title: `奇景 · ${wonder.name}`, body: `我在${region?.name || "這片海"}留下${wonder.name}的照片。它不計入完成度，只是一段剛好被遇見的風景。`, poeticLine: wonder.photoCaption || "海沒有要求我理解，只讓這一刻被好好看見。" };
  if (event.type === "research.node.completed" && research) return { title: `研究 · ${research.name}`, body: `我把${research.name}需要的真實紀錄整理完成。${research.description}`, poeticLine: "散落的相遇彼此靠近，終於在同一頁上顯出輪廓。" };
  if (event.type === "research.region.completed" && region) return { title: `區域研究完成 · ${region.name}`, body: `我完成了${region.name}的主要研究。這不是把海看完，而是終於知道該如何繼續細看。`, poeticLine: "風仍從原來的方向吹來，手冊卻比出發時多了幾層水色。" };
  if (event.type === "resident.story.completed" && resident) return { title: `${resident.name} · ${scene?.title || "港口相遇"}`, body: scene?.lines?.map(line => `「${line}」`).join(" ") || `我在${resident.portLocationName}與${resident.name}聊了一會兒。`, poeticLine: "人留在自己的港口生活，相遇也因此有了真實的距離。" };
  if (event.type === "ship.purchased" && ship) return { title: `新船靠岸 · ${ship.name}`, body: `我讓${ship.name}正式靠岸，也把它收進永久船隻收藏。潮光沒有被花掉，新的室內仍等著慢慢添置。`, poeticLine: "陌生的木頭與繩索聲晃了一會兒，港口便多出一盞屬於我的燈。" };
  if (event.type === "region.completed" && region) return { title: `海域完成 · ${region.name}`, body: `我完成了${region.name}目前所有正式收藏與研究。`, poeticLine: "完成不是合上海圖，只是在這片海旁留下了一枚安靜的記號。" };
  if (event.type === "world.completed") return { title: "第一張航圖完成", body: "我把第一張航圖上的海域、魚類與相遇都走成了可以回望的頁面。", poeticLine: "船仍會隨潮水呼吸，而這一次，遠方與家已經畫在同一張圖上。" };
  return null;
}

function createPermanentEntry(event, template) {
  const copy = permanentCopy(event);
  const sourceId = permanentSourceId(event);
  if (!copy || !sourceId) return null;
  return {
    id: `journal:${sourceId}`,
    sourceId,
    eventId: event.eventId,
    type: template.entryType,
    sailingDay: event.sailingDay,
    occurredAt: event.occurredAt,
    title: copy.title,
    body: copy.body,
    poeticLine: copy.poeticLine,
    regionId: event.refs?.regionId || event.regionId || null,
    shipId: event.refs?.shipId || event.shipId || null,
    templateId: template.id,
    refs: entryRefs(event)
  };
}

function dailyPoeticLine(event) {
  const pool = event.weatherId === "rain" ? DAILY_POETIC_LINES.rain
    : event.timeId === "night" ? DAILY_POETIC_LINES.night
      : DAILY_POETIC_LINES[event.regionId] || DAILY_POETIC_LINES.default;
  return pool[stableIndex(`${event.sailingDay}:${event.regionId}:${event.shipId}`, pool.length)];
}

function dailyFacts(event, { permanentCreated = false } = {}) {
  if (!["manual", "developer"].includes(event.source)) return [];
  const fish = FISH.find(item => item.id === event.refs?.fishId);
  const region = regionById(event.regionId);
  if (event.type === "fish.caught") {
    const facts = [];
    if (event.payload?.isFirstShimmer || event.payload?.caught?.variant === "shimmer") facts.push({ key: `shimmer:${fish?.id || event.eventId}`, text: `我在${region?.name || "這片海"}遇見了閃光的${fish?.name || "魚"}` });
    if (!event.payload?.isNew && (event.payload?.isLengthRecord || event.payload?.isWeightRecord)) facts.push({ key: `record:${fish?.id || event.eventId}`, text: `${fish?.name || "這條魚"}刷新了圖鑑裡的尺寸紀錄` });
    if (event.weatherId === "rain") facts.push({ key: `rain:${event.regionId}`, text: `細雨陪著${region?.name || "這片海"}的釣行` });
    return facts;
  }
  if (event.type === "region.event.progress") {
    const bayEvent = BAY_EVENTS.find(item => item.id === event.refs?.eventId);
    return bayEvent ? [{ key: `region-event:${bayEvent.id}`, text: `我參與了「${bayEvent.name}」的海況紀錄` }] : [];
  }
  if (event.type === "region.revisited") return [{ key: `revisit:${event.refs?.regionId}`, text: `我再次把船停進${regionById(event.refs?.regionId)?.portName || "熟悉港口"}` }];
  if (event.type === "route.departed" && !permanentCreated) return [{ key: `route:${event.refs?.routeId}`, text: `我再次沿${routeById(event.refs?.routeId)?.name || "熟悉航線"}出發` }];
  return [];
}

function mergeRefs(left, right) {
  return Object.fromEntries(Object.keys(emptyRefs()).map(key => [key, [...new Set([...(left?.[key] || []), ...(right?.[key] || [])])]]));
}

function upsertDailyEntry(state, event, facts) {
  if (!facts.length) return { state, entry: null, created: false };
  const id = `journal:daily:${event.sailingDay}`;
  const index = state.dailyEntries.findIndex(entry => entry.id === id);
  const existing = index >= 0 ? state.dailyEntries[index] : null;
  if (existing?.sealed || existing?.eventIds.includes(event.eventId)) return { state, entry: existing, created: false };
  const knownKeys = new Set(existing?.facts.map(fact => fact.key) || []);
  const newFacts = facts.filter(fact => !knownKeys.has(fact.key));
  if (existing && !newFacts.length) return { state, entry: existing, created: false };
  const nextFacts = [...(existing?.facts || []), ...newFacts];
  if (!nextFacts.length) return { state, entry: existing, created: false };
  const now = event.occurredAt || new Date().toISOString();
  const entry = {
    id,
    type: "daily",
    sailingDay: event.sailingDay,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    sealedAt: null,
    sealed: false,
    title: `第 ${event.sailingDay} 日 · 今日潮記`,
    body: `${nextFacts.map(fact => fact.text).join("；")}。`,
    poeticLine: existing?.poeticLine || dailyPoeticLine(event),
    regionId: existing?.regionId || event.regionId || null,
    shipId: existing?.shipId || event.shipId || null,
    facts: nextFacts,
    eventIds: [...new Set([...(existing?.eventIds || []), event.eventId])],
    refs: mergeRefs(existing?.refs, entryRefs(event))
  };
  const dailyEntries = [...state.dailyEntries];
  if (index >= 0) dailyEntries[index] = entry; else dailyEntries.push(entry);
  const created = !existing;
  return {
    state: {
      ...state,
      dailyEntries,
      unreadEntryIds: [...new Set([...state.unreadEntryIds, entry.id])],
      pendingNoticeEntryIds: created ? [...new Set([...state.pendingNoticeEntryIds, entry.id])] : state.pendingNoticeEntryIds
    },
    entry,
    created
  };
}

export function applyJournalEvent(rawState, event) {
  let state = normalizeJournalState(rawState);
  if (!isObject(event) || typeof event.eventId !== "string" || ["migration", "auto", "offline"].includes(event.source)) return { ok: true, state, createdEntries: [] };
  const createdEntries = [];
  let encounterLine = null;
  if (event.type === "fish.discovered") {
    const fish = FISH.find(item => item.id === event.refs?.fishId);
    if (fish && !state.fishEncounterLineById[fish.id]) {
      encounterLine = encounterLineForEvent(event, fish);
      state = { ...state, fishEncounterLineById: { ...state.fishEncounterLineById, [fish.id]: encounterLine } };
    }
  }
  const template = journalTemplateByEventType(event.type);
  let permanentCreated = false;
  if (template) {
    const fish = event.type === "fish.discovered" ? FISH.find(item => item.id === event.refs?.fishId) : null;
    const eligible = !fish || !["common", "uncommon"].includes(fish.rarity);
    const sourceId = permanentSourceId(event);
    if (eligible && sourceId && !state.permanentEntries.some(entry => entry.sourceId === sourceId || entry.eventId === event.eventId)) {
      const entry = createPermanentEntry(event, template);
      if (entry) {
        permanentCreated = true;
        createdEntries.push(entry);
        state = {
          ...state,
          permanentEntries: [...state.permanentEntries, entry],
          unreadEntryIds: [...new Set([...state.unreadEntryIds, entry.id])],
          pendingNoticeEntryIds: [...new Set([...state.pendingNoticeEntryIds, entry.id])]
        };
      }
    }
  }
  const daily = upsertDailyEntry(state, event, dailyFacts(event, { permanentCreated }));
  state = daily.state;
  if (daily.created && daily.entry) createdEntries.push(daily.entry);
  return { ok: true, state, createdEntries, updatedDailyEntry: daily.entry, encounterLine };
}

function encounterLineForEvent(event, fish) {
  return encounterLine(event, fish);
}

export function sealJournalDay(rawState, sailingDay, sealedAt = new Date().toISOString()) {
  let state = normalizeJournalState(rawState);
  const dailyEntries = state.dailyEntries.map(entry => entry.sailingDay === dayNumber(sailingDay) && !entry.sealed
    ? { ...entry, sealed: true, sealedAt: safeDate(sealedAt) || new Date().toISOString() }
    : entry);
  state = { ...state, dailyEntries };
  return archiveExcessDailyEntries(state, sealedAt);
}

export function archiveExcessDailyEntries(rawState, createdAt = new Date().toISOString()) {
  let state = { ...rawState, dailyEntries: [...(rawState.dailyEntries || [])], dailyArchives: [...(rawState.dailyArchives || [])] };
  while (state.dailyEntries.filter(entry => entry.sealed).length > DAILY_JOURNAL_LIMIT) {
    const batch = state.dailyEntries.filter(entry => entry.sealed).sort((a, b) => a.sailingDay - b.sailingDay).slice(0, DAILY_ARCHIVE_BATCH_SIZE);
    if (!batch.length) break;
    const batchIds = new Set(batch.map(entry => entry.id));
    const groups = Map.groupBy ? Map.groupBy(batch, entry => entry.regionId || "unknown") : batch.reduce((map, entry) => {
      const key = entry.regionId || "unknown";
      map.set(key, [...(map.get(key) || []), entry]);
      return map;
    }, new Map());
    const archives = [];
    for (const [regionId, entries] of groups) {
      const dayFrom = Math.min(...entries.map(entry => entry.sailingDay));
      const dayTo = Math.max(...entries.map(entry => entry.sailingDay));
      const factCount = entries.reduce((sum, entry) => sum + entry.facts.length, 0);
      const region = regionById(regionId);
      archives.push({
        id: `journal:archive:${dayFrom}-${dayTo}:${regionId}`,
        type: "archive",
        dayFrom,
        dayTo,
        createdAt: safeDate(createdAt) || new Date().toISOString(),
        title: `第 ${dayFrom}～${dayTo} 日 · ${region?.name || "海上"}回望`,
        body: `這段日子在${region?.name || "海上"}留下 ${entries.length} 篇潮記與 ${factCount} 件真實紀錄。舊頁已整理成摘要，永久相遇頁仍完整保留。`,
        poeticLine: "十天的潮聲疊在一起，仍能看見每次靠岸留下的細小亮處。",
        regionId: regionId === "unknown" ? null : regionId,
        refs: { ...emptyRefs(), regionIds: regionId === "unknown" ? [] : [regionId] },
        stats: { entryCount: entries.length, factCount }
      });
    }
    state.dailyEntries = state.dailyEntries.filter(entry => !batchIds.has(entry.id));
    const knownArchiveIds = new Set(state.dailyArchives.map(entry => entry.id));
    state.dailyArchives.push(...archives.filter(entry => !knownArchiveIds.has(entry.id)));
    state.unreadEntryIds = [...new Set([...state.unreadEntryIds.filter(id => !batchIds.has(id)), ...archives.map(entry => entry.id)])];
    state.pendingNoticeEntryIds = state.pendingNoticeEntryIds.filter(id => !batchIds.has(id));
  }
  return state;
}

export function markJournalEntriesRead(rawState, entryIds) {
  const state = normalizeJournalState(rawState);
  const read = new Set(strings(entryIds));
  return { ...state, unreadEntryIds: state.unreadEntryIds.filter(id => !read.has(id)) };
}

export function acknowledgeJournalNotices(rawState, entryIds = null) {
  const state = normalizeJournalState(rawState);
  const acknowledged = entryIds ? new Set(strings(entryIds)) : new Set(state.pendingNoticeEntryIds);
  return { ...state, pendingNoticeEntryIds: state.pendingNoticeEntryIds.filter(id => !acknowledged.has(id)) };
}

export function allJournalEntries(rawState) {
  const state = normalizeJournalState(rawState);
  return [...state.permanentEntries, ...state.dailyEntries, ...state.dailyArchives].sort((a, b) => {
    const dayA = a.sailingDay || a.dayTo || 0, dayB = b.sailingDay || b.dayTo || 0;
    if (dayA !== dayB) return dayB - dayA;
    return String(b.occurredAt || b.updatedAt || b.createdAt || "").localeCompare(String(a.occurredAt || a.updatedAt || a.createdAt || ""));
  });
}

export function filterJournalEntries(rawState, filter = "all", value = null) {
  const state = normalizeJournalState(rawState);
  const unread = new Set(state.unreadEntryIds);
  return allJournalEntries(state).filter(entry => {
    if (filter === "all") return true;
    if (filter === "unread") return unread.has(entry.id);
    if (filter === "permanent") return !["daily", "archive"].includes(entry.type);
    if (filter === "daily") return ["daily", "archive"].includes(entry.type);
    if (filter === "day") {
      const selectedDay = dayNumber(value);
      return entry.type === "archive"
        ? selectedDay >= entry.dayFrom && selectedDay <= entry.dayTo
        : entry.sailingDay === selectedDay;
    }
    const keyByFilter = { fish: "fishIds", resident: "residentIds", research: "researchIds", ship: "shipIds", route: "routeIds", region: "regionIds", observation: "observationIds" };
    const key = keyByFilter[filter];
    return key ? entry.refs?.[key]?.includes(value) : entry.type === filter;
  });
}

export function developerFillDailyJournal(rawState, { startDay = 1, count = 181, regionId = "sleeping_tide_bay", shipId = "drifting_home" } = {}) {
  let state = normalizeJournalState(rawState);
  const createdAt = new Date().toISOString();
  for (let index = 0; index < Math.max(0, Math.floor(Number(count) || 0)); index += 1) {
    const sailingDay = dayNumber(startDay) + index;
    const event = { eventId: `developer:daily:${sailingDay}`, source: "developer", type: "region.revisited", sailingDay, occurredAt: createdAt, timeId: TIMES[index % TIMES.length].id, weatherId: index % 4 === 0 ? "rain" : "sunny", regionId, shipId, refs: { regionId }, payload: {} };
    state = upsertDailyEntry(state, event, dailyFacts(event)).state;
    state = sealJournalDay(state, sailingDay, createdAt);
  }
  return state;
}

export { JOURNAL_ENTRY_TYPE_LABELS };
