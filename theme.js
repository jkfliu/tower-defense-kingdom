// ─── theme.js ─────────────────────────────────────────────────────────────────
// All canvas drawing: colours, backgrounds, path, towers, enemies, bullets, UI.
// Reads globals from constants.js: CELL, W, H, COLS, ROWS, ARROW_TIERS, TIER_ORDER
// Reads globals from game.js: ctx, path, pathSet, turrets, enemies, bullets, particles,
//   gold, phase, wave, hoverCell,
//   tierPopup, popupHoverIdx, turretPopup, turretPopupHoverIdx,
//   isValidPlacement, cx, cy, updateHUD

// ─── Enemy colours ────────────────────────────────────────────────────────────
const ENEMY_COLORS = [
  null,
  { body: '#4aaa28', dark: '#1e5010', accent: '#a0e060' },  // wave 1 — goblin green
  { body: '#6080a0', dark: '#304060', accent: '#90b8d8' },  // wave 2 — orc blue-grey
  { body: '#7a5080', dark: '#3a2040', accent: '#c090d0' },  // wave 3 — troll purple
  { body: '#b06020', dark: '#603010', accent: '#f0a050' },  // wave 4 — dark elf copper
  { body: '#c02020', dark: '#600010', accent: '#ff6040' },  // wave 5 — demon red
];

// ─── Tower draw constants ─────────────────────────────────────────────────────
// TIER_ORDER is defined in constants.js
const TIER_SCALE = { basic: 1.2, advanced: 1.32, ultimate: 1.44 };

const TOWER_FACE  = { basic: '#c8a87a', advanced: '#a09080', ultimate: '#787068' };
const TOWER_SIDE  = { basic: '#9a7850', advanced: '#706858', ultimate: '#504840' };
const TOWER_DARK  = { basic: '#6a5030', advanced: '#504040', ultimate: '#302828' };
const TOWER_MORTAR = { basic: '#8a6840', advanced: '#585050', ultimate: '#383030' };

// ─── Popup constants ──────────────────────────────────────────────────────────
const POPUP_W        = 280;   // wide enough for two cards side-by-side
const POPUP_ROW_H    = 34;
const POPUP_PAD      = 10;
const POPUP_TITLE_H  = 24;
const CARD_W         = 122;   // each placement card width
const CARD_H         = 72;
const CARD_GAP       = 8;

// ─── Enemy drawing ────────────────────────────────────────────────────────────
// ─── Enemy drawing ────────────────────────────────────────────────────────────

function drawEnemyHpBar(e) {
  const r     = CELL * 0.27;
  const ratio = e.hp / e.maxHp;
  const bw = r * 2.2, bh = 3, bx = e.x - bw / 2, by = e.y - r * 1.9 - 4;
  ctx.fillStyle = '#333';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = ratio > 0.5 ? '#30cc30' : ratio > 0.25 ? '#cccc00' : '#cc2020';
  ctx.fillRect(bx, by, bw * ratio, bh);
}

function drawSimpleEyes(x, y, r, c) {
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.28, y, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.28, y, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.accent;
  ctx.beginPath(); ctx.arc(x - r * 0.28, y, r * 0.10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.28, y, r * 0.10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * 0.26, y, r * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.26, y, r * 0.05, 0, Math.PI * 2); ctx.fill();
}

// Shared walking legs — call before drawing body so legs appear behind
// hipY: y-coordinate of hip joint; legLen: upper+lower leg length; sw: leg thickness
// skinColor, darkColor: fill/stroke colours matching the enemy
function drawLegs(e, hipX, hipY, legLen, sw, darkColor) {
  const phase = (e.dist / (CELL * 0.55)) * Math.PI;

  ctx.strokeStyle = darkColor;
  ctx.lineCap = 'round';

  // side=-1 (left) and side=1 (right), offset by PI so they alternate
  for (let side = -1; side <= 1; side += 2) {
    const legPhase = phase + (side === 1 ? Math.PI : 0);
    const a  = Math.sin(legPhase) * 0.42;
    const hipOffX = hipX + side * legLen * 0.28;   // hip spaced left/right
    const kx = hipOffX + Math.sin(a) * legLen;
    const ky = hipY    + Math.cos(Math.abs(a)) * legLen;
    const fx = kx  + Math.sin(a * 0.5) * legLen * 0.7;
    const fy = ky  + legLen * 0.65;

    // thigh
    ctx.lineWidth = sw;
    ctx.beginPath();
    ctx.moveTo(hipOffX, hipY);
    ctx.lineTo(kx, ky);
    ctx.stroke();

    // shin
    ctx.lineWidth = sw * 0.7;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();

    // foot
    ctx.lineWidth = sw * 0.6;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.sign(a) * legLen * 0.35, fy + legLen * 0.08);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// Wave 1 — Goblin: hunched, pointy ears, stubby arms, toothy grin
function drawGoblin(e) {
  const x = e.x, y = e.y, r = CELL * 0.27;
  const c = ENEMY_COLORS[1];

  drawLegs(e, x, y + r * 0.55, r * 0.62, r * 0.22, c.dark);

  // Ground shadow
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y + r * 1.1, r * 0.9, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Body — hunched oval
  ctx.fillStyle = c.body;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 0.75, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Head — slightly offset up and forward
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.1, y - r * 0.65, r * 0.55, r * 0.5, 0.2, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Pointy ears
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.38, y - r * 0.9);
  ctx.lineTo(x - r * 0.62, y - r * 1.45);
  ctx.lineTo(x - r * 0.15, y - r * 0.85);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.55, y - r * 0.9);
  ctx.lineTo(x + r * 0.82, y - r * 1.4);
  ctx.lineTo(x + r * 0.32, y - r * 0.82);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Stubby arms
  ctx.beginPath(); ctx.roundRect(x - r * 1.2, y - r * 0.1, r * 0.52, r * 0.38, r * 0.1); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x + r * 0.68, y - r * 0.05, r * 0.52, r * 0.38, r * 0.1); ctx.fill(); ctx.stroke();

  // Crude club in right hand
  ctx.strokeStyle = '#5a3010';
  ctx.lineWidth = r * 0.18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r * 1.05, y + r * 0.12);
  ctx.lineTo(x + r * 1.3, y - r * 0.55);
  ctx.stroke();
  ctx.fillStyle = '#4a2808';
  ctx.beginPath(); ctx.ellipse(x + r * 1.32, y - r * 0.65, r * 0.22, r * 0.18, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'butt';

  // Eyes
  drawSimpleEyes(x + r * 0.1, y - r * 0.68, r, c);

  // Toothy grin
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x + r * 0.1, y - r * 0.45, r * 0.3, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  for (const tx of [-0.18, 0, 0.18]) {
    ctx.beginPath();
    ctx.moveTo(x + r * (0.1 + tx), y - r * 0.3);
    ctx.lineTo(x + r * (0.1 + tx - 0.07), y - r * 0.18);
    ctx.lineTo(x + r * (0.1 + tx + 0.07), y - r * 0.18);
    ctx.closePath(); ctx.fill();
  }
}

// Wave 2 — Orc: wide stocky body, tusks, heavy brow
function drawOrc(e) {
  const x = e.x, y = e.y, r = CELL * 0.27;
  const c = ENEMY_COLORS[2];

  drawLegs(e, x, y + r * 0.75, r * 0.55, r * 0.3, c.dark);

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y + r * 1.1, r * 1.1, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Wide body
  ctx.fillStyle = c.body;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(x - r * 1.0, y - r * 0.3, r * 2.0, r * 1.2, r * 0.2);
  ctx.fill(); ctx.stroke();

  // Head — wide and flat
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.7, r * 0.72, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Heavy brow ridge
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.roundRect(x - r * 0.62, y - r * 1.05, r * 1.24, r * 0.22, r * 0.08);
  ctx.fill();

  // Thick arms
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.roundRect(x - r * 1.55, y - r * 0.2, r * 0.6, r * 0.7, r * 0.12); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x + r * 0.95, y - r * 0.2, r * 0.6, r * 0.7, r * 0.12); ctx.fill(); ctx.stroke();

  // Eyes — deep-set under brow
  drawSimpleEyes(x, y - r * 0.72, r, c);

  // Tusks
  ctx.fillStyle = '#e8d890';
  ctx.strokeStyle = '#a09040';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.28, y - r * 0.32);
  ctx.lineTo(x - r * 0.38, y - r * 0.02);
  ctx.lineTo(x - r * 0.18, y - r * 0.02);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.28, y - r * 0.32);
  ctx.lineTo(x + r * 0.38, y - r * 0.02);
  ctx.lineTo(x + r * 0.18, y - r * 0.02);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Scowl mouth
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.28, r * 0.32, Math.PI + 0.3, -0.3);
  ctx.stroke();
}

// Wave 3 — Troll: tall stooped body, long dangling arms, warty, angry
function drawTroll(e) {
  const x = e.x, y = e.y, r = CELL * 0.27;
  const c = ENEMY_COLORS[3];

  drawLegs(e, x, y + r * 0.9, r * 0.72, r * 0.28, c.dark);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y + r * 1.3, r * 0.85, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Tall stooped body
  ctx.fillStyle = c.body;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y + r * 1.1);
  ctx.lineTo(x - r * 0.85, y - r * 0.1);
  ctx.lineTo(x - r * 0.55, y - r * 0.55);
  ctx.lineTo(x + r * 0.55, y - r * 0.55);
  ctx.lineTo(x + r * 0.85, y - r * 0.1);
  ctx.lineTo(x + r * 0.7, y + r * 1.1);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Long dangling arms (reach below body)
  ctx.beginPath(); ctx.roundRect(x - r * 1.3, y - r * 0.3, r * 0.5, r * 1.5, r * 0.12); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x + r * 0.8, y - r * 0.25, r * 0.5, r * 1.5, r * 0.12); ctx.fill(); ctx.stroke();

  // Knuckles on ground
  ctx.fillStyle = c.dark;
  ctx.beginPath(); ctx.ellipse(x - r * 1.05, y + r * 1.15, r * 0.22, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 1.05, y + r * 1.15, r * 0.22, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();

  // Head
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.9, r * 0.65, r * 0.58, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Warts
  ctx.fillStyle = c.dark;
  for (const [wx, wy] of [[-0.4, 0.2], [0.3, 0.6], [-0.1, 0.9], [0.55, -0.05]]) {
    ctx.beginPath(); ctx.arc(x + r * wx, y + r * wy, r * 0.07, 0, Math.PI * 2); ctx.fill();
  }

  // Eyes — angry slant
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.92, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.28, y - r * 0.92, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.accent;
  ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.92, r * 0.10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.28, y - r * 0.92, r * 0.10, 0, Math.PI * 2); ctx.fill();
  // Angry brow lines
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - r * 0.48, y - r * 1.12); ctx.lineTo(x - r * 0.1, y - r * 1.04); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + r * 0.48, y - r * 1.12); ctx.lineTo(x + r * 0.1, y - r * 1.04); ctx.stroke();

  // Wide frowning mouth
  ctx.beginPath();
  ctx.arc(x, y - r * 0.68, r * 0.3, Math.PI + 0.4, -0.4);
  ctx.stroke();
}

// Wave 4 — Dark Elf: slim, hooded cloak, glowing eyes, dagger
function drawDarkElf(e) {
  const x = e.x, y = e.y, r = CELL * 0.27;
  const c = ENEMY_COLORS[4];

  drawLegs(e, x, y + r * 0.75, r * 0.58, r * 0.18, '#1a0e04');

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y + r * 1.1, r * 0.7, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Cloak — dark triangular shape
  ctx.fillStyle = '#2a1808';
  ctx.strokeStyle = '#1a0e04';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.4);
  ctx.lineTo(x - r * 0.95, y + r * 1.05);
  ctx.lineTo(x + r * 0.95, y + r * 1.05);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Cloak highlight edge
  ctx.strokeStyle = '#5a3020';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.02, y - r * 1.35);
  ctx.lineTo(x - r * 0.88, y + r * 1.0);
  ctx.stroke();

  // Body under cloak
  ctx.fillStyle = c.body;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(x - r * 0.38, y - r * 0.4, r * 0.76, r * 1.1, r * 0.1);
  ctx.fill(); ctx.stroke();

  // Hood peak
  ctx.fillStyle = '#2a1808';
  ctx.strokeStyle = '#1a0e04';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.55);
  ctx.lineTo(x - r * 0.42, y - r * 0.95);
  ctx.lineTo(x + r * 0.42, y - r * 0.95);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Face in shadow
  ctx.fillStyle = '#1a0a04';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.72, r * 0.35, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glowing eyes
  ctx.fillStyle = c.accent;
  ctx.shadowColor = c.accent;
  ctx.shadowBlur  = 6;
  ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.76, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.18, y - r * 0.76, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Dagger in right hand
  ctx.strokeStyle = '#c0c8d0';
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.72, y + r * 0.3);
  ctx.lineTo(x + r * 1.1, y - r * 0.4);
  ctx.stroke();
  ctx.strokeStyle = '#8a6030';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.62, y + r * 0.45);
  ctx.lineTo(x + r * 0.82, y + r * 0.15);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

// Wave 5 — Demon: horns, bat wings, forked tail, flame eyes
function drawDemon(e) {
  const x = e.x, y = e.y, r = CELL * 0.27;
  const c = ENEMY_COLORS[5];

  drawLegs(e, x, y + r * 0.7, r * 0.65, r * 0.26, c.dark);

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#400000';
  ctx.beginPath(); ctx.ellipse(x, y + r * 1.15, r * 1.1, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Bat wings (behind body)
  ctx.fillStyle = '#500010';
  ctx.strokeStyle = '#300008';
  ctx.lineWidth = 1.0;
  // Left wing
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y - r * 0.2);
  ctx.bezierCurveTo(x - r * 1.8, y - r * 1.2, x - r * 2.0, y + r * 0.4, x - r * 1.1, y + r * 0.8);
  ctx.lineTo(x - r * 0.6, y + r * 0.4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(x + r * 0.6, y - r * 0.2);
  ctx.bezierCurveTo(x + r * 1.8, y - r * 1.2, x + r * 2.0, y + r * 0.4, x + r * 1.1, y + r * 0.8);
  ctx.lineTo(x + r * 0.6, y + r * 0.4);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Body
  ctx.fillStyle = c.body;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(x - r * 0.72, y - r * 0.4, r * 1.44, r * 1.2, r * 0.18);
  ctx.fill(); ctx.stroke();

  // Forked tail — thick tapered shaft in bright orange, barbed fork tips
  const tx0 = x + r * 0.1,  ty0 = y + r * 0.75;   // base (behind body)
  const tcx = x + r * 0.44, tcy = y + r * 1.31;    // curve control
  const tx1 = x + r * 0.22, ty1 = y + r * 1.50;    // fork point

  // Thick base gradient shaft
  const tailGrad = ctx.createLinearGradient(tx0, ty0, tx1, ty1);
  tailGrad.addColorStop(0, '#ff8800');
  tailGrad.addColorStop(1, '#cc3300');
  ctx.strokeStyle = tailGrad;
  ctx.lineWidth   = r * 0.32;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(tx0, ty0);
  ctx.quadraticCurveTo(tcx, tcy, tx1, ty1);
  ctx.stroke();

  // Thinner outline for definition
  ctx.strokeStyle = '#801000';
  ctx.lineWidth   = r * 0.32 + 1.5;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(tx0, ty0);
  ctx.quadraticCurveTo(tcx, tcy, tx1, ty1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Barbed fork — solid filled triangles
  ctx.fillStyle   = '#ff6600';
  ctx.strokeStyle = '#801000';
  ctx.lineWidth   = 0.8;
  ctx.lineCap     = 'butt';
  // left barb
  ctx.beginPath();
  ctx.moveTo(tx1, ty1);
  ctx.lineTo(tx1 - r * 0.27, ty1 + r * 0.32);
  ctx.lineTo(tx1 - r * 0.08, ty1 + r * 0.07);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // right barb
  ctx.beginPath();
  ctx.moveTo(tx1, ty1);
  ctx.lineTo(tx1 + r * 0.20, ty1 + r * 0.34);
  ctx.lineTo(tx1 + r * 0.06, ty1 + r * 0.06);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Head
  ctx.fillStyle = c.body;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.75, r * 0.6, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Horns
  ctx.fillStyle = '#1a0000';
  ctx.strokeStyle = '#0a0000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.38, y - r * 1.15);
  ctx.lineTo(x - r * 0.55, y - r * 1.7);
  ctx.lineTo(x - r * 0.18, y - r * 1.18);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.38, y - r * 1.15);
  ctx.lineTo(x + r * 0.55, y - r * 1.7);
  ctx.lineTo(x + r * 0.18, y - r * 1.18);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Flame eyes
  ctx.fillStyle = '#ffcc00';
  ctx.shadowColor = '#ff6000';
  ctx.shadowBlur  = 8;
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.8, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.26, y - r * 0.8, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.8, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.26, y - r * 0.8, r * 0.06, 0, Math.PI * 2); ctx.fill();

  // Fanged mouth
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.55, r * 0.3, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  for (const [fx, fy] of [[-0.22, -0.42], [0, -0.38], [0.22, -0.42]]) {
    ctx.beginPath();
    ctx.moveTo(x + r * fx, y + r * fy);
    ctx.lineTo(x + r * (fx - 0.07), y + r * (fy + 0.15));
    ctx.lineTo(x + r * (fx + 0.07), y + r * (fy + 0.15));
    ctx.closePath(); ctx.fill();
  }
}

function drawEnemy(e) {
  const facing = e.facing || 0;

  // Perspective squash: enemies moving vertically appear shallower
  const absSin = Math.abs(Math.sin(facing));
  const scaleY = 1 - absSin * 0.22;   // 1.0 when horizontal, ~0.78 when vertical

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(facing - Math.PI / 2);   // -90° so "up" in draw space = facing direction
  ctx.scale(1, scaleY);

  const ep = { ...e, x: 0, y: 0 };
  switch (e.type) {
    case 1: drawGoblin(ep);   break;
    case 2: drawOrc(ep);      break;
    case 3: drawTroll(ep);    break;
    case 4: drawDarkElf(ep);  break;
    case 5: drawDemon(ep);    break;
    default: drawGoblin(ep);  break;
  }
  ctx.restore();
  drawEnemyHpBar(e);
}

// ─── Path drawing ─────────────────────────────────────────────────────────────
// Seeded per-cell RNG for stable decoration (no per-frame flicker).
function cellRng(a, b) {
  let s = (a * 1619 + b * 31337 + a * b * 127) | 0;
  s = (s ^ (s >>> 16)) * 0x45d9f3b | 0;
  s = (s ^ (s >>> 16)) * 0x45d9f3b | 0;
  return ((s ^ (s >>> 16)) >>> 0) / 0xffffffff;
}

function drawGrassBlade(rx, ry, ndx, ndy, lean, h, w, color) {
  const px = -ndy, py = ndx;
  const blx = rx - px * w,  bly = ry - py * w;
  const brx = rx + px * w,  bry = ry + py * w;
  const tipX = rx + ndx * h + px * lean;
  const tipY = ry + ndy * h + py * lean;
  const cpX  = rx + ndx * h * 0.5 + px * lean * 0.85;
  const cpY  = ry + ndy * h * 0.5 + py * lean * 0.85;

  // Drop shadow
  ctx.fillStyle = 'rgba(15, 35, 5, 0.28)';
  ctx.beginPath();
  ctx.moveTo(blx + ndx * 1.2, bly + ndy * 1.2);
  ctx.quadraticCurveTo(cpX + ndx * 2, cpY + ndy * 2, tipX + ndx * 1.5, tipY + ndy * 1.5);
  ctx.lineTo(brx + ndx * 1.2, bry + ndy * 1.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(blx, bly);
  ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
  ctx.lineTo(brx, bry);
  ctx.closePath();
  ctx.fill();
}

function drawSmoothPath() {
  const R = PATH_RENDER_RADIUS;
  const D = R * 2;

  // ── Dark edge outline ──
  ctx.strokeStyle = '#6a3e10';
  ctx.lineWidth   = D + 4;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();

  // ── Main dirt fill ──
  ctx.strokeStyle = '#c8a05a';
  ctx.lineWidth   = D;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();

  // ── Centre highlight ──
  ctx.strokeStyle = 'rgba(255,220,140,0.18)';
  ctx.lineWidth   = D * 0.45;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();

  // ── Dirt specks scattered along path ──
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const steps  = Math.ceil(segLen / (CELL * 0.6));
    for (let s = 0; s < steps; s++) {
      const t   = (s + 0.5) / steps;
      const mx  = a.x + (b.x - a.x) * t;
      const my  = a.y + (b.y - a.y) * t;
      const seed = i * 1000 + s;
      for (let k = 0; k < 3; k++) {
        const ox  = (cellRng(seed, k * 3 + 1) - 0.5) * D * 0.85;
        const oy  = (cellRng(seed, k * 3 + 2) - 0.5) * D * 0.85;
        const sr  = 0.8 + cellRng(seed, k * 3 + 3) * 1.4;
        const sa  = 0.10 + cellRng(seed, k * 3 + 4) * 0.14;
        ctx.fillStyle = `rgba(80,45,10,${sa})`;
        ctx.beginPath();
        ctx.ellipse(mx + ox, my + oy, sr, sr * 0.6, cellRng(seed, k) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── Grass blades along both edges of each segment ──
  ctx.lineCap = 'butt';
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;   // left-side normal

    const segLen = Math.hypot(dx, dy);
    const bladeSpacing = CELL * 0.55;
    const count = Math.ceil(segLen / bladeSpacing);

    for (let s = 0; s < count; s++) {
      const t    = (s + 0.5) / count;
      const seed = i * 500 + s;
      const ex   = a.x + dx * t;
      const ey   = a.y + dy * t;

      for (const side of [-1, 1]) {
        if (cellRng(seed, side + 10) < 0.2) continue;
        const edgeX = ex + nx * R * side;
        const edgeY = ey + ny * R * side;

        const r1 = cellRng(seed, side * 7 + 1);
        const r2 = cellRng(seed, side * 7 + 2);
        const r3 = cellRng(seed, side * 7 + 3);
        const r4 = cellRng(seed, side * 7 + 4);
        const h      = CELL * (0.08 + r1 * 0.11);
        const w      = CELL * (0.025 + r2 * 0.035);
        const lean   = (r3 - 0.5) * CELL * 0.28;
        const bright = 0.4 + r4 * 0.6;
        const cr = Math.round(25 + bright * 30);
        const cg = Math.round(85 + bright * 75);
        const cb = Math.round(8  + bright * 18);
        drawGrassBlade(edgeX, edgeY, nx * side, ny * side, lean, h, w, `rgb(${cr},${cg},${cb})`);
      }
    }
  }

  // ── Entry & exit flags ──
  // Place two flags flanking each end of the path, perpendicular to the path direction.
  const flagGateOffset = PATH_RENDER_RADIUS * 1.1;  // half-width between the two flags
  const flagPoleH = CELL * 0.82;
  const flagH  = CELL * 0.28;
  const flagW  = CELL * 0.38;

  const flagEndpoints = [
    { pt: path[0],              next: path[1],                       color: '#22aa22', shadow: '#115511' },
    { pt: path[path.length - 1], next: path[path.length - 2],        color: '#cc1111', shadow: '#661111' },
  ];

  for (const { pt, next, color, shadow } of flagEndpoints) {
    // Direction along path and perpendicular
    const dx = next.x - pt.x, dy = next.y - pt.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;   // perpendicular unit vector

    // Draw one flag on each side of the path centre
    for (const side of [-1, 1]) {
      const fx = pt.x + px * flagGateOffset * side;
      const fy = pt.y + py * flagGateOffset * side;

      // Pennant points in the path travel direction
      const fdx =  dx / len, fdy = dy / len;

      const poleTop = fy - flagPoleH * 0.56;
      const poleBot = fy + flagPoleH * 0.44;
      const poleX   = fx;

      // pole shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.moveTo(poleX + 2, poleTop + 2);
      ctx.lineTo(poleX + 2, poleBot + 2);
      ctx.stroke();

      // pole
      ctx.strokeStyle = '#c8a86a';
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.moveTo(poleX, poleTop);
      ctx.lineTo(poleX, poleBot);
      ctx.stroke();

      // pennant shadow
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.moveTo(poleX + 1,                    poleTop + 2);
      ctx.lineTo(poleX + fdx * flagW + 1,      poleTop + fdy * flagW + flagH * 0.5 + 2);
      ctx.lineTo(poleX + 1,                    poleTop + flagH + 2);
      ctx.closePath();
      ctx.fill();

      // pennant
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(poleX,               poleTop);
      ctx.lineTo(poleX + fdx * flagW, poleTop + fdy * flagW + flagH * 0.5);
      ctx.lineTo(poleX,               poleTop + flagH);
      ctx.closePath();
      ctx.fill();

      // sheen
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(poleX,                        poleTop);
      ctx.lineTo(poleX + fdx * flagW * 0.55,  poleTop + fdy * flagW * 0.55 + flagH * 0.5);
      ctx.lineTo(poleX,                        poleTop + flagH * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ─── Popup helpers ────────────────────────────────────────────────────────────

function getPlacementPopupHeight() {
  return POPUP_TITLE_H + CARD_H + POPUP_PAD * 2;
}

// Returns 'arrow', 'mage', or null
function getPlacementCardAt(mx, my, popup) {
  const cardY = popup.py + POPUP_TITLE_H + POPUP_PAD;
  if (my < cardY || my > cardY + CARD_H) return null;
  const arrowX = popup.px + POPUP_PAD;
  const mageX  = popup.px + POPUP_PAD + CARD_W + CARD_GAP;
  if (mx >= arrowX && mx <= arrowX + CARD_W) return 'arrow';
  if (mx >= mageX  && mx <= mageX  + CARD_W) return 'mage';
  return null;
}

// Returns 0 for arrow card hover, 1 for mage card hover, -1 for neither
function getPlacementCardHover(mx, my, popup) {
  const kind = getPlacementCardAt(mx, my, popup);
  if (kind === 'arrow') return 0;
  if (kind === 'mage')  return 1;
  return -1;
}

function getTurretPopupRows(turret) {
  const tiers    = getTierTable(turret.kind);
  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(turret.tier) + 1] || null;
  const rows = [];
  if (nextTier) {
    rows.push({ label: `Upgrade → ${tiers[nextTier].label}`, cost: tiers[nextTier].cost, type: 'upgrade' });
  } else {
    rows.push({ label: 'Max level', cost: null, type: 'maxed' });
  }
  rows.push({ label: `Sell (+${Math.floor(turret.originalCost * 0.5)} Gold)`, cost: null, type: 'sell' });
  return rows;
}

function getTurretPopupHeight(turret) {
  return POPUP_TITLE_H + getTurretPopupRows(turret).length * POPUP_ROW_H + POPUP_PAD;
}

function getPopupRowAt(mx, my, popup, rowCount) {
  const w = popup.w || POPUP_W;
  if (mx < popup.px || mx > popup.px + w) return -1;
  const relY = my - popup.py - POPUP_TITLE_H;
  if (relY < 0) return -1;
  const idx = Math.floor(relY / POPUP_ROW_H);
  return (idx >= 0 && idx < rowCount) ? idx : -1;
}

function drawPopupBase(px, py, h, w, title) {
  ctx.fillStyle   = 'rgba(5, 10, 30, 0.95)';
  ctx.strokeStyle = '#2a4080';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, w, h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle    = '#7090b8';
  ctx.font         = 'bold 10px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, px + POPUP_PAD, py + POPUP_TITLE_H / 2);
}

function drawPlacementCard(cx_, cy_, kind, hovered) {
  const tiers     = getTierTable(kind);
  const cost      = tiers.basic.cost;
  const canAfford = gold >= cost;
  const label     = tiers.basic.label;

  // Card background
  ctx.fillStyle   = hovered && canAfford ? 'rgba(80,140,255,0.22)' : 'rgba(20,30,60,0.7)';
  ctx.strokeStyle = canAfford ? (kind === 'mage' ? '#7050c0' : '#406080') : '#2a3040';
  ctx.lineWidth   = 1.2;
  ctx.beginPath();
  ctx.roundRect(cx_, cy_, CARD_W, CARD_H, 5);
  ctx.fill(); ctx.stroke();

  // Mini icon
  const iconX = cx_ + CARD_W / 2;
  const iconY = cy_ + 20;
  if (kind === 'arrow') {
    // Small arrow icon
    ctx.strokeStyle = canAfford ? '#4a2a08' : '#2a3040';
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'butt';
    ctx.beginPath(); ctx.moveTo(iconX - 10, iconY); ctx.lineTo(iconX + 8, iconY); ctx.stroke();
    ctx.fillStyle = canAfford ? '#2a1500' : '#2a3040';
    ctx.beginPath();
    ctx.moveTo(iconX + 12, iconY);
    ctx.lineTo(iconX + 6,  iconY - 3);
    ctx.lineTo(iconX + 6,  iconY + 3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = canAfford ? '#c8b870' : '#2a3040';
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(iconX - 10, iconY); ctx.lineTo(iconX - 14, iconY - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(iconX - 10, iconY); ctx.lineTo(iconX - 14, iconY + 4); ctx.stroke();
    ctx.lineCap = 'butt';
  } else {
    // Small orb icon
    const orbColor = canAfford ? '#7040a0' : '#2a3040';
    ctx.fillStyle   = orbColor;
    ctx.shadowColor = canAfford ? '#9060d0' : 'transparent';
    ctx.shadowBlur  = canAfford ? 6 : 0;
    ctx.beginPath(); ctx.arc(iconX, iconY, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = canAfford ? 'rgba(200,160,255,0.5)' : 'transparent';
    ctx.beginPath(); ctx.arc(iconX - 2, iconY - 2, 3, 0, Math.PI * 2); ctx.fill();
  }

  // Label
  ctx.fillStyle    = canAfford ? '#d4eeaa' : '#3a4a60';
  ctx.font         = '10px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx_ + CARD_W / 2, cy_ + CARD_H - 26);

  // Cost
  ctx.fillStyle = canAfford ? '#f0c040' : '#3a4a60';
  ctx.font      = 'bold 11px sans-serif';
  ctx.fillText(`${cost} Gold`, cx_ + CARD_W / 2, cy_ + CARD_H - 12);
  ctx.textAlign = 'left';
}

function drawTierPopup(popup) {
  const { px, py } = popup;
  const popH = getPlacementPopupHeight();
  drawPopupBase(px, py, popH, POPUP_W, 'Place Tower');

  const cardY    = py + POPUP_TITLE_H + POPUP_PAD;
  const arrowX   = px + POPUP_PAD;
  const mageX    = px + POPUP_PAD + CARD_W + CARD_GAP;

  drawPlacementCard(arrowX, cardY, 'arrow', popupHoverIdx === 0);
  drawPlacementCard(mageX,  cardY, 'mage',  popupHoverIdx === 1);
}

function drawTurretPopup(popup) {
  const rows = getTurretPopupRows(popup.turret);
  const { px, py, turret } = popup;
  const popW = 240;
  const popH = getTurretPopupHeight(turret);
  drawPopupBase(px, py, popH, popW, getTierTable(turret.kind)[turret.tier].label);

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const ry     = py + POPUP_TITLE_H + i * POPUP_ROW_H;
    const canAct = row.type === 'sell' || (row.type === 'upgrade' && gold >= row.cost);
    const isSell = row.type === 'sell';

    if (i === turretPopupHoverIdx && row.type !== 'maxed') {
      ctx.fillStyle = isSell ? 'rgba(200,60,60,0.2)' : 'rgba(60,120,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(px + 2, ry + 2, popW - 4, POPUP_ROW_H - 4, 4);
      ctx.fill();
    }

    ctx.fillStyle = row.type === 'maxed' ? '#3a4a60' : isSell ? '#ff8080' : canAct ? '#d4eeaa' : '#3a4a60';
    ctx.font      = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, px + POPUP_PAD, ry + POPUP_ROW_H / 2);

    if (row.type === 'upgrade') {
      ctx.fillStyle = canAct ? '#f0c040' : '#3a4a60';
      ctx.textAlign = 'right';
      ctx.fillText(`${row.cost} Gold`, px + popW - POPUP_PAD, ry + POPUP_ROW_H / 2);
      ctx.textAlign = 'left';
    }
  }
}

// ─── Background ───────────────────────────────────────────────────────────────
// Seeded RNG scoped to background patches (different seed space from cellRng).
function bgRng(a, b) {
  let s = (a * 2341 + b * 7919) | 0;
  s = (s ^ (s >>> 15)) * 0x2c1b3c6d | 0;
  return ((s ^ (s >>> 13)) >>> 0) / 0xffffffff;
}

function renderBackground() {
  // Base grass fill
  ctx.fillStyle = '#4a7a24';
  ctx.fillRect(0, 0, W, H);

  // Scattered ellipse colour patches
  for (let i = 0; i < 60; i++) {
    const px    = bgRng(i, 1) * W;
    const py    = bgRng(i, 2) * H;
    const rx    = CELL * (0.6 + bgRng(i, 3) * 1.2);
    const ry    = CELL * (0.3 + bgRng(i, 4) * 0.7);
    const angle = bgRng(i, 5) * Math.PI;
    ctx.globalAlpha = 0.18 + bgRng(i, 7) * 0.18;
    ctx.fillStyle   = bgRng(i, 6) > 0.5 ? '#2a5010' : '#5a9030';
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Grass tufts and bushes on non-path cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (pathRenderSet.has(`${r},${c}`)) continue;
      const cellCX = c * CELL + CELL / 2;
      const cellCY = r * CELL + CELL / 2;
      const base   = r * 97 + c * 53;

      // Grass tufts (~30% of cells)
      if (bgRng(base, 9) < 0.30) {
        const bladeCount = 2 + Math.floor(bgRng(base, 10) * 3);
        for (let b = 0; b < bladeCount; b++) {
          const bx     = cellCX + (bgRng(base + b, 11) - 0.5) * CELL * 0.55;
          const by     = cellCY + (bgRng(base + b, 12) - 0.5) * CELL * 0.55;
          const h      = CELL * (0.12 + bgRng(base + b, 13) * 0.1);
          const lean   = (bgRng(base + b, 14) - 0.5) * CELL * 0.12;
          const bright = 0.4 + bgRng(base + b, 15) * 0.6;
          const gr     = Math.round(85 + bright * 70);

          ctx.globalAlpha = 0.22;
          ctx.fillStyle   = '#1a3005';
          ctx.beginPath();
          ctx.moveTo(bx - 2 + 1, by + 1);
          ctx.quadraticCurveTo(bx + lean * 0.8 + 1, by - h * 0.5 + 1, bx + lean + 1, by - h + 1);
          ctx.lineTo(bx + 2 + 1, by + 1);
          ctx.closePath();
          ctx.fill();

          ctx.globalAlpha = 1;
          ctx.fillStyle   = `rgb(${Math.round(28 + bright * 22)},${gr},${Math.round(8 + bright * 12)})`;
          ctx.beginPath();
          ctx.moveTo(bx - 2, by);
          ctx.quadraticCurveTo(bx + lean * 0.8, by - h * 0.5, bx + lean, by - h);
          ctx.lineTo(bx + 2, by);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Bushes (~8% of cells)
      if (bgRng(base, 16) < 0.08) {
        const blobCount = 3 + Math.floor(bgRng(base, 17) * 3);
        const bushR     = CELL * (0.12 + bgRng(base, 18) * 0.1);

        ctx.globalAlpha = 0.25;
        ctx.fillStyle   = '#1a3005';
        ctx.beginPath();
        ctx.ellipse(cellCX + 2, cellCY + 3, bushR * 1.6, bushR * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        for (let b = 0; b < blobCount; b++) {
          const ox     = (bgRng(base + b, 19) - 0.5) * bushR * 1.8;
          const oy     = (bgRng(base + b, 20) - 0.5) * bushR * 0.9;
          const br     = bushR * (0.7 + bgRng(base + b, 21) * 0.5);
          const bright = 0.35 + bgRng(base + b, 22) * 0.45;
          ctx.globalAlpha = 0.9;
          ctx.fillStyle   = `rgb(${Math.round(20 + bright * 25)},${Math.round(70 + bright * 60)},${Math.round(10 + bright * 15)})`;
          ctx.beginPath();
          ctx.arc(cellCX + ox, cellCY + oy, br, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 0.35;
        ctx.fillStyle   = '#90cc40';
        ctx.beginPath();
        ctx.ellipse(cellCX - bushR * 0.2, cellCY - bushR * 0.3, bushR * 0.5, bushR * 0.3, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Archer tower drawing (Kingdom Rush style) ───────────────────────────────
function drawArcherTower(t, sc) {
  const face   = TOWER_FACE[t.tier];
  const side   = TOWER_SIDE[t.tier];
  const dark   = TOWER_DARK[t.tier];
  const mortar = TOWER_MORTAR[t.tier];

  const TW  = CELL * 1.0;
  const TH  = CELL * 0.82;
  const D   = CELL * 0.22;
  const hw  = TW / 2;
  const yTop  = -TH * 0.55;
  const yBase =  TH * 0.45;
  const mH    = CELL * 0.14;         // merlon height

  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(sc, sc);

  // Ground shadow
  ctx.globalAlpha = 0.3;
  ctx.fillStyle   = '#000';
  ctx.beginPath();
  ctx.ellipse(0, yBase + CELL * 0.08, hw * 1.1, CELL * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Top face (parallelogram illusion)
  ctx.fillStyle   = side;
  ctx.strokeStyle = dark;
  ctx.lineWidth   = 0.8;
  ctx.beginPath();
  ctx.moveTo(-hw, yTop);     ctx.lineTo(hw, yTop);
  ctx.lineTo(hw, yTop - D);  ctx.lineTo(-hw, yTop - D);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Front face
  ctx.fillStyle = face;
  ctx.fillRect(-hw, yTop, TW, TH);

  // Brick mortar lines
  ctx.strokeStyle = mortar;
  ctx.lineWidth   = 0.7;
  for (let i = 1; i <= 3; i++) {
    const my = yTop + (TH * i) / 4;
    ctx.beginPath(); ctx.moveTo(-hw, my); ctx.lineTo(hw, my); ctx.stroke();
  }
  for (let row = 0; row < 4; row++) {
    const rowY   = yTop + (TH * row) / 4;
    const offset = (row % 2) * (TW / 6);
    for (let col = 0; col < 4; col++) {
      const mx = -hw + offset + col * (TW / 3);
      ctx.beginPath(); ctx.moveTo(mx, rowY); ctx.lineTo(mx, rowY + TH / 4); ctx.stroke();
    }
  }

  // Front face border
  ctx.strokeStyle = dark;
  ctx.lineWidth   = 1.2;
  ctx.beginPath();
  ctx.moveTo(-hw, yTop); ctx.lineTo(-hw, yBase);
  ctx.lineTo( hw, yBase); ctx.lineTo( hw, yTop);
  ctx.stroke();

  // Crenellations (merlons)
  const merlonCount = 5;
  const mW = TW / (merlonCount * 2 - 1);
  for (let i = 0; i < merlonCount; i++) {
    const mx = -hw + i * mW * 2;
    ctx.fillStyle = side;
    ctx.fillRect(mx, yTop - mH - D * 0.5, mW, D * 0.5);
    ctx.fillStyle = face;
    ctx.fillRect(mx, yTop - mH, mW, mH);
    ctx.strokeStyle = dark;
    ctx.lineWidth   = 0.8;
    ctx.strokeRect(mx, yTop - mH, mW, mH);
  }

  // Wooden platform
  const platY = yTop - D * 0.5;
  ctx.fillStyle   = '#7a5020';
  ctx.strokeStyle = '#4a2e10';
  ctx.lineWidth   = 0.5;
  ctx.fillRect(-hw + 2, platY, TW - 4, D * 0.5);
  ctx.globalAlpha = 0.5;
  for (const ox of [-hw * 0.5, 0, hw * 0.5]) {
    ctx.beginPath(); ctx.moveTo(ox, platY); ctx.lineTo(ox, platY + D * 0.5); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // ── Archer (upright, beside flag pole) ──
  const archerX = t.x + (-hw + CELL * 0.22) * sc;
  const archerY = t.y + (yTop - mH) * sc;

  ctx.save();
  ctx.translate(archerX, archerY);
  ctx.scale(sc, sc);

  // Legs
  ctx.fillStyle = '#3a2808';
  ctx.fillRect(-CELL * 0.05, 0, CELL * 0.1, CELL * 0.16);

  // Torso
  ctx.fillStyle   = '#3a6a20';
  ctx.strokeStyle = '#224010';
  ctx.lineWidth   = 0.8;
  ctx.beginPath();
  ctx.roundRect(-CELL * 0.1, -CELL * 0.22, CELL * 0.2, CELL * 0.22, 2);
  ctx.fill(); ctx.stroke();

  // Hood & face
  ctx.fillStyle = '#224010';
  ctx.beginPath();
  ctx.arc(0, -CELL * 0.28, CELL * 0.1, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4a870';
  ctx.beginPath();
  ctx.arc(0, -CELL * 0.26, CELL * 0.075, 0, Math.PI * 2);
  ctx.fill();

  // Arms & bow (rotate to face target)
  ctx.save();
  ctx.translate(0, -CELL * 0.16);
  ctx.rotate(t.angle + Math.PI / 2);

  ctx.strokeStyle = '#3a6a20';
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -CELL * 0.18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-CELL * 0.14, CELL * 0.04); ctx.stroke();

  const bowY = -CELL * 0.14;
  const bowR = CELL * 0.2;
  ctx.strokeStyle = '#8b5e1a';
  ctx.lineWidth   = 2.2;
  ctx.beginPath();
  ctx.arc(0, bowY, bowR, Math.PI * 0.95, Math.PI * 2.05);
  ctx.stroke();

  const bsTop = { x: Math.cos(Math.PI * 0.95) * bowR, y: bowY + Math.sin(Math.PI * 0.95) * bowR };
  const bsBot = { x: Math.cos(Math.PI * 2.05) * bowR, y: bowY + Math.sin(Math.PI * 2.05) * bowR };
  ctx.strokeStyle = '#d4c880';
  ctx.lineWidth   = 0.9;
  ctx.beginPath();
  ctx.moveTo(bsTop.x, bsTop.y);
  ctx.quadraticCurveTo(-CELL * 0.1, bowY, bsBot.x, bsBot.y);
  ctx.stroke();

  // Nocked arrow
  ctx.strokeStyle = '#6b3a10';
  ctx.lineWidth   = 1.2;
  ctx.beginPath(); ctx.moveTo(0, CELL * 0.06); ctx.lineTo(0, -CELL * 0.28); ctx.stroke();
  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.moveTo(0, -CELL * 0.28);
  ctx.lineTo(-CELL * 0.04, -CELL * 0.22);
  ctx.lineTo( CELL * 0.04, -CELL * 0.22);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  ctx.restore();

  // ── Tier flags ──
  if (t.tier === 'advanced' || t.tier === 'ultimate') {
    const flagColor = t.tier === 'ultimate' ? '#e8a820' : '#cc3030';
    const poleTopY  = t.y + (yTop - D - CELL * 0.18) * sc;
    const poleBotY  = t.y + (yTop - D + CELL * 0.02) * sc;
    const poles     = t.tier === 'ultimate'
      ? [{ x: t.x + (-hw + CELL * 0.08) * sc }, { x: t.x + (hw - CELL * 0.08) * sc }]
      : [{ x: t.x + (-hw + CELL * 0.08) * sc }];

    for (const pole of poles) {
      ctx.strokeStyle = '#5a3a10';
      ctx.lineWidth   = 1.4 * sc;
      ctx.lineCap     = 'round';
      ctx.beginPath(); ctx.moveTo(pole.x, poleTopY); ctx.lineTo(pole.x, poleBotY); ctx.stroke();

      ctx.fillStyle = flagColor;
      ctx.beginPath();
      ctx.moveTo(pole.x, poleTopY);
      ctx.lineTo(pole.x + CELL * 0.26 * sc, poleTopY + CELL * 0.1  * sc);
      ctx.lineTo(pole.x + CELL * 0.26 * sc, poleTopY + CELL * 0.22 * sc);
      ctx.lineTo(pole.x,                    poleTopY + CELL * 0.22 * sc);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(pole.x, poleTopY + CELL * 0.06 * sc, CELL * 0.26 * sc, CELL * 0.04 * sc);
    }
  }

  // Arrow-release flash
  if (t.fireAnim > 0) {
    const fwdX = t.x + Math.cos(t.angle) * CELL * 0.44 * sc;
    const fwdY = t.y + Math.sin(t.angle) * CELL * 0.44 * sc;
    ctx.globalAlpha = t.fireAnim * 0.75;
    ctx.fillStyle   = '#fff8c0';
    ctx.beginPath();
    ctx.arc(fwdX, fwdY, CELL * 0.11 * t.fireAnim * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ─── Mage tower drawing ───────────────────────────────────────────────────────
function drawMageTower(t, sc) {
  const face   = TOWER_FACE[t.tier];
  const side   = TOWER_SIDE[t.tier];
  const dark   = TOWER_DARK[t.tier];
  const mortar = TOWER_MORTAR[t.tier];

  const TW   = CELL * 1.0;
  const TH   = CELL * 0.82;
  const D    = CELL * 0.22;
  const hw   = TW / 2;
  const yTop  = -TH * 0.55;
  const yBase =  TH * 0.45;
  const mH    = CELL * 0.14;

  // Mage robe colour by tier
  const robeColor = t.tier === 'ultimate' ? '#6020c0' : t.tier === 'advanced' ? '#5028b0' : '#4040a0';
  const robeDark  = t.tier === 'ultimate' ? '#3a1080' : t.tier === 'advanced' ? '#301870' : '#282870';
  // Staff orb colour by tier — brighter when recently fired
  const orbBase   = t.tier === 'ultimate' ? '#c0d8ff' : t.tier === 'advanced' ? '#4060e0' : '#7040a0';
  const orbGlow   = t.fireAnim > 0;

  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(sc, sc);

  // Ground shadow
  ctx.globalAlpha = 0.3;
  ctx.fillStyle   = '#000';
  ctx.beginPath();
  ctx.ellipse(0, yBase + CELL * 0.08, hw * 1.1, CELL * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Top face
  ctx.fillStyle = side; ctx.strokeStyle = dark; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-hw, yTop); ctx.lineTo(hw, yTop);
  ctx.lineTo(hw, yTop - D); ctx.lineTo(-hw, yTop - D);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Front face
  ctx.fillStyle = face;
  ctx.fillRect(-hw, yTop, TW, TH);

  // Brick mortar
  ctx.strokeStyle = mortar; ctx.lineWidth = 0.7;
  for (let i = 1; i <= 3; i++) {
    const my = yTop + (TH * i) / 4;
    ctx.beginPath(); ctx.moveTo(-hw, my); ctx.lineTo(hw, my); ctx.stroke();
  }
  for (let row = 0; row < 4; row++) {
    const rowY = yTop + (TH * row) / 4;
    const offset = (row % 2) * (TW / 6);
    for (let col = 0; col < 4; col++) {
      const mx = -hw + offset + col * (TW / 3);
      ctx.beginPath(); ctx.moveTo(mx, rowY); ctx.lineTo(mx, rowY + TH / 4); ctx.stroke();
    }
  }

  // Front face border
  ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-hw, yTop); ctx.lineTo(-hw, yBase);
  ctx.lineTo(hw, yBase); ctx.lineTo(hw, yTop);
  ctx.stroke();

  // Crenellations
  const merlonCount = 5;
  const mW = TW / (merlonCount * 2 - 1);
  for (let i = 0; i < merlonCount; i++) {
    const mx = -hw + i * mW * 2;
    ctx.fillStyle = side; ctx.fillRect(mx, yTop - mH - D * 0.5, mW, D * 0.5);
    ctx.fillStyle = face; ctx.fillRect(mx, yTop - mH, mW, mH);
    ctx.strokeStyle = dark; ctx.lineWidth = 0.8; ctx.strokeRect(mx, yTop - mH, mW, mH);
  }

  // Wooden platform
  const platY = yTop - D * 0.5;
  ctx.fillStyle = '#7a5020'; ctx.strokeStyle = '#4a2e10'; ctx.lineWidth = 0.5;
  ctx.fillRect(-hw + 2, platY, TW - 4, D * 0.5);

  ctx.restore();

  // ── Robed mage figure ──
  const mageX = t.x + (-hw + CELL * 0.22) * sc;
  const mageY = t.y + (yTop - mH) * sc;

  ctx.save();
  ctx.translate(mageX, mageY);
  ctx.scale(sc, sc);

  // Robe (triangle silhouette)
  ctx.fillStyle   = robeColor;
  ctx.strokeStyle = robeDark;
  ctx.lineWidth   = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -CELL * 0.38);
  ctx.lineTo(-CELL * 0.14, CELL * 0.16);
  ctx.lineTo( CELL * 0.14, CELL * 0.16);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Robe highlight
  ctx.strokeStyle = 'rgba(180,160,255,0.25)';
  ctx.lineWidth   = 0.6;
  ctx.beginPath();
  ctx.moveTo(-CELL * 0.01, -CELL * 0.35);
  ctx.lineTo(-CELL * 0.1, CELL * 0.12);
  ctx.stroke();

  // Hood
  ctx.fillStyle   = robeDark;
  ctx.strokeStyle = robeDark;
  ctx.beginPath();
  ctx.arc(0, -CELL * 0.3, CELL * 0.1, Math.PI, Math.PI * 2);
  ctx.fill();

  // Face
  ctx.fillStyle = '#d4a870';
  ctx.beginPath();
  ctx.arc(0, -CELL * 0.28, CELL * 0.075, 0, Math.PI * 2);
  ctx.fill();

  // Staff (vertical, slightly forward)
  ctx.strokeStyle = '#6a4010';
  ctx.lineWidth   = 1.8;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(CELL * 0.1, CELL * 0.14);
  ctx.lineTo(CELL * 0.1, -CELL * 0.52);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Staff orb — glows when recently fired
  const orbR = t.tier === 'ultimate' ? CELL * 0.1 : t.tier === 'advanced' ? CELL * 0.085 : CELL * 0.07;
  if (orbGlow) {
    ctx.shadowColor = orbBase;
    ctx.shadowBlur  = 10 * t.fireAnim;
  }
  ctx.fillStyle = orbBase;
  ctx.beginPath();
  ctx.arc(CELL * 0.1, -CELL * 0.54, orbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Orb highlight
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(CELL * 0.07, -CELL * 0.57, orbR * 0.38, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // ── Tier flags (same as archer) ──
  if (t.tier === 'advanced' || t.tier === 'ultimate') {
    const flagColor = t.tier === 'ultimate' ? '#e8a820' : '#cc3030';
    const poleTopY  = t.y + (yTop - D - CELL * 0.18) * sc;
    const poleBotY  = t.y + (yTop - D + CELL * 0.02) * sc;
    const poles     = t.tier === 'ultimate'
      ? [{ x: t.x + (-hw + CELL * 0.08) * sc }, { x: t.x + (hw - CELL * 0.08) * sc }]
      : [{ x: t.x + (-hw + CELL * 0.08) * sc }];

    for (const pole of poles) {
      ctx.strokeStyle = '#5a3a10'; ctx.lineWidth = 1.4 * sc; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pole.x, poleTopY); ctx.lineTo(pole.x, poleBotY); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = flagColor;
      ctx.beginPath();
      ctx.moveTo(pole.x, poleTopY);
      ctx.lineTo(pole.x + CELL * 0.26 * sc, poleTopY + CELL * 0.1  * sc);
      ctx.lineTo(pole.x + CELL * 0.26 * sc, poleTopY + CELL * 0.22 * sc);
      ctx.lineTo(pole.x,                    poleTopY + CELL * 0.22 * sc);
      ctx.closePath(); ctx.fill();
    }
  }

  // Magic release flash (blue-purple instead of yellow)
  if (t.fireAnim > 0) {
    const fwdX = t.x + Math.cos(t.angle) * CELL * 0.44 * sc;
    const fwdY = t.y + Math.sin(t.angle) * CELL * 0.44 * sc;
    ctx.globalAlpha = t.fireAnim * 0.8;
    ctx.shadowColor = '#a060ff';
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = '#c090ff';
    ctx.beginPath();
    ctx.arc(fwdX, fwdY, CELL * 0.13 * t.fireAnim * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }
}

// ─── Render sub-functions ─────────────────────────────────────────────────────
function renderTurrets() {
  // Range rings — green for arrow, purple for mage
  ctx.lineWidth = 1;
  for (const t of turrets) {
    ctx.strokeStyle = t.kind === 'mage' ? 'rgba(120,60,200,0.18)' : 'rgba(80,180,60,0.18)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const t of turrets) {
    const sc = TIER_SCALE[t.tier] || 0.8;
    if (t.kind === 'mage') {
      drawMageTower(t, sc);
    } else {
      drawArcherTower(t, sc);
    }
  }
}

function renderEnemies() {
  for (const e of enemies) drawEnemy(e);
}

function renderParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life * 0.9;
    ctx.fillStyle   = p.color;
    if (p.streak) {
      const len = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.04 + 4;
      const nx  = p.vx / (Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1);
      const ny  = p.vy / (Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1);
      ctx.strokeStyle  = p.color;
      ctx.lineWidth    = p.r;
      ctx.lineCap      = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - nx * len, p.y - ny * len);
      ctx.lineTo(p.x + nx * len * 0.3, p.y + ny * len * 0.3);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function renderBullets() {
  for (const b of bullets) {
    if (b.kind === 'orb') {
      renderOrb(b);
    } else {
      renderArrow(b);
    }
  }
}

function renderArrow(b) {
  const angle = Math.atan2(b.vy, b.vx);
  const cos   = Math.cos(angle), sin = Math.sin(angle);

  // Shadow
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#000';
  ctx.lineWidth   = 1.4;
  ctx.lineCap     = 'butt';
  ctx.beginPath();
  ctx.moveTo(b.px + 1, b.py + 1);
  ctx.lineTo(b.x  + 1, b.y  + 1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Arrow shaft
  ctx.strokeStyle = '#4a2a08';
  ctx.lineWidth   = 1.4;
  ctx.lineCap     = 'butt';
  ctx.beginPath();
  ctx.moveTo(b.px, b.py);
  ctx.lineTo(b.x,  b.y);
  ctx.stroke();

  // Arrowhead
  const hLen = 6, hW = 2.5;
  ctx.fillStyle = '#2a1500';
  ctx.beginPath();
  ctx.moveTo(b.x + cos * hLen,  b.y + sin * hLen);
  ctx.lineTo(b.x - sin * hW,    b.y + cos * hW);
  ctx.lineTo(b.x + sin * hW,    b.y - cos * hW);
  ctx.closePath();
  ctx.fill();

  // Fletching — 3 lines: two angled + one centre
  const fLen = 6;
  ctx.lineWidth = 1;
  ctx.lineCap   = 'round';
  for (const s of [-1, 0, 1]) {
    ctx.strokeStyle = s === 0 ? '#a08840' : '#c8b870';
    ctx.beginPath();
    ctx.moveTo(b.px, b.py);
    ctx.lineTo(b.px - cos * fLen - sin * s * fLen, b.py - sin * fLen + cos * s * fLen);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function renderOrb(b) {
  const tier = b.tier;

  // Trail dots
  for (let i = 0; i < b.trail.length; i++) {
    const pt    = b.trail[i];
    const alpha = (i + 1) / (b.trail.length + 1) * 0.5;
    const tr    = tier === 'ultimate' ? 4 : 3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = tier === 'ultimate' ? '#a0c0ff' : '#6040c0';
    ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (tier === 'basic') {
    // Small dim purple orb, no glow
    ctx.fillStyle = '#7040a0';
    ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(180,120,255,0.4)';
    ctx.beginPath(); ctx.arc(b.x - 1, b.y - 1, 1.5, 0, Math.PI * 2); ctx.fill();

  } else if (tier === 'advanced') {
    // Bright blue-purple orb with glow ring
    ctx.shadowColor = '#4060e0';
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = '#4060e0';
    ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;
    // Glow ring
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#8090ff';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // Highlight
    ctx.fillStyle = 'rgba(200,220,255,0.6)';
    ctx.beginPath(); ctx.arc(b.x - 1.5, b.y - 1.5, 2, 0, Math.PI * 2); ctx.fill();

  } else {
    // Large white-blue orb with two pulsing rings and sparkle trail
    const pulse = 0.7 + Math.sin(Date.now() * 0.012) * 0.3;
    ctx.shadowColor = '#80c0ff';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#c0d8ff';
    ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;
    // Inner ring
    ctx.globalAlpha = 0.4 * pulse;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.stroke();
    // Outer ring
    ctx.globalAlpha = 0.2 * pulse;
    ctx.strokeStyle = '#a0d0ff';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // Core highlight
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function renderPlacementUI() {
  if (phase !== 'placing' && phase !== 'between' && phase !== 'wave') return;

  const previewCell = tierPopup ? { row: tierPopup.row, col: tierPopup.col } : hoverCell;
  if (previewCell) {
    const valid = isValidPlacement(previewCell.row, previewCell.col);
    ctx.fillStyle = valid ? 'rgba(80,200,60,0.25)' : 'rgba(255,60,60,0.25)';
    ctx.fillRect(previewCell.col * CELL + 1, previewCell.row * CELL + 1, CELL - 2, CELL - 2);
    if (valid) {
      ctx.strokeStyle = 'rgba(80,200,60,0.4)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(cx(previewCell.col), cy(previewCell.row), ARROW_TIERS.basic.range * CELL, 0, Math.PI * 2); // arrow preview range
      ctx.stroke();
    }
  }

  if (tierPopup)   drawTierPopup(tierPopup);
  if (turretPopup) drawTurretPopup(turretPopup);

  // Bottom status bar (placing / between phases only)
  if (phase !== 'wave') {
    const barMsg = phase === 'between'
      ? `Wave ${wave} cleared! — Place turrets or click Start Wave ${wave + 1}  (${gold} Gold available)`
      : `Place turrets then click Start Wave 1  —  ${gold} Gold available`;
    ctx.fillStyle    = 'rgba(0,15,0,0.75)';
    ctx.fillRect(0, H - 32, W, 32);
    ctx.fillStyle    = '#d4eeaa';
    ctx.font         = '13px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(barMsg, W / 2, H - 16);

    drawWavePreview();
  }
}

// Bounds of the last-drawn wave preview close button — used for hit-testing
let _wavePreviewClose = null;

function drawWavePreview() {
  _wavePreviewClose = null;
  const nextWave = wave + 1;
  if (nextWave > wavesInLevel() || wavePreviewDismissed) return;

  const enemyType = nextWave;
  const enemyName = ENEMY_NAMES[enemyType] || 'Enemies';
  const hp        = ENEMY_BASE_HP + (nextWave - 1) * ENEMY_HP_SCALE;
  const speed     = (ENEMY_BASE_SPEED + (nextWave - 1) * ENEMY_SPEED_SCALE).toFixed(1);
  const count     = ENEMIES_PER_WAVE;

  const pw = 190, ph = 72;
  const px = 8, py = 8;

  // Panel background
  ctx.fillStyle   = 'rgba(0,10,0,0.82)';
  ctx.strokeStyle = 'rgba(80,180,60,0.5)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 6);
  ctx.fill(); ctx.stroke();

  // Header
  ctx.fillStyle    = '#a0d860';
  ctx.font         = 'bold 11px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`WAVE ${nextWave} INCOMING`, px + 10, py + 8);

  // Close button (×)
  const cx_ = px + pw - 14, cy_ = py + 10, cr = 7;
  _wavePreviewClose = { x: cx_, y: cy_, r: cr };
  ctx.fillStyle   = 'rgba(255,255,255,0.15)';
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.arc(cx_, cy_, cr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 11px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('×', cx_, cy_);

  // Mini enemy silhouette
  const c  = ENEMY_COLORS[enemyType];
  const ex = px + 22, ey = py + 42, er = 10;
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.arc(ex, ey + 2, er * 0.75, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex, ey - er * 0.6, er * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = c.dark; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(ex, ey + 2, er * 0.75, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(ex, ey - er * 0.6, er * 0.55, 0, Math.PI * 2); ctx.stroke();

  // Stats
  ctx.fillStyle    = '#e8e8c0';
  ctx.font         = 'bold 13px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(enemyName, px + 40, py + 32);
  ctx.fillStyle = '#a0c880';
  ctx.font      = '11px sans-serif';
  ctx.fillText(`${count} enemies`, px + 40, py + 48);
  ctx.fillText(`HP ${hp}  ·  Speed ${speed}`, px + 40, py + 62);
}

function handleWavePreviewClick(mx, my) {
  if (!_wavePreviewClose) return false;
  const { x, y, r } = _wavePreviewClose;
  if ((mx - x) ** 2 + (my - y) ** 2 <= r * r) {
    wavePreviewDismissed = true;
    return true;
  }
  return false;
}

// ─── Main render ──────────────────────────────────────────────────────────────
function render() {
  renderBackground();   // fills canvas + grass patches (no need for clearRect)
  renderPath();         // drawSmoothPath()
  renderTurrets();
  renderEnemies();
  renderParticles();
  renderBullets();
  renderPlacementUI();
  updateHUD();
}

function renderPath() {
  drawSmoothPath();
}
