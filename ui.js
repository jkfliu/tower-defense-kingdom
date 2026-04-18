// ─── ui.js ────────────────────────────────────────────────────────────────────
// Input handling, popup logic, HUD updates, wave control, and game init.
// Reads globals from constants.js, game.js state vars, towers.js, theme.js.

// ─── Canvas interaction ───────────────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if (phase !== 'placing' && phase !== 'between' && phase !== 'wave') {
    hoverCell = null;
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  hoverCell = {
    col: Math.floor(mx / CELL),
    row: Math.floor(my / CELL),
  };
  if (hoverCell.row < 0 || hoverCell.row >= ROWS || hoverCell.col < 0 || hoverCell.col >= COLS) {
    hoverCell = null;
  }

  if (tierPopup) {
    popupHoverIdx = getPlacementCardHover(mx, my, tierPopup);
  } else if (turretPopup) {
    turretPopupHoverIdx = getPopupRowAt(mx, my, turretPopup, getTurretPopupRows(turretPopup.turret).length);
  }
});

canvas.addEventListener('mouseleave', () => { hoverCell = null; });

canvas.addEventListener('click', e => {
  if (phase !== 'placing' && phase !== 'between' && phase !== 'wave') return;
  const rect = canvas.getBoundingClientRect();
  const mx  = e.clientX - rect.left;
  const my  = e.clientY - rect.top;
  const col = Math.floor(mx / CELL);
  const row = Math.floor(my / CELL);

  if (turretPopup) { handleTurretPopupClick(mx, my); return; }
  if (tierPopup)   { handleTierPopupClick(mx, my);   return; }
  handleCellClick(row, col);
});

function handleCellClick(row, col) {
  const existing = turrets.find(t => t.row === row && t.col === col);
  if (existing) {
    const cellX = existing.col * CELL;
    const px = (cellX + CELL + POPUP_W > W) ? cellX - POPUP_W : cellX + CELL;
    const py = Math.min(existing.row * CELL, H - getTurretPopupHeight(existing));
    turretPopup         = { turret: existing, px, py };
    turretPopupHoverIdx = -1;
    return;
  }
  if (!isValidPlacement(row, col)) return;
  const cellX = col * CELL;
  const px = (cellX + CELL + POPUP_W > W) ? cellX - POPUP_W : cellX + CELL;
  const py = Math.min(row * CELL, H - getPlacementPopupHeight());
  tierPopup     = { row, col, px, py };
  popupHoverIdx = -1;
}

function handleTierPopupClick(mx, my) {
  const kind = getPlacementCardAt(mx, my, tierPopup);
  if (kind) {
    const tiers = getTierTable(kind);
    if (gold >= tiers.basic.cost) {
      gold -= tiers.basic.cost;
      turrets.push(makeTurret(tierPopup.row, tierPopup.col, 'basic', kind));
    }
  }
  tierPopup     = null;
  popupHoverIdx = -1;
}

function handleTurretPopupClick(mx, my) {
  const rows = getTurretPopupRows(turretPopup.turret);
  const idx  = getPopupRowAt(mx, my, turretPopup, rows.length);
  const t    = turretPopup.turret;

  if (idx === 0) {
    const nextTier = TIER_ORDER[TIER_ORDER.indexOf(t.tier) + 1] || null;
    const tiers    = getTierTable(t.kind);
    if (nextTier && gold >= tiers[nextTier].cost) {
      gold -= tiers[nextTier].cost;
      const cfg = tiers[nextTier];
      t.tier = nextTier; t.damage = cfg.damage; t.fireRate = cfg.fireRate;
      t.range = cfg.range * CELL; t.originalCost = cfg.cost;
    }
  } else if (idx === 1) {
    gold   += Math.floor(t.originalCost * 0.5);
    turrets = turrets.filter(x => x !== t);
  }

  turretPopup         = null;
  turretPopupHoverIdx = -1;
}

// ─── HUD & overlay ────────────────────────────────────────────────────────────
function setStartButton(label, classes = []) {
  const btn = document.getElementById('start-btn');
  btn.textContent = label;
  btn.className   = classes.join(' ');
}

function showOverlay(msg, btnLabel, subMsg = '') {
  const overlay = document.getElementById('overlay');
  overlay.classList.add('active');
  const msgEl = document.getElementById('msg');
  msgEl.textContent   = msg;
  msgEl.style.display = msg ? 'block' : 'none';
  const subEl = document.getElementById('sub-msg');
  subEl.textContent   = subMsg;
  subEl.style.display = subMsg ? 'block' : 'none';
  const btn = document.getElementById('action-btn');
  btn.textContent   = btnLabel;
  btn.style.display = btnLabel ? 'inline-block' : 'none';
}

function hideOverlay() {
  document.getElementById('overlay').classList.remove('active');
  document.getElementById('msg').style.display        = 'none';
  document.getElementById('sub-msg').style.display    = 'none';
  document.getElementById('action-btn').style.display = 'none';
}

function updateHUD() {
  document.getElementById('wave-val').textContent  = `${wave} / ${TOTAL_WAVES}`;
  document.getElementById('lives-val').textContent = lives;
  document.getElementById('score-val').textContent = score;
  document.getElementById('gold-val').textContent  = gold;
}

// ─── Button event listeners ───────────────────────────────────────────────────
document.getElementById('mute-btn').addEventListener('click', () => {
  muted = !muted;
  const btn = document.getElementById('mute-btn');
  btn.textContent = muted ? 'SFX: OFF' : 'SFX: ON';
  btn.classList.toggle('muted', muted);
});

document.getElementById('start-btn').addEventListener('click', () => {
  if (phase === 'placing' || phase === 'between') {
    startWave();
  } else if (phase === 'wave') {
    paused = !paused;
    if (!paused) lastFrame = 0;
    setStartButton(paused ? 'Resume' : 'Pause', paused ? ['paused'] : []);
  }
});

document.getElementById('new-game-btn').addEventListener('click', initGame);

document.getElementById('action-btn').addEventListener('click', () => {
  if (phase === 'lose' || phase === 'win') initGame();
});

// ─── Wave & init ──────────────────────────────────────────────────────────────
function startWave() {
  wave++;
  spawnedCount  = 0;
  lastSpawnTime = 0;
  enemies       = [];
  bullets       = [];
  tierPopup           = null;
  turretPopup         = null;
  turretPopupHoverIdx = -1;
  phase  = 'wave';
  paused = false;
  canvas.classList.remove('placing');
  setStartButton('Pause');
  hideOverlay();
}

function initGame() {
  path      = generatePath();
  pathSet   = new Set(path.map(c => `${c.row},${c.col}`));
  turrets   = [];
  enemies   = [];
  bullets   = [];
  particles = [];
  wave  = 0;
  lives = 3;
  score = 0;
  gold  = STARTING_GOLD;
  phase = 'placing';
  lastFrame     = 0;
  spawnedCount  = 0;
  lastSpawnTime = 0;
  hoverCell     = null;
  tierPopup           = null;
  popupHoverIdx       = -1;
  turretPopup         = null;
  turretPopupHoverIdx = -1;
  paused = false;
  setStartButton('Start Game');
  canvas.classList.add('placing');
  hideOverlay();
}
