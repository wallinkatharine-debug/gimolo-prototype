// Identity-ish palette (presentation only)
const DOT_COLORS = ['#F472B6','#FB923C','#FBBF24','#34D399','#60A5FA','#818CF8'];
const $ = (id) => document.getElementById(id);

const state = {
  actions: [],
  current: null,
  dots: [],
  total: 0,
  month: 0,
  recent: [],
  history: [],
  // one-shot completion steering (Adjustable Randomness)
  nextBias: null,
};

function loadState(){
  const saved = JSON.parse(localStorage.getItem('gimolo_state') || '{}');
  state.dots = saved.dots || [];
  state.total = saved.total || 0;
  state.month = saved.month || 0;
  state.recent = saved.recent || [];
  state.history = saved.history || [];
}
function saveState(){
  localStorage.setItem('gimolo_state', JSON.stringify({
    dots: state.dots,
    total: state.total,
    month: state.month,
    recent: state.recent.slice(0, 12),
    history: state.history.slice(0, 120),
  }));
}
function show(screenId){
  ['screenHome','screenAction','screenInProgress','screenCelebrate','screenProfile'].forEach(id=>$(id).classList.remove('active'));
  $(screenId).classList.add('active');
}

function renderBanner(el){
  el.innerHTML = '';
  const w = el.clientWidth;
  const h = el.clientHeight;
  // show only the most recent ~75 dots; older ones fade but remain conceptually present
  const visible = state.dots.slice(-75);
  visible.forEach((d) => {
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.width = d.size + 'px';
    dot.style.height = d.size + 'px';
    dot.style.borderRadius = '999px';
    dot.style.background = d.color;
    dot.style.opacity = d.opacity;
    dot.style.left = Math.max(2, Math.min(w - d.size - 2, d.x * w)) + 'px';
    dot.style.top  = Math.max(2, Math.min(h - d.size - 2, d.y * h)) + 'px';
    if (d.glow) dot.style.boxShadow = `0 0 18px ${d.color}66`;
    if (d.halo) dot.style.outline = `2px solid rgba(255,255,255,.72)`;
    el.appendChild(dot);
  });
}

function refreshUI(){
  $('momentumText').textContent = `You’ve started ${state.month} things this month.`;
  renderBanner($('banner'));
}
function refreshProfile(){
  $('pTotal').textContent = state.total;
  $('pMonth').textContent = state.month;
  renderBanner($('bannerProfile'));
  const list = $('recent');
  list.innerHTML = '';
  state.recent.slice(0, 10).forEach(r => {
    const row = document.createElement('div');
    row.className = 'recentItem';
    row.innerHTML = `<div>${r.title}</div><div class="recentMeta">${r.time_min}m • ${r.flavor}</div>`;
    list.appendChild(row);
  });

  const hist = $('history');
  if (!hist) return;
  hist.innerHTML = '';
  state.history.slice(0, 40).forEach(hh => {
    const wrap = document.createElement('div');
    wrap.className = 'histItem';
    const when = new Date(hh.completed_at);
    const whenText = when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' • ' + when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const pills = [
      `${hh.time_min} min`,
      hh.flavor,
      hh.energy,
      hh.location,
    ];
    wrap.innerHTML = `
      <div class="histTop">
        <div class="histTitle">${hh.title}</div>
        <div class="histWhen">${whenText}</div>
      </div>
      <div class="histPills">
        ${pills.map(p=>`<span class="histPill">${p}</span>`).join('')}
        ${hh.community ? `<span class="histHalo" title="Community action" aria-label="Community action"></span>` : ``}
      </div>
    `;
    hist.appendChild(wrap);
  });
}


function uniqueSorted(arr){
  return Array.from(new Set(arr.filter(v => v != null && v !== ''))).sort((a,b)=>String(a).localeCompare(String(b)));
}
function populateSelect(id, values, keepValue=true){
  const sel = $(id);
  if (!sel) return;
  const prev = sel.value;
  // Clear existing options
  sel.innerHTML = '';
  const optAll = document.createElement('option');
  optAll.value = 'All';
  optAll.textContent = 'All';
  sel.appendChild(optAll);
  values.forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  });
  if (keepValue && prev && Array.from(sel.options).some(o=>o.value===prev)){
    sel.value = prev;
  } else {
    sel.value = 'All';
  }
}
function initFiltersFromData(){
  // Build filter value sets from the current dataset so UI and logic cannot drift.
  const energies = uniqueSorted(state.actions.map(a=>a.energy));
  const flavors = uniqueSorted(state.actions.map(a=>a.flavor));
  const locations = uniqueSorted(state.actions.map(a=>a.location));
  populateSelect('fEnergy', energies);
  populateSelect('fFlavor', flavors);
  populateSelect('fLocation', locations);
  // Time filter stays as fixed buckets in HTML; keep as-is.
}

function matchesFilters(a){
  const energy = $('fEnergy')?.value ?? 'All';
  const flavor = $('fFlavor')?.value ?? 'All';
  const time = $('fTime')?.value ?? 'All';
  const location = $('fLocation')?.value ?? 'All';
  if (energy !== 'All' && a.energy !== energy) return false;
  if (flavor !== 'All' && a.flavor !== flavor) return false;
  if (location !== 'All' && a.location !== location) return false;
  if (time !== 'All' && a.time_min > parseInt(time,10)) return false;
  return true;
}
function pickRandom(){
  const pool = state.actions.filter(matchesFilters);
  const usePool = pool.length ? pool : state.actions;

  // One-shot completion steering (applies once, then resets)
  let candidates = usePool;
  if (state.nextBias && state.current){
    const cur = state.current;
    if (state.nextBias === 'keep'){
      candidates = usePool.filter(a => a.energy === cur.energy || a.flavor === cur.flavor);
    } else if (state.nextBias === 'switch'){
      candidates = usePool.filter(a => a.energy !== cur.energy || a.flavor !== cur.flavor);
    }
  }
  if (!candidates.length) candidates = usePool;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  state.nextBias = null;
  setSteerUI(null);
  return chosen;
}
function showAction(a){
  state.current = a;
  $('aTitle').textContent = a.title;
  $('aDesc').textContent = a.desc;
  $('aTime').textContent = `${a.time_min} min`;
  $('aFlavor').textContent = a.flavor;
  $('aEnergy').textContent = a.energy;
  $('aLocation').textContent = a.location;
  $('aSupplies').textContent = a.supplies;
  show('screenAction');
}

function addDotForAction(){
  const i = state.dots.length;
  const color = DOT_COLORS[i % DOT_COLORS.length];
  // Organic-ish placement with mild deterministic jitter
  const x = ((i * 0.61803398875) % 1.0);
  const y = ((i * 0.38196601125) % 1.0);
  const size = 10 + (i % 5) * 4;
  // Fade older dots slightly within visible window
  const ageInWindow = Math.max(0, 74 - (Math.max(0, state.dots.length - 75)));
  const opacity = 0.62 + Math.min(0.32, ageInWindow * 0.004);
  // recency glow for last 3–5
  state.dots.forEach(d => { d.glow = false; });
  state.dots.push({
    x, y: 0.12 + (y * 0.78), size, color,
    opacity,
    glow: true,
    halo: !!state.current?.community,
  });
  // glow a few recent
  const recentN = 4;
  const start = Math.max(0, state.dots.length - recentN);
  for (let j = start; j < state.dots.length; j++) state.dots[j].glow = true;
}

function setSteerUI(mode){
  const ids = ['btnKeep','btnSwitch','btnSurprise'];
  ids.forEach(id => { const el = $(id); if (el) el.classList.remove('active'); });
  if (mode === 'keep') $('btnKeep')?.classList.add('active');
  if (mode === 'switch') $('btnSwitch')?.classList.add('active');
  if (mode === 'surprise') $('btnSurprise')?.classList.add('active');
}

async function init(){
  loadState();
  refreshUI();

  const res = await fetch('actions.json');
  state.actions = await res.json();
  initFiltersFromData();

  $('btnSpin').addEventListener('click', () => showAction(pickRandom()));
  $('btnSpinAgain').addEventListener('click', () => showAction(pickRandom()));
  $('btnStart').addEventListener('click', () => show('screenInProgress'));
  $('btnCancel').addEventListener('click', () => show('screenHome'));

  $('btnComplete').addEventListener('click', () => {
    state.total += 1;
    state.month += 1;
    addDotForAction();
    state.recent.unshift(state.current);
    state.history.unshift({
      activity_id: state.current?.id,
      title: state.current?.title,
      time_min: state.current?.time_min,
      flavor: state.current?.flavor,
      energy: state.current?.energy,
      location: state.current?.location,
      community: !!state.current?.community,
      completed_at: Date.now(),
    });
    saveState();
    $('celebrateText').textContent = `That’s ${state.month} this month. Momentum builds.`;
    show('screenCelebrate');
  });

  // Completion steering
  $('btnKeep')?.addEventListener('click', () => { state.nextBias = 'keep'; setSteerUI('keep'); });
  $('btnSwitch')?.addEventListener('click', () => { state.nextBias = 'switch'; setSteerUI('switch'); });
  $('btnSurprise')?.addEventListener('click', () => { state.nextBias = 'surprise'; setSteerUI('surprise'); });

  $('btnDone').addEventListener('click', () => { refreshUI(); show('screenHome'); });
  $('btnProfile').addEventListener('click', () => { refreshProfile(); show('screenProfile'); });
  $('btnBack').addEventListener('click', () => { refreshUI(); show('screenHome'); });

  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch(e) {}
  }
}

init();
