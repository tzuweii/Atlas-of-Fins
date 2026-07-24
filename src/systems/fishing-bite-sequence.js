const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function randomUnit(random) {
  const value = Number(random());
  if (!Number.isFinite(value)) return 0;
  return clamp(value, 0, 1);
}

function sampleRange([min, max], random, multiplier = 1) {
  return Math.round((min + (max - min) * randomUnit(random)) * multiplier);
}

function weightedChoice(entries, weightFor, random) {
  const weights = entries.map(entry => Math.max(0, weightFor(entry)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!total) return entries[0];
  let cursor = randomUnit(random) * total;
  for (let index = 0; index < entries.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return entries[index];
  }
  return entries.at(-1);
}

const CUE_DURATIONS = {
  "probe-soft": [520, 780],
  "probe-quick": [340, 520],
  "probe-strong": [620, 880],
  retreat: [560, 900],
  "far-retreat": [1050, 1450],
  reapproach: [600, 900],
  return: [650, 950],
  cross: [750, 1050],
  circle: [900, 1250],
  hover: [450, 800],
  hesitate: [260, 420],
  still: [650, 1050]
};

const cue = (type, options = {}) => ({ type, ...options });

const BITE_TEMPLATES = {
  common: [
    {
      id: "direct-confirm",
      styles: ["steady", "endurance"],
      cues: [
        cue("probe-soft"),
        cue("retreat"),
        cue("reapproach")
      ]
    },
    {
      id: "lively-short-pecks",
      styles: ["sprint", "sway"],
      cues: [
        cue("probe-quick"),
        cue("retreat"),
        cue("reapproach"),
        cue("probe-soft"),
        cue("still")
      ]
    }
  ],
  uncommon: [
    {
      id: "measured-return",
      styles: ["steady", "endurance"],
      cues: [
        cue("probe-soft"),
        cue("far-retreat"),
        cue("return"),
        cue("circle", { flip: true }),
        cue("probe-strong"),
        cue("still")
      ]
    },
    {
      id: "cautious-three-step",
      styles: ["endurance", "rare"],
      cues: [
        cue("probe-soft"),
        cue("retreat"),
        cue("circle", { flip: true }),
        cue("probe-quick"),
        cue("hesitate"),
        cue("probe-strong"),
        cue("still")
      ]
    },
    {
      id: "weaving-three-step",
      styles: ["sprint", "sway"],
      cues: [
        cue("circle", { flip: true }),
        cue("probe-quick"),
        cue("retreat"),
        cue("reapproach"),
        cue("probe-quick"),
        cue("cross", { flip: true }),
        cue("probe-soft"),
        cue("hover")
      ]
    }
  ],
  rare: [
    {
      id: "cautious-side-switch",
      styles: ["steady", "endurance", "sway", "rare"],
      cues: [
        cue("probe-soft"),
        cue("retreat"),
        cue("circle", { flip: true }),
        cue("probe-quick"),
        cue("hesitate"),
        cue("probe-quick"),
        cue("far-retreat"),
        cue("return"),
        cue("circle", { flip: true }),
        cue("probe-strong"),
        cue("still")
      ]
    },
    {
      id: "urgent-false-departure",
      styles: ["sprint", "sway", "rare"],
      cues: [
        cue("circle", { flip: true }),
        cue("probe-quick"),
        cue("hesitate"),
        cue("probe-quick"),
        cue("far-retreat"),
        cue("return"),
        cue("probe-strong"),
        cue("cross", { flip: true }),
        cue("probe-soft"),
        cue("still")
      ]
    }
  ],
  departed: [
    {
      id: "quiet-departure",
      styles: [],
      cues: [
        cue("probe-soft"),
        cue("far-retreat")
      ]
    },
    {
      id: "distracted-departure",
      styles: [],
      cues: [
        cue("circle", { flip: true }),
        cue("probe-quick"),
        cue("retreat"),
        cue("reapproach"),
        cue("probe-soft"),
        cue("far-retreat")
      ]
    }
  ]
};

const INITIAL_DELAY_BY_RARITY = {
  common: [2950, 3800],
  uncommon: [3000, 3900],
  rare: [3050, 4000],
  departed: [2800, 3800]
};

const BEHAVIOR_TEMPO = {
  steady: 1,
  sprint: 0.88,
  endurance: 1.08,
  sway: 1,
  rare: 1.04
};

const HIGH_TIER_EXTRA_PROBES = {
  rare: 0,
  epic: 1,
  legendary: 2,
  mythic: 3,
  miracle: 4
};

function templateWeight(template, behavior) {
  return template.styles.includes(behavior) ? 1.8 : 1;
}

function oppositeSide(side) {
  return side === "left" ? "right" : "left";
}

export function createFishingBitePlan({ fish = null, bait = null } = {}, random = Math.random) {
  const rarity = fish?.rarity || "departed";
  const templateRarity = BITE_TEMPLATES[rarity]
    ? rarity
    : Object.hasOwn(HIGH_TIER_EXTRA_PROBES, rarity) ? "rare" : fish ? "common" : "departed";
  const behavior = fish?.behavior || "steady";
  const templates = BITE_TEMPLATES[templateRarity];
  const template = weightedChoice(templates, entry => templateWeight(entry, behavior), random);
  const baitAttraction = clamp(Number(bait?.bite) || 1, 0.65, 1.2);
  const initialTempo = clamp(1 / baitAttraction, 0.9, 1.12);
  const actionTempo = BEHAVIOR_TEMPO[behavior] || 1;
  let side = randomUnit(random) < 0.5 ? "left" : "right";
  const initialSide = side;
  const cueSpecs = [...template.cues];
  const finalRest = cueSpecs.at(-1)?.type === "still" ? cueSpecs.pop() : null;
  for (let index = 0; index < (HIGH_TIER_EXTRA_PROBES[rarity] || 0); index += 1) {
    cueSpecs.push(cue("hesitate"), cue("cross", { flip: true }), cue(index % 2 ? "probe-soft" : "probe-quick"));
  }
  if (finalRest) cueSpecs.push(finalRest);

  const cues = cueSpecs.map(spec => {
    if (spec.flip) side = oppositeSide(side);
    return {
      type: spec.type,
      side,
      durationMs: sampleRange(CUE_DURATIONS[spec.type], random, actionTempo)
    };
  });
  const initialDelayMs = sampleRange(INITIAL_DELAY_BY_RARITY[templateRarity], random, initialTempo);
  const probeCount = cues.filter(entry => entry.type.startsWith("probe-")).length;

  return {
    id: template.id,
    rarity,
    initialSide,
    initialDelayMs,
    cues,
    probeCount,
    terminal: fish ? "bite" : "departed",
    totalDelayMs: initialDelayMs + cues.reduce((sum, entry) => sum + entry.durationMs, 0)
  };
}

export const FISHING_BITE_TEMPLATE_IDS = Object.freeze(Object.fromEntries(
  Object.entries(BITE_TEMPLATES).map(([rarity, templates]) => [
    rarity,
    Object.freeze(templates.map(template => template.id))
  ])
));
