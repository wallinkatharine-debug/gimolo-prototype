/* Gimolo — Static Prototype with Vibe Layer (GitHub Pages friendly)
   - No build system
   - index.html loads: styles.css + app.js + JSON libraries
   - Vibe is deterministic from activity metadata (with safe defaults)
*/

const STATE_KEY = "gimolo_state_vibe_static_v1";

const Tone = {
  SPARK: "SPARK",
  ANCHOR: "ANCHOR",
  BUILD: "BUILD",
  EXPLORE: "EXPLORE",
  RESET: "RESET",
  DEPTH: "DEPTH",
  OUTWARD: "OUTWARD",
};

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function emptyHistory() {
  return { lastHeaders: [], lastPraise: [], lastTones: [] };
}

// ---------- Vibe core (deterministic) ----------
function resolveTone(a) {
  if (a.civic_tag === true) return Tone.OUTWARD;
  if ((a.tier || 1) >= 3) return Tone.DEPTH;
  if ((a.pac || 2) <= 2 && (a.energy || "Moderate") === "Chill") return Tone.RESET;
  if ((a.structural_pattern || "") === "Relational" && (a.imy || "Medium") !== "Low")
    return Tone.ANCHOR;
  if (
    (((a.structural_pattern || "") === "Play") || ((a.structural_pattern || "") === "Physical")) &&
    (a.pac || 2) <= 2
  ) return Tone.SPARK;
  if ((a.structural_pattern || "") === "Build") return Tone.BUILD;
  if ((a.structural_pattern || "") === "Cognitive") return Tone.EXPLORE;
  return Tone.RESET;
}

function energyLabel(energy) {
  switch (energy) {
    case "Chill": return { icon: "🌿", label: "Calm" };
    case "Active": return { icon: "🔥", label: "Active" };
    default: return { icon: "⚡", label: "Moderate" };
  }
}

function identityChip(v) {
  switch (v) {
    case "Helper": return "Connection Builder";
    case "Builder": return "Builder Move";
    case "Explorer": return "Explorer Mode";
    case "Curious": return "Curiosity Builder";
    default: return "Explorer Mode";
  }
}

function pickFromPool(pool, avoidSet) {
  const candidates = pool.filter(x => !avoidSet.has(x));
  const source = candidates.length ? candidates : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function clampHistory(history) {
  const MAX_HEADERS = 5;
  const MAX_PRAISE = 3;
  const MAX_TONES = 3;
  return {
    lastHeaders: history.lastHeaders.slice(-MAX_HEADERS),
    lastPraise: history.lastPraise.slice(-MAX_PRAISE),
    lastTones: history.lastTones.slice(-MAX_TONES),
  };
}

function violatesToneRun(history, tone) {
  const lastTwo = history.lastTones.slice(-2);
  return lastTwo.length === 2 && lastTwo[0] === tone && lastTwo[1] === tone;
}

// ---------- Vibe copy pools (compact; can expand later) ----------
const VIBE = {
  [Tone.SPARK]: {
    headers: [
      "Tiny chaos incoming.","Micro moment.","Energy injection.","Momentum starter.","Quick spark.",
      "Interrupt the autopilot.","Fast fun.","Quick shift.","Small move. Big ripple.","Action beats scroll."
    ],
    praiseLow: ["Good.","Solid.","Done.","That works.","Nice."],
    praiseStd: ["That landed.","Clean execution.","Good energy.","Good call.","Quick and real.","That moved something."],
    praiseHigh: ["That sparked.","That one sticks.","Momentum unlocked."],
    mirrors: ["Tiny moves add up.","Momentum beats autopilot.","Micro wins matter."]
  },
  [Tone.ANCHOR]: {
    headers: [
      "This one builds connection.","A small shared moment.","Quiet but real.","Slow it down.","Together moment.",
      "Presence beats scrolling.","Build the thread.","Stay here a minute.","A little closer.","Connection first."
    ],
    praiseLow: ["Good.","That helps.","Done.","Nice.","Solid."],
    praiseStd: ["That mattered.","Worth slowing down for.","Real moment.","Quiet win.","That builds memory."],
    praiseHigh: ["That becomes “remember when.”","That grows roots.","That compounds over time."],
    mirrors: ["You made space for each other.","Small connection, real impact.","That’s how bonds strengthen."]
  },
  [Tone.BUILD]: {
    headers: [
      "Let’s build something.","Make it real.","Hands on.","Tangible progress.","Turn thought into action.",
      "Practical shift.","Make it happen.","Build the thing.","Create, don’t consume.","Construct mode."
    ],
    praiseLow: ["Good.","Solid.","Done.","Nice.","That works."],
    praiseStd: ["Solid work.","Well executed.","That builds.","Good structure.","That moves the needle."],
    praiseHigh: ["That compounds.","That pays back.","Real progress."],
    mirrors: ["That’s competence in motion.","This builds confidence.","Builders stack outcomes."]
  },
  [Tone.EXPLORE]: {
    headers: [
      "Let’s look closer.","Notice something new.","A different angle.","Shift perspective.","Quiet discovery.",
      "What do you notice?","Expand the view.","Investigate lightly.","A closer look.","Small discovery ahead."
    ],
    praiseLow: ["Good catch.","Nice.","Done.","Solid.","That helps."],
    praiseStd: ["Worth noticing.","That’s insight.","Nice observation.","That adds up.","That builds clarity."],
    praiseHigh: ["That reframes things.","That deepens understanding.","That changes how you see it."],
    mirrors: ["Curiosity compounds.","You noticed more.","That widens the lens."]
  },
  [Tone.RESET]: {
    headers: [
      "Keep it simple.","No pressure.","Easy win.","Gentle reset.","Low friction.",
      "Let this be easy.","Quiet momentum.","One small move.","Soft start.","Keep it light."
    ],
    praiseLow: ["Good.","Done.","Solid.","That works.","Nice."],
    praiseStd: ["That’s enough.","Clean and done.","Good call.","Steady.","That keeps it going."],
    praiseHigh: ["Simple but meaningful.","That keeps momentum alive.","That mattered more than it looked."],
    mirrors: ["You showed up.","Small steps count.","That sustains the habit."]
  },
  [Tone.DEPTH]: {
    headers: [
      "This one goes deeper.","Set aside a little time.","Intentional action.","Worth the effort.","A memory anchor.",
      "Something that stays.","Make it count.","Designed depth.","This one compounds.","Commit to this one."
    ],
    praiseLow: ["Solid.","Good.","Done.","Worth it.","Nice."],
    praiseStd: ["That mattered.","Strong follow-through.","Real investment.","That carries forward.","Worth the effort."],
    praiseHigh: ["That becomes part of your story.","That builds family culture.","That shapes identity."],
    mirrors: ["This one lasts.","That anchors memory.","That builds identity."]
  },
  [Tone.OUTWARD]: {
    headers: [
      "Small outward step.","Do something helpful.","Start local.","Quiet contribution.","Calm contribution.",
      "One constructive move.","Gentle impact.","Action over debate.","Do something useful.","Outward, simply."
    ],
    praiseLow: ["Good.","That helps.","Solid.","Nice.","Done."],
    praiseStd: ["Good contribution.","Constructive move.","Quiet impact.","That adds up.","That counts."],
    praiseHigh: ["That builds community.","That carries outward.","That shapes community culture."],
    mirrors: ["You contributed.","That improves your space.","That builds civic habit."]
  }
};

function praisePoolForMdr(tone, mdr) {
  const reg = VIBE[tone];
  if (mdr >= 5) return reg.praiseHigh;
  if (mdr === 4) return reg.praiseStd;
  return reg.praiseLow;
}

function getVibeRenderData(activity, history, { completion = false } = {}) {
  const tone0 = resolveTone(activity);
  let tone = tone0;

  // prevent 3 same tones in a row (except RESET safety)
  if (violatesToneRun(history, tone0) && tone0 !== Tone.RESET) tone = Tone.RESET;

  const reg = VIBE[tone];
  const headerAvoid = new Set(history.lastHeaders);
  const praiseAvoid = new Set(history.lastPraise);

  const header = pickFromPool(reg.headers, headerAvoid);
  const praise = pickFromPool(praisePoolForMdr(tone, activity.mdr || 4), praiseAvoid);

  let mirror = "";
  if (completion && Math.random() < 0.3) {
    mirror = reg.mirrors[Math.floor(Math.random() * reg.mirrors.length)];
  }

  const nextHistory = clampHistory({
    lastHeaders: [...history.lastHeaders, header],
    lastPraise: completion ? [...history.lastPraise, praise] : history.lastPraise,
    lastTones: [...history.lastTones, tone],
  });

  return {
    tone,
    header,
    praise,
    mirror,
    identityChip: identityChip(activity.identity_vector),
    energy: energyLabel(activity.energy),
    nextHistory,
  };
}

// ---------- App ----------
let core = [];
let civic = [];
let all = [];

let state = loadState() || {
  modeCommunityOnly: false,
  current: null,
  completedIds: {},
  vibeHistory: emptyHistory(),
};

function el(id) { return document.getElementById(id); }

function safeNormalize(a) {
  // If your JSON already has these fields, this won’t change them.
  return {
    id: a.id ?? String(Math.random()),
    title: a.title ?? "Untitled",
    instructions: Array.isArray(a.instructions)
      ? a.instructions
      : Array.isArray(a.steps)
        ? a.steps
        : (typeof a.instructions === "string" ? [a.instructions] : ["Do the thing."]),
    civic_tag: !!a.civic_tag,
    tier: a.tier ?? 1,
    pac: a.pac ?? 2,
    mdr: a.mdr ?? 4,
    imy: a.imy ?? "Medium",
    energy: a.energy ?? "Moderate",
    emotional_load: a.emotional_load ?? "Light",
    planning_flag: a.planning_flag ?? "Immediate",
    structural_pattern: a.structural_pattern ?? "Play",
    identity_vector: a.identity_vector ?? "Explorer",
  };
}

async function loadLibraries() {
  const [coreRes, civicRes] = await Promise.all([
    fetch("./activities_core_mixed.json"),
    fetch("./activities_civic_only.json"),
  ]);
  const coreJson = await coreRes.json();
  const civicJson = await civicRes.json();

  const coreArr = Array.isArray(coreJson) ? coreJson : (coreJson.activities || []);
  const civicArr = Array.isArray(civicJson) ? civicJson : (civicJson.activities || []);

  core = coreArr.map(safeNormalize);
  civic = civicArr.map(safeNormalize);
  all = core.concat(civic);

  renderCounts();
  renderCurrent("reveal");
}

function renderCounts() {
  const coreCount = core.length;
  const civicCount = civic.length;
  const completedCount = Object.keys(state.completedIds || {}).length;
  const c = el("counts");
  if (c) c.textContent = `Core: ${coreCount} • Community: ${civicCount} • Completed: ${completedCount}`;
}

function pickPool() {
  return state.modeCommunityOnly ? civic : all;
}

function pickRandomActivity(excludeId) {
  const pool = pickPool().filter(a => !excludeId || a.id !== excludeId);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function setCurrent(a) {
  state.current = a;
  saveState(state);
  renderCurrent("reveal");
}

function renderCurrent(phase) {
  const a = state.current;

  const cb = el("communityOnly");
  if (cb) cb.checked = !!state.modeCommunityOnly;

  if (!a) {
    el("promptLine").textContent = "Press Spin.";
    el("vibeHeader").textContent = "";
    el("vibeChip").textContent = "";
    el("vibeEnergy").textContent = "";
    el("activityTitle").textContent = "";
    el("activityList").innerHTML = "";
    el("vibePraise").textContent = "";
    el("vibeMirror").textContent = "";
    return;
  }

  // Vibe data
  const vibe = getVibeRenderData(a, state.vibeHistory, { completion: phase === "completion" });
  state.vibeHistory = vibe.nextHistory;
  saveState(state);

  el("promptLine").textContent = "";
  el("vibeHeader").textContent = vibe.header;
  el("vibeChip").textContent = vibe.identityChip;
  el("vibeEnergy").textContent = `${vibe.energy.icon} ${vibe.energy.label}`;
  el("activityTitle").textContent = a.title;

  const list = el("activityList");
  list.innerHTML = "";
  a.instructions.forEach(line => {
    const li = document.createElement("li");
    li.textContent = line;
    list.appendChild(li);
  });

  if (phase === "completion") {
    el("vibePraise").textContent = vibe.praise;
    el("vibeMirror").textContent = vibe.mirror || "";
  } else {
    el("vibePraise").textContent = "";
    el("vibeMirror").textContent = "";
  }
}

function onSpin() {
  const next = pickRandomActivity(state.current?.id);
  if (!next) return;
  setCurrent(next);
}

function onReroll() {
  onSpin();
}

function onComplete() {
  if (!state.current) return;
  state.completedIds[state.current.id] = true;
  saveState(state);
  renderCounts();
  renderCurrent("completion");
}

function onResetLocal() {
  localStorage.removeItem(STATE_KEY);
  state = {
    modeCommunityOnly: false,
    current: null,
    completedIds: {},
    vibeHistory: emptyHistory(),
  };
  saveState(state);
  renderCounts();
  renderCurrent("reveal");
}

function wireUI() {
  el("btnSpin")?.addEventListener("click", onSpin);
  el("btnReroll")?.addEventListener("click", onReroll);
  el("btnComplete")?.addEventListener("click", onComplete);
  el("btnReset")?.addEventListener("click", onResetLocal);

  el("communityOnly")?.addEventListener("change", (e) => {
    state.modeCommunityOnly = !!e.target.checked;
    saveState(state);
    renderCurrent("reveal");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  wireUI();
  await loadLibraries();
});
