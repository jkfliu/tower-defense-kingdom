// ─── ui.js ────────────────────────────────────────────────────────────────────
// Input handling, popup logic, HUD updates, wave control, and game init.
// Reads globals from constants.js, game.js state vars, towers.js, theme.js.

// ─── Cached DOM refs ──────────────────────────────────────────────────────────
const $waveVal  = document.getElementById('wave-val');
const $livesVal = document.getElementById('lives-val');
const $scoreVal = document.getElementById('score-val');
const $goldVal  = document.getElementById('gold-val');
const $overlay  = document.getElementById('overlay');
const $msg      = document.getElementById('msg');
const $subMsg   = document.getElementById('sub-msg');
const $actionBtn = document.getElementById('action-btn');
const $startBtn  = document.getElementById('start-btn');
const $quitBtn   = document.getElementById('quit-btn');
const $muteBtn    = document.getElementById('mute-btn');
const $debugBtn   = document.getElementById('debug-btn');
const $newGameBtn = document.getElementById('new-game-btn');

// ─── Canvas interaction ───────────────────────────────────────────────────────
const canvasXY = e => { const r = canvas.getBoundingClientRect(); return { mx: e.clientX - r.left, my: e.clientY - r.top }; };

canvas.addEventListener('mousemove', e => {
  if (phase === 'map' && mapDragging) {
    mapCamX = mapDragCamX + (e.clientX - mapDragStartX);
    mapCamY = mapDragCamY + (e.clientY - mapDragStartY);
    clampMapCamera();
    return;
  }
  if (phase === 'map' && mapPopup) {
    const { mx, my } = canvasXY(e);
    handleMapPopupHover(mx, my);
    return;
  }
  if (phase === 'map' && _resetViewRect) {
    const { mx, my } = canvasXY(e);
    canvas.style.cursor = pointInRect(mx, my, _resetViewRect) ? 'pointer' : 'default';
    return;
  }
  if (phase !== 'placing' && phase !== 'between' && phase !== 'wave') {
    hoverCell = null;
    return;
  }
  const { mx, my } = canvasXY(e);
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
  const { mx, my } = canvasXY(e);
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

  const { mx, my } = canvasXY(e);

  if (confirmRestart === 'campaign') { handleConfirmRestartClick(mx, my); return; }
  if (phase === 'map')     { handleMapClick(mx, my); return; }
  if (phase === 'victory') {
    if (_victoryBtnRect && pointInRect(mx, my, _victoryBtnRect)) {
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
    return;
  }
  if (phase !== 'placing' && phase !== 'between' && phase !== 'wave') return;

  // Confirm restart dialog takes priority
  if (confirmRestart === 'level') {
    handleConfirmRestartClick(mx, my);
    return;
  }

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
  $startBtn.textContent = label;
  $startBtn.classList.remove('dimmed', 'paused');
  classes.forEach(c => $startBtn.classList.add(c));
}

function showOverlay(msg, btnLabel, subMsg = '') {
  $overlay.classList.add('active');
  $msg.textContent   = msg;
  $msg.style.display = msg ? 'block' : 'none';
  $subMsg.textContent   = subMsg;
  $subMsg.style.display = subMsg ? 'block' : 'none';
  $actionBtn.textContent   = btnLabel;
  $actionBtn.style.display = btnLabel ? 'inline-block' : 'none';
}

function hideOverlay() {
  $overlay.classList.remove('active');
  $msg.style.display       = 'none';
  $subMsg.style.display    = 'none';
  $actionBtn.style.display = 'none';
}

function updateHUD() {
  $waveVal.textContent  = phase === 'map' ? '—' : `${wave} / ${wavesInLevel()}`;
  $livesVal.textContent = phase === 'map' ? '—' : lives;
  $scoreVal.textContent = score;
  $goldVal.textContent  = phase === 'map' ? '—' : gold;
  const inGame = phase === 'placing' || phase === 'wave' || phase === 'between';
  $startBtn.style.display = inGame ? 'inline-block' : 'none';
  $quitBtn.style.display  = inGame ? 'inline-block' : 'none';
  $newGameBtn.textContent = inGame ? 'Restart Level' : 'New Campaign';
}

// ─── Button event listeners ───────────────────────────────────────────────────
$muteBtn.addEventListener('click', () => {
  muted = !muted;
  $muteBtn.textContent = muted ? 'SFX: OFF' : 'SFX: ON';
  $muteBtn.classList.toggle('muted', muted);
});

$debugBtn.addEventListener('click', () => {
  debugMode = !debugMode;
  $debugBtn.textContent = debugMode ? 'Debug: ON' : 'Debug: OFF';
  $debugBtn.classList.toggle('active', debugMode);
});

$startBtn.addEventListener('click', () => {
  if (phase === 'placing' || phase === 'between') {
    startWave();
  } else if (phase === 'wave') {
    paused = !paused;
    if (!paused) lastFrame = 0;
    setStartButton(paused ? 'Resume' : 'Pause', paused ? ['paused'] : []);
  }
});

$newGameBtn.addEventListener('click', () => {
  const inGame = phase === 'placing' || phase === 'wave' || phase === 'between';
  confirmRestart = inGame ? 'level' : 'campaign';
});

$quitBtn.addEventListener('click', () => {
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

$actionBtn.addEventListener('click', () => {
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

function handleConfirmRestartClick(mx, my) {
  if (_confirmYesRect && pointInRect(mx, my, _confirmYesRect)) {
    const type = confirmRestart;
    confirmRestart = '';
    if (type === 'level') startLevel(currentLevel);
    else initGame();
  } else if (_confirmNoRect && pointInRect(mx, my, _confirmNoRect)) {
    confirmRestart = '';
  }
  // clicks outside the card do nothing — dialog stays open
}

// ─── Wave & init ──────────────────────────────────────────────────────────────
function startWave() {
  wave++;
  spawnedCount  = 0;
  lastSpawnTime = 0;
  enemies       = [];
  bullets       = [];
  resetPopups();
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
  resetMapCamera();
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
  resetPopups();
  mapPopup        = null;
  _victoryBtnRect = null;
  wavePreviewDismissed = false;
  paused = false;
  setStartButton('', ['dimmed']);
  canvas.classList.remove('placing');
  hideOverlay();
  updateHUD();
}
