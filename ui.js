// ─── ui.js ────────────────────────────────────────────────────────────────────
// Input handling, popup logic, HUD updates, wave control, and game init.
// Reads globals from constants.js, game.js state vars, towers.js, theme.js.

// ─── Canvas interaction ───────────────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if (phase === 'map' && mapDragging) {
    mapCamX = mapDragCamX + (e.clientX - mapDragStartX);
    mapCamY = mapDragCamY + (e.clientY - mapDragStartY);
    clampMapCamera();
    return;
  }
  if (phase === 'map' && mapPopup) {
    const rect = canvas.getBoundingClientRect();
    handleMapPopupHover(e.clientX - rect.left, e.clientY - rect.top);
    return;
  }
  if (phase === 'map' && _resetViewRect) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const r  = _resetViewRect;
    canvas.style.cursor = (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) ? 'pointer' : 'default';
    return;
  }
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

canvas.addEventListener('mouseleave', () => {
  hoverCell   = null;
  mapDragging = false;
});

// ─── Map pan & zoom ───────────────────────────────────────────────────────────
canvas.addEventListener('wheel', e => {
  if (phase !== 'map' || mapPopup) return;
  e.preventDefault();
  const rect  = canvas.getBoundingClientRect();
  const mx    = e.clientX - rect.left;
  const my    = e.clientY - rect.top;
  const delta = e.deltaY < 0 ? 1.1 : 0.91;
  const newZoom = Math.min(2.5, Math.max(0.35, mapZoom * delta));
  // Zoom toward cursor
  mapCamX = mx - (mx - mapCamX) * (newZoom / mapZoom);
  mapCamY = my - (my - mapCamY) * (newZoom / mapZoom);
  mapZoom = newZoom;
  clampMapCamera();
}, { passive: false });

canvas.addEventListener('mousedown', e => {
  if (phase !== 'map' || mapPopup) return;
  mapDragging   = true;
  mapDragStartX = e.clientX;
  mapDragStartY = e.clientY;
  mapDragCamX   = mapCamX;
  mapDragCamY   = mapCamY;
});

document.addEventListener('mouseup', () => { mapDragging = false; });

canvas.addEventListener('click', e => {
  // Suppress click if it was the end of a drag
  const dragDist = Math.hypot(e.clientX - mapDragStartX, e.clientY - mapDragStartY);
  if (phase === 'map' && !mapPopup && dragDist > 5) return;

  const rect = canvas.getBoundingClientRect();
  const mx  = e.clientX - rect.left;
  const my  = e.clientY - rect.top;

  if (phase === 'map')     { handleMapClick(mx, my); return; }
  if (phase === 'victory') {
    if (_victoryBtnRect) {
      const b = _victoryBtnRect;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (currentLevel >= CAMPAIGN_LEVELS.length) {
          // All levels done — wrap campaign, go straight to map
          currentLevel = 0;
          campaignLoop++;
          phase = 'map';
        } else {
          // More levels remain — play reveal animation
          revealProgress = 0;
          phase = 'reveal';
        }
        updateHUD();
      }
    }
    return;
  }
  if (phase !== 'placing' && phase !== 'between' && phase !== 'wave') return;

  const col = Math.floor(mx / CELL);
  const row = Math.floor(my / CELL);

  if (handleWavePreviewClick(mx, my)) return;
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
    turretPopup         = { turret: existing, px, py, w: 240 };
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
  document.getElementById('wave-val').textContent  = phase === 'map' ? '—' : `${wave} / ${wavesInLevel()}`;
  document.getElementById('lives-val').textContent = phase === 'map' ? '—' : lives;
  document.getElementById('score-val').textContent = score;
  document.getElementById('gold-val').textContent  = phase === 'map' ? '—' : gold;
  const inGame = phase === 'placing' || phase === 'wave' || phase === 'between';
  document.getElementById('start-btn').style.display      = inGame ? 'inline-block' : 'none';
  document.getElementById('quit-btn').style.display        = inGame ? 'inline-block' : 'none';
}

// ─── Button event listeners ───────────────────────────────────────────────────
document.getElementById('mute-btn').addEventListener('click', () => {
  muted = !muted;
  const btn = document.getElementById('mute-btn');
  btn.textContent = muted ? 'SFX: OFF' : 'SFX: ON';
  btn.classList.toggle('muted', muted);
});

document.getElementById('debug-btn').addEventListener('click', () => {
  debugMode = !debugMode;
  const btn = document.getElementById('debug-btn');
  btn.textContent = debugMode ? 'Debug: ON' : 'Debug: OFF';
  btn.classList.toggle('active', debugMode);
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


document.getElementById('quit-btn').addEventListener('click', () => {
  bullets   = [];
  enemies   = [];
  particles = [];
  paused    = false;
  phase     = 'map';
  setStartButton('', ['dimmed']);
  canvas.classList.remove('placing');
  hideOverlay();
  updateHUD();
});

document.getElementById('action-btn').addEventListener('click', () => {
  if (phase === 'lose') {
    // Return to map so player can retry the same level
    phase = 'map';
    setStartButton('', ['dimmed']);
    canvas.classList.remove('placing');
    hideOverlay();
    updateHUD();
  } else if (phase === 'win') {
    initGame();
  }
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
  currentLevel       = 0;
  campaignLoop       = 0;
  selectedDifficulty = 0;
  justCompletedLevel = 0;
  revealProgress     = 0;
  // Fit the map image inside the canvas at startup
  mapZoom = Math.min(W / MAP_IMG_W, H / MAP_IMG_H) * 0.92;
  mapCamX = (W - MAP_IMG_W * mapZoom) / 2;
  mapCamY = (H - MAP_IMG_H * mapZoom) / 2;
  mapDragging = false;
  turrets   = [];
  enemies   = [];
  bullets   = [];
  particles = [];
  wave  = 0;
  lives = 3;
  score = 0;
  gold  = 0;
  phase = 'map';
  lastFrame     = 0;
  spawnedCount  = 0;
  lastSpawnTime = 0;
  hoverCell     = null;
  tierPopup           = null;
  popupHoverIdx       = -1;
  turretPopup         = null;
  turretPopupHoverIdx = -1;
  paused = false;
  setStartButton('', ['dimmed']);
  canvas.classList.remove('placing');
  hideOverlay();
  updateHUD();
}
