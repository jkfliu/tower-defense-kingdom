// ─── map.js ───────────────────────────────────────────────────────────────────
// Kingdom overview map — drawing, node hit-testing, level entry/exit.
// Reads globals: ctx, W, H, CAMPAIGN_LEVELS, currentLevel, campaignLoop, wave, phase.

const NODE_R = 26;  // clickable radius of each level node

// ─── Level entry / exit ───────────────────────────────────────────────────────

function startLevel(id) {
  path          = getLevelPath(id);
  pathSet       = buildPathSet(path, PATH_BLOCK_RADIUS);
  pathRenderSet = buildPathSet(path, PATH_RENDER_RADIUS);
  turrets   = [];
  enemies   = [];
  bullets   = [];
  particles = [];
  wave      = 0;
  lives     = 3;
  score     = 0;
  gold      = CAMPAIGN_LEVELS[id].startGold;
  phase     = 'placing';
  lastFrame     = 0;
  spawnedCount  = 0;
  lastSpawnTime = 0;
  hoverCell     = null;
  tierPopup           = null;
  popupHoverIdx       = -1;
  turretPopup         = null;
  turretPopupHoverIdx = -1;
  paused = false;
  wavePreviewDismissed = false;
  setStartButton('Start Wave 1');
  canvas.classList.add('placing');
  hideOverlay();
  updateHUD();
}

function completeLevel() {
  currentLevel++;
  if (currentLevel >= CAMPAIGN_LEVELS.length) {
    currentLevel = 0;
    campaignLoop++;
  }
  phase = 'map';
  setStartButton('', ['dimmed']);
  canvas.classList.remove('placing');
  updateHUD();
}

// ─── Map drawing ──────────────────────────────────────────────────────────────

let _mapHatchCanvas = null;
let _mapVigGradient = null;

function getMapHatchCanvas() {
  if (_mapHatchCanvas) return _mapHatchCanvas;
  _mapHatchCanvas = document.createElement('canvas');
  _mapHatchCanvas.width = W; _mapHatchCanvas.height = H;
  const hctx = _mapHatchCanvas.getContext('2d');
  hctx.globalAlpha = 0.06;
  hctx.strokeStyle = '#7a5a20';
  hctx.lineWidth   = 0.5;
  for (let y = 0; y < H; y += 6) {
    hctx.beginPath(); hctx.moveTo(0, y); hctx.lineTo(W, y + 4); hctx.stroke();
  }
  return _mapHatchCanvas;
}

function getMapVigGradient() {
  if (_mapVigGradient) return _mapVigGradient;
  _mapVigGradient = ctx.createRadialGradient(W/2, H/2, H*0.28, W/2, H/2, H*0.78);
  _mapVigGradient.addColorStop(0, 'rgba(0,0,0,0)');
  _mapVigGradient.addColorStop(1, 'rgba(60,30,0,0.38)');
  return _mapVigGradient;
}

function drawKingdomMap() {
  const now = Date.now();

  // Parchment background
  ctx.fillStyle = '#d9c68a';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(getMapHatchCanvas(), 0, 0);

  // Vignette edges
  ctx.fillStyle = getMapVigGradient();
  ctx.fillRect(0, 0, W, H);

  // ── Terrain decorations ──────────────────────────────────────────────────────

  // River line (wavy blue)
  ctx.strokeStyle = '#5898c8';
  ctx.lineWidth   = 5;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(180, 0);
  ctx.bezierCurveTo(200, 80, 160, 140, 190, 200);
  ctx.bezierCurveTo(220, 260, 200, 340, 230, H);
  ctx.stroke();
  ctx.lineWidth   = 2.5;
  ctx.strokeStyle = '#a8d8f0';
  ctx.beginPath();
  ctx.moveTo(186, 0);
  ctx.bezierCurveTo(206, 80, 166, 140, 196, 200);
  ctx.bezierCurveTo(226, 260, 206, 340, 236, H);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Tree clusters (left side — forest)
  drawTrees(50, 120, 5, '#2d6e2d');
  drawTrees(30, 300, 4, '#1e5a1e');
  drawTrees(120, 360, 4, '#2d6e2d');

  // Mountain ridges (centre-right)
  drawMountains(360, 300, 3, '#8a7860');
  drawMountains(440, 340, 2, '#7a6850');
  drawMountains(490, 140, 2, '#9a8870');

  // Ruins scatter (right of centre)
  drawRuins(530, 320);
  drawRuins(580, 350);

  // ── Connecting road ──────────────────────────────────────────────────────────
  ctx.strokeStyle = '#9a7840';
  ctx.lineWidth   = 7;
  ctx.setLineDash([12, 8]);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(CAMPAIGN_LEVELS[0].x, CAMPAIGN_LEVELS[0].y);
  ctx.bezierCurveTo(150, 230, 180, 160, CAMPAIGN_LEVELS[1].x, CAMPAIGN_LEVELS[1].y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CAMPAIGN_LEVELS[1].x, CAMPAIGN_LEVELS[1].y);
  ctx.bezierCurveTo(280, 180, 330, 230, CAMPAIGN_LEVELS[2].x, CAMPAIGN_LEVELS[2].y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CAMPAIGN_LEVELS[2].x, CAMPAIGN_LEVELS[2].y);
  ctx.bezierCurveTo(460, 220, 500, 270, CAMPAIGN_LEVELS[3].x, CAMPAIGN_LEVELS[3].y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CAMPAIGN_LEVELS[3].x, CAMPAIGN_LEVELS[3].y);
  ctx.bezierCurveTo(620, 265, 660, 195, CAMPAIGN_LEVELS[4].x, CAMPAIGN_LEVELS[4].y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // ── Level nodes ──────────────────────────────────────────────────────────────
  for (let i = 0; i < CAMPAIGN_LEVELS.length; i++) {
    const lv      = CAMPAIGN_LEVELS[i];
    const locked  = i > currentLevel;
    const current = i === currentLevel;
    const done    = i < currentLevel;

    // Pulsing gold ring for current node
    if (current) {
      const pulse = 0.55 + 0.45 * Math.sin(now * 0.003);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#e8c030';
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.arc(lv.x, lv.y, NODE_R + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Node backing circle
    ctx.fillStyle   = locked ? '#b0a080' : done ? '#7ab060' : '#e8d070';
    ctx.strokeStyle = locked ? '#806040' : done ? '#3a6820' : '#c09010';
    ctx.lineWidth   = 2.5;
    ctx.globalAlpha = locked ? 0.5 : 1;
    ctx.beginPath();
    ctx.arc(lv.x, lv.y, NODE_R, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;

    // Icon inside node
    drawNodeIcon(lv.x, lv.y, lv.icon, locked);

    // Completed checkmark badge
    if (done) {
      ctx.fillStyle   = '#2a8020';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(lv.x + NODE_R * 0.65, lv.y - NODE_R * 0.65, 9, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(lv.x + NODE_R * 0.65 - 4, lv.y - NODE_R * 0.65);
      ctx.lineTo(lv.x + NODE_R * 0.65 - 1, lv.y - NODE_R * 0.65 + 3);
      ctx.lineTo(lv.x + NODE_R * 0.65 + 5, lv.y - NODE_R * 0.65 - 4);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // Locked padlock indicator
    if (locked) {
      ctx.fillStyle   = '#604010';
      ctx.font        = '14px sans-serif';
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', lv.x, lv.y);
    }

    // Level name label
    ctx.fillStyle    = locked ? '#806040' : '#3a2408';
    ctx.globalAlpha  = locked ? 0.55 : 1;
    ctx.font         = `bold 12px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(lv.name, lv.x, lv.y + NODE_R + 5);
    ctx.globalAlpha  = 1;

    // Starting gold hint for current node
    if (current) {
      ctx.fillStyle    = '#7a5800';
      ctx.font         = '11px serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${lv.startGold} Gold`, lv.x, lv.y + NODE_R + 20);
    }
  }

  // ── Title & loop badge ───────────────────────────────────────────────────────
  ctx.fillStyle    = '#3a2408';
  ctx.font         = 'bold 22px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Kingdom of Sylvan', W / 2, 14);

  if (campaignLoop > 0) {
    ctx.fillStyle   = '#fff';
    ctx.strokeStyle = '#8a3000';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(8, 8, 96, 22, 4);
    ctx.fillStyle = '#c04000';
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 12px sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Difficulty ${campaignLoop + 1}`, 14, 19);
  }

  // ── Prompt ───────────────────────────────────────────────────────────────────
  ctx.fillStyle    = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, H - 28, W, 28);
  ctx.fillStyle    = '#e8d8a0';
  ctx.font         = '13px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Click on a Level to begin', W / 2, H - 14);
}

// ─── Terrain helpers ──────────────────────────────────────────────────────────

function drawTrees(px, py, count, color) {
  for (let i = 0; i < count; i++) {
    const tx = px + (i % 3) * 18 - 18;
    const ty = py + Math.floor(i / 3) * 16;
    ctx.fillStyle   = color;
    ctx.strokeStyle = '#1a3a10';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(tx, ty - 14);
    ctx.lineTo(tx - 10, ty + 6);
    ctx.lineTo(tx + 10, ty + 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx, ty - 8);
    ctx.lineTo(tx - 8, ty + 8);
    ctx.lineTo(tx + 8, ty + 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle   = '#6a4020';
    ctx.fillRect(tx - 2, ty + 7, 4, 6);
  }
}

function drawMountains(px, py, count, color) {
  for (let i = 0; i < count; i++) {
    const mx = px + i * 28;
    ctx.fillStyle   = color;
    ctx.strokeStyle = '#5a4830';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(mx, py - 30);
    ctx.lineTo(mx - 22, py + 8);
    ctx.lineTo(mx + 22, py + 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(mx, py - 30);
    ctx.lineTo(mx - 8, py - 15);
    ctx.lineTo(mx + 8, py - 15);
    ctx.closePath(); ctx.fill();
  }
}

function drawRuins(px, py) {
  ctx.fillStyle   = '#a09070';
  ctx.strokeStyle = '#706050';
  ctx.lineWidth   = 1;
  ctx.fillRect(px - 14, py - 10, 10, 14);
  ctx.fillRect(px + 4,  py - 6,  10, 10);
  ctx.fillRect(px - 6,  py - 14, 8,  8);
  ctx.strokeRect(px - 14, py - 10, 10, 14);
  ctx.strokeRect(px + 4,  py - 6,  10, 10);
}

function drawNodeIcon(x, y, icon, locked) {
  const alpha = locked ? 0.4 : 1;
  ctx.globalAlpha = alpha;
  ctx.save();
  ctx.translate(x, y);

  if (icon === 'forest') {
    ctx.fillStyle = '#2d6e2d';
    for (const [dx, dy] of [[-8, 4], [0, -6], [8, 4]]) {
      ctx.beginPath();
      ctx.moveTo(dx, dy - 10);
      ctx.lineTo(dx - 7, dy + 2);
      ctx.lineTo(dx + 7, dy + 2);
      ctx.closePath(); ctx.fill();
    }
  } else if (icon === 'river') {
    ctx.strokeStyle = '#4488cc';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    for (const dy of [-5, 2, 9]) {
      ctx.beginPath();
      ctx.moveTo(-12, dy); ctx.bezierCurveTo(-6, dy - 4, 6, dy + 4, 12, dy);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  } else if (icon === 'mountain') {
    ctx.fillStyle = '#8a7860';
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-14, 10); ctx.lineTo(14, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-5, -4); ctx.lineTo(5, -4); ctx.closePath(); ctx.fill();
  } else if (icon === 'village') {
    ctx.fillStyle   = '#a06030';
    ctx.strokeStyle = '#603010';
    ctx.lineWidth   = 1;
    ctx.fillRect(-10, -2, 10, 12); ctx.strokeRect(-10, -2, 10, 12);
    ctx.fillRect(2,    2, 10, 8);  ctx.strokeRect(2,    2, 10, 8);
    ctx.fillStyle = '#c03010';
    ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-5, -10); ctx.lineTo(2, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,    2); ctx.lineTo(7,   -5); ctx.lineTo(14,  2); ctx.closePath(); ctx.fill();
  } else if (icon === 'castle') {
    ctx.fillStyle   = '#909090';
    ctx.strokeStyle = '#505050';
    ctx.lineWidth   = 1;
    ctx.fillRect(-12, -4, 8, 14);  ctx.strokeRect(-12, -4, 8, 14);
    ctx.fillRect(4,   -4, 8, 14);  ctx.strokeRect(4,   -4, 8, 14);
    ctx.fillRect(-6,   2, 12, 8);  ctx.strokeRect(-6,   2, 12, 8);
    // Battlements
    for (const bx of [-12, -8, 4, 8]) {
      ctx.fillRect(bx, -8, 3, 5); ctx.strokeRect(bx, -8, 3, 5);
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ─── Map click handling ───────────────────────────────────────────────────────

function handleMapClick(mx, my) {
  const lv = CAMPAIGN_LEVELS[currentLevel];
  const dx = mx - lv.x, dy = my - lv.y;
  if (dx * dx + dy * dy <= NODE_R * NODE_R) {
    startLevel(currentLevel);
  }
}
