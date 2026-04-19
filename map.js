// ─── map.js ───────────────────────────────────────────────────────────────────
// Kingdom overview map — drawing, node hit-testing, level entry/exit.
// Reads globals: ctx, W, H, CAMPAIGN_LEVELS, currentLevel, campaignLoop, wave, phase.

const NODE_R = 16;  // clickable radius of each level node

const DIFF_LABELS = ['Normal', 'Hard', 'Extreme'];
const DIFF_COLORS = ['#2a9a20', '#d08000', '#c01818'];

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
  resetPopups();
  paused = false;
  wavePreviewDismissed = false;
  setStartButton('Start Wave 1');
  canvas.classList.add('placing');
  hideOverlay();
  updateHUD();
}

function completeLevel() {
  justCompletedLevel = currentLevel;
  currentLevel++;
  setStartButton('', ['dimmed']);
  canvas.classList.remove('placing');
  phase = 'victory';
  updateHUD();
}

// ─── Map camera helpers ───────────────────────────────────────────────────────

// Map image is 1125×1137; we place nodes using those pixel coords.
const MAP_IMG_W = 1125;
const MAP_IMG_H = 1137;

// Convert a point in map-image space to canvas screen space.
function worldToCanvas(wx, wy) {
  return {
    x: wx * mapZoom + mapCamX,
    y: wy * mapZoom + mapCamY,
  };
}

// Convert canvas screen coords back to map-image space.
function canvasToWorld(sx, sy) {
  return {
    x: (sx - mapCamX) / mapZoom,
    y: (sy - mapCamY) / mapZoom,
  };
}

// Clamp camera so the image doesn't drift fully off-screen.
function resetMapCamera() {
  mapZoom = Math.min(W / MAP_IMG_W, H / MAP_IMG_H) * 0.92;
  mapCamX = (W - MAP_IMG_W * mapZoom) / 2;
  mapCamY = (H - MAP_IMG_H * mapZoom) / 2;
}

function clampMapCamera() {
  const iw = MAP_IMG_W * mapZoom;
  const ih = MAP_IMG_H * mapZoom;
  const margin = 80;
  mapCamX = Math.min(margin, Math.max(W - iw - margin, mapCamX));
  mapCamY = Math.min(margin, Math.max(H - ih - margin, mapCamY));
}

// ─── Shared node drawing ──────────────────────────────────────────────────────

function drawMapNode(i, now, scaledNodeR, overrideAlpha = 1) {
  const lv   = CAMPAIGN_LEVELS[i];
  const done = i < currentLevel;
  const { x: sx, y: sy } = worldToCanvas(lv.mx, lv.my);

  ctx.globalAlpha = overrideAlpha;

  // Pulsing gold ring for next-to-play node
  if (i === currentLevel) {
    const pulse = 0.55 + 0.45 * Math.sin(now * 0.003);
    ctx.globalAlpha = pulse * overrideAlpha;
    ctx.strokeStyle = '#e8c030';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.arc(sx, sy, scaledNodeR + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = overrideAlpha;
  }

  // Node backing circle
  ctx.fillStyle   = done ? '#7ab060' : '#e8d070';
  ctx.strokeStyle = done ? '#3a6820' : '#c09010';
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  ctx.arc(sx, sy, scaledNodeR, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  drawNodeIcon(sx, sy, lv.icon, false, scaledNodeR);

  // Completed checkmark badge
  if (done) {
    ctx.globalAlpha = overrideAlpha;
    ctx.fillStyle   = '#2a8020';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(sx + scaledNodeR * 0.65, sy - scaledNodeR * 0.65, 9, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(sx + scaledNodeR * 0.65 - 4, sy - scaledNodeR * 0.65);
    ctx.lineTo(sx + scaledNodeR * 0.65 - 1, sy - scaledNodeR * 0.65 + 3);
    ctx.lineTo(sx + scaledNodeR * 0.65 + 5, sy - scaledNodeR * 0.65 - 4);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Label
  ctx.globalAlpha  = overrideAlpha;
  ctx.fillStyle    = '#fff';
  ctx.font         = `bold ${Math.round(11 * Math.max(1, mapZoom))}px 'Cinzel', serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor  = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur   = 4;
  ctx.fillText(lv.name, sx, sy - scaledNodeR - 8);
  ctx.shadowBlur   = 0;
  ctx.globalAlpha  = 1;
}

// ─── Reveal animation (sparkle trail to next node) ────────────────────────────

function drawRevealScreen() {
  const now = Date.now();
  const scaledNodeR = Math.max(10, NODE_R * mapZoom);

  // Draw map image
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(0, 0, W, H);
  if (MAP_IMG.complete && MAP_IMG.naturalWidth > 0) {
    ctx.save();
    ctx.translate(mapCamX, mapCamY);
    ctx.scale(mapZoom, mapZoom);
    ctx.drawImage(MAP_IMG, 0, 0, MAP_IMG_W, MAP_IMG_H);
    ctx.restore();
  }

  // Draw all previously visible nodes (everything up to and including justCompletedLevel)
  for (let i = 0; i <= justCompletedLevel; i++) {
    drawMapNode(i, now, scaledNodeR);
  }

  const hasNext = currentLevel < CAMPAIGN_LEVELS.length;
  if (hasNext) {
    const fromLv = CAMPAIGN_LEVELS[justCompletedLevel];
    const toLv   = CAMPAIGN_LEVELS[currentLevel];
    const from   = worldToCanvas(fromLv.mx, fromLv.my);
    const to     = worldToCanvas(toLv.mx, toLv.my);

    // Trail progress: first half draws sparkles along path, second half reveals node
    const trailP = Math.min(1, revealProgress * 2);
    const nodeP  = Math.max(0, (revealProgress - 0.5) * 2);

    // Sparkle trail
    const trailCount = 18;
    for (let j = 0; j < trailCount; j++) {
      const t = (j / (trailCount - 1)) * trailP;
      if (t > trailP) continue;
      const tx = from.x + (to.x - from.x) * t;
      const ty = from.y + (to.y - from.y) * t;
      const age = trailP - t;
      const alpha = Math.max(0, 1 - age * 1.8) * (0.6 + 0.4 * Math.sin(now * 0.008 + j));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = j % 3 === 0 ? '#ffe860' : j % 3 === 1 ? '#fff' : '#c0a0ff';
      const r = (2 + Math.random() * 2) * (1 - age * 0.5);
      ctx.beginPath();
      ctx.arc(tx + (Math.random() - 0.5) * 8, ty + (Math.random() - 0.5) * 8, Math.max(0.5, r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Burst of sparkles at the head of the trail
    if (trailP < 1) {
      const hx = from.x + (to.x - from.x) * trailP;
      const hy = from.y + (to.y - from.y) * trailP;
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * Math.PI * 2 + now * 0.004;
        const r2 = 6 + 3 * Math.sin(now * 0.01 + k);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffe860';
        ctx.beginPath();
        ctx.arc(hx + Math.cos(angle) * r2, hy + Math.sin(angle) * r2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Reveal next node with pop-in scale
    if (nodeP > 0) {
      const pop = nodeP < 0.6 ? nodeP / 0.6 : 1 + 0.15 * Math.sin((nodeP - 0.6) / 0.4 * Math.PI);
      ctx.save();
      ctx.translate(to.x, to.y);
      ctx.scale(pop, pop);
      ctx.translate(-to.x, -to.y);
      drawMapNode(currentLevel, now, scaledNodeR, nodeP);
      ctx.restore();
    }
  }

  // Auto-advance to map once animation completes
  if (revealProgress >= 1) {
    phase = 'map';
    updateHUD();
  }
}

// ─── Map drawing ──────────────────────────────────────────────────────────────

function drawKingdomMap() {
  const now = Date.now();

  // Dark background in case image doesn't fill canvas
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(0, 0, W, H);

  // ── Map image with pan/zoom ──────────────────────────────────────────────────
  if (MAP_IMG.complete && MAP_IMG.naturalWidth > 0) {
    ctx.save();
    ctx.translate(mapCamX, mapCamY);
    ctx.scale(mapZoom, mapZoom);
    ctx.drawImage(MAP_IMG, 0, 0, MAP_IMG_W, MAP_IMG_H);
    ctx.restore();
  }

  // ── Level nodes (drawn in screen space via worldToCanvas) ────────────────────
  const scaledNodeR = Math.max(10, NODE_R * mapZoom);

  for (let i = 0; i <= Math.min(currentLevel, CAMPAIGN_LEVELS.length - 1); i++) {
    drawMapNode(i, now, scaledNodeR);
  }

  // ── HUD overlay (always screen-space) ────────────────────────────────────────
  ctx.fillStyle    = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, 36);
  ctx.fillStyle    = '#e8d8a0';
  ctx.font         = "bold 18px 'Cinzel', serif";
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Kingdom of Sylvan', W / 2, 18);

  // Difficulty badge shown only when player has completed the campaign at least once
  if (campaignLoop > 0) {
    ctx.fillStyle   = DIFF_COLORS[selectedDifficulty];
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(8, 8, 110, 22, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = '#fff';
    ctx.font         = "bold 12px 'Cinzel', serif";
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Difficulty: ${DIFF_LABELS[selectedDifficulty]}`, 14, 19);
  }

  // Zoom hint bottom bar
  ctx.fillStyle    = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, H - 28, W, 28);
  ctx.font         = "12px 'Cinzel', serif";
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';

  const sep    = '  ·  ';
  const sepW   = ctx.measureText(sep).width;
  const hints  = ['Scroll to Zoom', 'Drag to Pan', 'Click a Level to Begin', 'Reset View'];
  const widths = hints.map(h => ctx.measureText(h).width);
  const totalW = widths.reduce((a, w) => a + w, 0) + sepW * (hints.length - 1);
  const pad    = 6;
  const cy     = H - 14;

  let x = (W - totalW) / 2;
  hints.forEach((label, i) => {
    const isReset = i === hints.length - 1;
    ctx.fillStyle = isReset ? '#f0c040' : '#e8d8a0';
    ctx.fillText(label, x, cy);
    if (isReset) {
      _resetViewRect = { x: x - pad, y: H - 24, w: widths[i] + pad * 2, h: 20 };
    }
    x += widths[i];
    if (i < hints.length - 1) {
      ctx.fillStyle = '#7a6840';
      ctx.fillText(sep, x, cy);
      x += sepW;
    }
  });

  drawMapPopup();
  if (confirmRestart) drawConfirmRestart();
}


function drawNodeIcon(x, y, icon, locked, r = NODE_R) {
  const sc = r / NODE_R;
  const alpha = locked ? 0.4 : 1;
  ctx.globalAlpha = alpha;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);

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
    for (const bx of [-12, -8, 4, 8]) {
      ctx.fillRect(bx, -8, 3, 5); ctx.strokeRect(bx, -8, 3, 5);
    }
  } else if (icon === 'volcano') {
    // Volcano cone
    ctx.fillStyle   = '#5a3020';
    ctx.strokeStyle = '#3a1810';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(-16, 10); ctx.lineTo(16, 10); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Lava glow at crater
    ctx.fillStyle = '#ff6010';
    ctx.beginPath(); ctx.ellipse(0, -13, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.ellipse(0, -13, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    // Lava drips down sides
    ctx.fillStyle = '#ff4000';
    ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(-8, 2); ctx.lineTo(-2, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(7, 4); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ─── Level-select popup ───────────────────────────────────────────────────────

let _beginBtnRect  = null;           // { x, y, w, h } in canvas coords
let _resetViewRect = null;           // hit area for "Reset View" hint text
let _diffDotCenters = [];            // [{ cx, cy }] one per difficulty option
let _popupDiffHover = -1;            // index under mouse, or -1

function drawMapPopup() {
  if (!mapPopup) return;
  const lv = CAMPAIGN_LEVELS[mapPopup.levelId];

  const PW = 380, PH = 240;
  const px = (W - PW) / 2, py = (H - PH) / 2;

  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);

  // Card
  ctx.fillStyle   = '#ede0b0';
  ctx.strokeStyle = '#7a5018';
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  ctx.roundRect(px, py, PW, PH, 10);
  ctx.fill(); ctx.stroke();

  // Title
  ctx.fillStyle    = '#3a2408';
  ctx.font         = "bold 18px 'Cinzel', serif";
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(lv.name, px + PW / 2, py + 18);

  // Divider
  ctx.strokeStyle = '#c0a060';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(px + 20, py + 44); ctx.lineTo(px + PW - 20, py + 44);
  ctx.stroke();

  // Description (word-wrap)
  ctx.fillStyle    = '#5a3c10';
  ctx.font         = "italic 13px 'Cinzel', serif";
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  const words = lv.description.split(' ');
  const maxW  = PW - 48;
  let line = '', lineY = py + 54;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, px + PW / 2, lineY);
      line  = word;
      lineY += 18;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, px + PW / 2, lineY);

  // Difficulty row — interactive if campaignLoop > 0, cosmetic otherwise
  const diffY      = py + 132;
  const unlocked = campaignLoop > 0;

  ctx.fillStyle    = '#7a5018';
  ctx.font         = "12px 'Cinzel', serif";
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Difficulty:', px + PW / 2, diffY);

  _diffDotCenters = [];
  const dotR    = 22;   // pill half-height
  const dotW    = 76;
  const dotGap  = 8;
  const totalW  = 3 * dotW + 2 * dotGap;
  const dotBaseX = px + (PW - totalW) / 2;

  for (let i = 0; i < 3; i++) {
    const bx = dotBaseX + i * (dotW + dotGap);
    const by = diffY + 10;
    _diffDotCenters.push({ cx: bx + dotW / 2, cy: by + dotR });

    const isSelected = i === selectedDifficulty;
    const isHovered  = unlocked && i === _popupDiffHover;
    const isLocked   = !unlocked && i > 0;

    ctx.globalAlpha = isLocked ? 0.35 : 1;
    ctx.fillStyle   = isSelected ? DIFF_COLORS[i] : isHovered ? '#d4c080' : '#c8b070';
    ctx.strokeStyle = isSelected ? '#000' : '#8a7040';
    ctx.lineWidth   = isSelected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, dotW, dotR * 2, dotR);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle    = isSelected ? '#fff' : isLocked ? '#7a6030' : '#3a2408';
    ctx.font         = `${isSelected ? 'bold ' : ''}12px 'Cinzel', serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(DIFF_LABELS[i], bx + dotW / 2, by + dotR);
    ctx.globalAlpha = 1;
  }

  if (!unlocked) {
    ctx.fillStyle    = '#9a7040';
    ctx.font         = "italic 10px 'Cinzel', serif";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Complete the campaign to unlock difficulty selection', px + PW / 2, diffY + 60);
  }

  // "Begin!" button
  const BW = 110, BH = 32;
  const bx = px + (PW - BW) / 2, by = py + PH - 48;
  _beginBtnRect = { x: bx, y: by, w: BW, h: BH };
  ctx.fillStyle   = '#1a5c10';
  ctx.strokeStyle = '#3a9020';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, BW, BH, 6);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle    = '#d4eeaa';
  ctx.font         = "bold 15px 'Cinzel', serif";
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Begin!', bx + BW / 2, by + BH / 2);
}

// ─── Victory screen ───────────────────────────────────────────────────────────

let _victoryBtnRect = null;

function drawVictoryScreen() {
  const now = Date.now();

  // Dark animated background
  ctx.fillStyle = '#0a0818';
  ctx.fillRect(0, 0, W, H);

  // Starfield shimmer
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 137 + 50) % W);
    const sy = ((i * 97  + 30) % H);
    const alpha = 0.3 + 0.5 * Math.abs(Math.sin(now * 0.001 + i));
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#e8d8ff';
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  ctx.restore();

  // Trophy / crown icon
  const cx_ = W / 2, cy_ = H / 2 - 60;
  ctx.save();
  ctx.translate(cx_, cy_);
  const pulse = 1 + 0.04 * Math.sin(now * 0.003);
  ctx.scale(pulse, pulse);
  ctx.fillStyle   = '#f0c030';
  ctx.strokeStyle = '#a07010';
  ctx.lineWidth   = 2;
  // Crown base
  ctx.beginPath();
  ctx.roundRect(-38, 10, 76, 22, 4);
  ctx.fill(); ctx.stroke();
  // Crown spikes
  ctx.beginPath();
  ctx.moveTo(-38, 10);
  ctx.lineTo(-38, -20);
  ctx.lineTo(-18, 0);
  ctx.lineTo(0,   -28);
  ctx.lineTo(18,  0);
  ctx.lineTo(38,  -20);
  ctx.lineTo(38,  10);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Gems
  for (const [gx, gy, col] of [[-20, 0, '#e04040'], [0, -8, '#40a0e0'], [20, 0, '#40c040']]) {
    ctx.beginPath();
    ctx.arc(gx, gy, 5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }
  ctx.restore();

  // Title
  ctx.fillStyle    = '#f0e080';
  ctx.font         = "bold 36px 'Cinzel', serif";
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(200,160,0,0.7)';
  ctx.shadowBlur   = 18;
  ctx.fillText('Level Complete!', W / 2, H / 2 + 10);
  ctx.shadowBlur   = 0;

  // Sub text
  ctx.fillStyle    = '#c0b0e0';
  ctx.font         = "15px 'Cinzel', serif";
  const lvName = CAMPAIGN_LEVELS[justCompletedLevel]?.name ?? 'the realm';
  ctx.fillText(`${lvName} has been defended.`, W / 2, H / 2 + 42);

  ctx.fillStyle = '#a090c0';
  ctx.font      = "italic 13px 'Cinzel', serif";
  ctx.fillText(`Completed on ${DIFF_LABELS[selectedDifficulty]} difficulty  ·  Score: ${score}`, W / 2, H / 2 + 64);

  // ">" continue button
  const BW = 52, BH = 52;
  const bx = W - BW - 24, by = H - BH - 24;
  _victoryBtnRect = { x: bx, y: by, w: BW, h: BH };
  ctx.fillStyle   = '#2a6a18';
  ctx.strokeStyle = '#60c030';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, BW, BH, 10);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle    = '#d4eeaa';
  ctx.font         = "bold 26px 'Cinzel', serif";
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('›', bx + BW / 2, by + BH / 2 + 1);
}

// ─── Map click handling ───────────────────────────────────────────────────────

function handleMapPopupHover(mx, my) {
  if (!mapPopup || !campaignLoop) { _popupDiffHover = -1; return; }
  const dotW = 76, dotR = 22;
  _popupDiffHover = -1;
  for (let i = 0; i < _diffDotCenters.length; i++) {
    const { cx, cy } = _diffDotCenters[i];
    if (Math.abs(mx - cx) <= dotW / 2 && Math.abs(my - cy) <= dotR) {
      _popupDiffHover = i;
      break;
    }
  }
}

function handleMapClick(mx, my) {
  // Reset View hint click
  if (_resetViewRect) {
    const r = _resetViewRect;
    if (pointInRect(mx, my, r)) {
      resetMapCamera();
      return;
    }
  }

  // If popup is open, handle its interactions first
  if (mapPopup) {
    // Difficulty dot click (only when unlocked)
    if (campaignLoop > 0) {
      const dotW = 76, dotR = 22;
      for (let i = 0; i < _diffDotCenters.length; i++) {
        const { cx, cy } = _diffDotCenters[i];
        if (Math.abs(mx - cx) <= dotW / 2 && Math.abs(my - cy) <= dotR) {
          selectedDifficulty = i;
          return;
        }
      }
    }

    if (_beginBtnRect) {
      if (pointInRect(mx, my, _beginBtnRect)) {
        const id = mapPopup.levelId;
        mapPopup = null;
        startLevel(id);
        return;
      }
    }
    // Click outside popup card closes it
    const PW = 380, PH = 240;
    const px = (W - PW) / 2, py = (H - PH) / 2;
    if (mx < px || mx > px + PW || my < py || my > py + PH) {
      mapPopup = null;
      _popupDiffHover = -1;
    }
    return;
  }

  // Hit-test all nodes — all always clickable
  const w    = canvasToWorld(mx, my);
  const hitR = NODE_R / mapZoom;
  for (let i = 0; i < CAMPAIGN_LEVELS.length; i++) {
    const lv = CAMPAIGN_LEVELS[i];
    const dx = w.x - lv.mx, dy = w.y - lv.my;
    if (dx * dx + dy * dy <= hitR * hitR) {
      mapPopup = { levelId: i };
      break;
    }
  }
}
