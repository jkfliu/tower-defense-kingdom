// ─── theme.js ─────────────────────────────────────────────────────────────────
// All canvas drawing: colours, backgrounds, path, towers, enemies, bullets, UI.
// Reads globals from game.js: ctx, CELL, W, H, COLS, ROWS, TURRET_TIERS,
//   path, pathSet, turrets, enemies, bullets, particles,
//   gold, phase, wave, hoverCell,
//   tierPopup, popupHoverIdx, turretPopup, turretPopupHoverIdx,
//   isValidPlacement, cx, cy, updateHUD

// ─── Enemy colours ────────────────────────────────────────────────────────────
const ENEMY_COLORS = [
  null,
  { body: '#30c830', dark: '#186018', accent: '#90ff90' },  // wave 1 — green
  { body: '#2070e0', dark: '#103880', accent: '#70b8ff' },  // wave 2 — blue
  { body: '#c030c0', dark: '#601060', accent: '#ff80ff' },  // wave 3 — magenta
  { body: '#e06020', dark: '#803010', accent: '#ffb070' },  // wave 4 — orange
  { body: '#e02020', dark: '#800010', accent: '#ff7070' },  // wave 5 — red
];

// ─── Tower constants ──────────────────────────────────────────────────────────
const TIER_ORDER = ['basic', 'advanced', 'ultimate'];

const TIER_SCALE = { basic: 0.8, advanced: 0.88, ultimate: 0.96 };

const TOWER_FACE  = { basic: '#c8a87a', advanced: '#a09080', ultimate: '#787068' };
const TOWER_SIDE  = { basic: '#9a7850', advanced: '#706858', ultimate: '#504840' };
const TOWER_DARK  = { basic: '#6a5030', advanced: '#504040', ultimate: '#302828' };
const TOWER_MORTAR = { basic: '#8a6840', advanced: '#585050', ultimate: '#383030' };

// ─── Popup constants ──────────────────────────────────────────────────────────
const POPUP_W       = 190;
const POPUP_ROW_H   = 34;
const POPUP_PAD     = 10;
const POPUP_TITLE_H = 24;

// ─── Enemy drawing ────────────────────────────────────────────────────────────
function drawEnemy(e) {
  const x = e.x, y = e.y;
  const r = CELL * 0.27;
  const c = ENEMY_COLORS[e.type] || ENEMY_COLORS[1];

  // Antennae
  ctx.strokeStyle = c.dark;
  ctx.lineWidth   = Math.max(1.5, r * 0.1);
  ctx.beginPath(); ctx.moveTo(x - r * 0.35, y - r * 0.7); ctx.lineTo(x - r * 0.55, y - r * 1.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + r * 0.35, y - r * 0.7); ctx.lineTo(x + r * 0.55, y - r * 1.3); ctx.stroke();
  ctx.fillStyle = c.accent;
  ctx.beginPath(); ctx.arc(x - r * 0.55, y - r * 1.3, r * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.55, y - r * 1.3, r * 0.13, 0, Math.PI * 2); ctx.fill();

  // Head dome
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.42, r * 0.58, Math.PI, 0);
  ctx.fill();

  // Main body
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.roundRect(x - r * 0.85, y - r * 0.48, r * 1.7, r * 1.08, r * 0.15);
  ctx.fill();
  ctx.strokeStyle = c.dark;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Side claws
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.roundRect(x - r * 1.42, y - r * 0.12, r * 0.62, r * 0.52, r * 0.1); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x + r * 0.80, y - r * 0.12, r * 0.62, r * 0.52, r * 0.1); ctx.fill(); ctx.stroke();

  // Bottom legs (3)
  for (const dx of [-0.55, 0, 0.55]) {
    ctx.beginPath();
    ctx.roundRect(x + dx * r - r * 0.1, y + r * 0.6, r * 0.2, r * 0.36, r * 0.05);
    ctx.fill();
  }

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.28, r * 0.2,  0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.28, r * 0.2,  0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.accent;
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.28, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.28, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * 0.27, y - r * 0.26, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.27, y - r * 0.26, r * 0.06, 0, Math.PI * 2); ctx.fill();

  // Jagged alien mouth
  ctx.strokeStyle = c.dark;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  const mouthX = x - r * 0.36, mouthY = y + r * 0.18;
  ctx.moveTo(mouthX, mouthY);
  ctx.lineTo(mouthX + r * 0.18, mouthY - r * 0.16);
  ctx.lineTo(mouthX + r * 0.36, mouthY);
  ctx.lineTo(mouthX + r * 0.54, mouthY - r * 0.16);
  ctx.lineTo(mouthX + r * 0.72, mouthY);
  ctx.stroke();

  // HP bar
  const ratio = e.hp / e.maxHp;
  const bw = r * 2.2, bh = 3, bx = x - bw / 2, by = y - r * 1.5 - 4;
  ctx.fillStyle = '#333';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = ratio > 0.5 ? '#30cc30' : ratio > 0.25 ? '#cccc00' : '#cc2020';
  ctx.fillRect(bx, by, bw * ratio, bh);
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
  const pathCells = new Set(path.map(c => `${c.row},${c.col}`));

  const NEIGHBOURS = [
    { dr: -1, dc:  0, side: 0, ndx:  0, ndy:  1 },
    { dr:  1, dc:  0, side: 1, ndx:  0, ndy: -1 },
    { dr:  0, dc: -1, side: 2, ndx:  1, ndy:  0 },
    { dr:  0, dc:  1, side: 3, ndx: -1, ndy:  0 },
  ];

  // ── Dirt tiles ──
  for (const { row, col } of path) {
    const x = col * CELL, y = row * CELL;

    ctx.fillStyle = (row + col) % 2 === 0 ? '#c8a05a' : '#bc9850';
    ctx.fillRect(x, y, CELL, CELL);

    // Top highlight
    ctx.fillStyle = 'rgba(255, 220, 140, 0.18)';
    ctx.fillRect(x, y, CELL, CELL * 0.4);

    // Horizontal grain lines
    ctx.strokeStyle = 'rgba(100, 65, 20, 0.12)';
    ctx.lineWidth = 0.5;
    for (let dy = CELL * 0.25; dy < CELL; dy += CELL * 0.22) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y + dy);
      ctx.lineTo(x + CELL - 2, y + dy);
      ctx.stroke();
    }

    // Dirt specks
    for (let i = 0; i < 4; i++) {
      const sx = x + cellRng(row * 71 + col * 37 + i, 11) * (CELL - 4) + 2;
      const sy = y + cellRng(row * 71 + col * 37 + i, 22) * (CELL - 4) + 2;
      const sr = 0.8 + cellRng(row * 71 + col * 37 + i, 33) * 1.2;
      const sa = 0.12 + cellRng(row * 71 + col * 37 + i, 44) * 0.15;
      ctx.fillStyle = `rgba(80, 45, 10, ${sa})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, sr * 0.6, cellRng(row + i, col + i) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dark border on grass-facing edges
    ctx.strokeStyle = '#6a3e10';
    ctx.lineWidth   = 1.5;
    for (const { dr, dc, side } of NEIGHBOURS) {
      if (pathCells.has(`${row + dr},${col + dc}`)) continue;
      ctx.beginPath();
      if (side === 0) { ctx.moveTo(x,        y);        ctx.lineTo(x + CELL, y); }
      if (side === 1) { ctx.moveTo(x,        y + CELL); ctx.lineTo(x + CELL, y + CELL); }
      if (side === 2) { ctx.moveTo(x,        y);        ctx.lineTo(x,        y + CELL); }
      if (side === 3) { ctx.moveTo(x + CELL, y);        ctx.lineTo(x + CELL, y + CELL); }
      ctx.stroke();

      // Inner shadow gutter
      ctx.fillStyle = 'rgba(60, 30, 0, 0.18)';
      if (side === 0) ctx.fillRect(x,            y,            CELL, 3);
      if (side === 1) ctx.fillRect(x,            y + CELL - 3, CELL, 3);
      if (side === 2) ctx.fillRect(x,            y,            3,    CELL);
      if (side === 3) ctx.fillRect(x + CELL - 3, y,            3,    CELL);
    }
  }

  // ── Grass blades along path edges ──
  for (const { row, col } of path) {
    const x = col * CELL, y = row * CELL;
    for (const { dr, dc, side, ndx, ndy } of NEIGHBOURS) {
      if (pathCells.has(`${row + dr},${col + dc}`)) continue;
      if (cellRng(row * 7 + col * 3, side + 50) < 0.2) continue;

      const countSeed  = cellRng(row * 11 + col * 5, side + 100);
      const bladeCount = 2 + Math.floor(countSeed * countSeed * 7);

      const positions = [];
      for (let i = 0; i < bladeCount; i++) {
        positions.push(cellRng(row * 17 + col * 13 + i * 3, side * 29 + 7));
      }
      if (cellRng(row + col * 19, side + 200) > 0.55 && positions.length >= 2) {
        const anchor = cellRng(row * 23, col * 41 + side);
        positions[0] = anchor;
        positions[1] = anchor + (cellRng(row, col + side * 3 + 1) - 0.5) * 0.12;
        if (positions[2] !== undefined)
          positions[2] = anchor + (cellRng(row + 1, col + side * 3 + 2) - 0.5) * 0.18;
      }

      for (let i = 0; i < bladeCount; i++) {
        const t  = Math.max(0.02, Math.min(0.98, positions[i]));
        const rx = (ndx === 0) ? x + t * CELL : (ndx > 0 ? x : x + CELL);
        const ry = (ndy === 0) ? y + t * CELL : (ndy > 0 ? y : y + CELL);

        const r1 = cellRng(row * 53 + col * 29 + i * 11, side * 37 + 1);
        const r2 = cellRng(row * 53 + col * 29 + i * 11, side * 37 + 2);
        const r3 = cellRng(row * 53 + col * 29 + i * 11, side * 37 + 3);
        const r4 = cellRng(row * 53 + col * 29 + i * 11, side * 37 + 4);

        const h      = CELL * (0.08 + r1 * 0.11);
        const w      = CELL * (0.025 + r2 * 0.035);
        const lean   = (r3 - 0.5) * CELL * 0.28;
        const bright = 0.4 + r4 * 0.6;
        const cr = Math.round(25 + bright * 30);
        const cg = Math.round(85 + bright * 75);
        const cb = Math.round(8  + bright * 18);
        drawGrassBlade(rx, ry, ndx, ndy, lean, h, w, `rgb(${cr},${cg},${cb})`);
      }
    }
  }

  // ── Entry & exit portals ──
  const p0 = path[0], pN = path[path.length - 1];
  for (const [ex, ey, label, fill, border] of [
    [cx(p0.col), cy(p0.row), 'START', '#2a7a2a', '#60d060'],
    [cx(pN.col), cy(pN.row), 'END',   '#8a1a1a', '#ff5050'],
  ]) {
    ctx.fillStyle   = fill;
    ctx.strokeStyle = border;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(ex - CELL * 0.38, ey - CELL * 0.32, CELL * 0.76, CELL * 0.64, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(ex - CELL * 0.3, ey - CELL * 0.26, CELL * 0.6, CELL * 0.2, 3);
    ctx.fill();
    ctx.fillStyle    = '#fff';
    ctx.font         = `bold ${Math.round(CELL * 0.26)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ex, ey);
  }
}

// ─── Popup helpers ────────────────────────────────────────────────────────────
function getPopupOptions() {
  return [
    { key: 'basic', label: TURRET_TIERS.basic.label, cost: TURRET_TIERS.basic.cost, color: '#38485a' },
  ];
}

function getPopupHeight() {
  return POPUP_TITLE_H + getPopupOptions().length * POPUP_ROW_H + POPUP_PAD;
}

function getTurretPopupRows(turret) {
  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(turret.tier) + 1] || null;
  const rows = [];
  if (nextTier) {
    rows.push({ label: `Upgrade → ${TURRET_TIERS[nextTier].label}`, cost: TURRET_TIERS[nextTier].cost, type: 'upgrade' });
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
  if (mx < popup.px || mx > popup.px + POPUP_W) return -1;
  const relY = my - popup.py - POPUP_TITLE_H;
  if (relY < 0) return -1;
  const idx = Math.floor(relY / POPUP_ROW_H);
  return (idx >= 0 && idx < rowCount) ? idx : -1;
}

function drawPopupBase(px, py, h, title) {
  ctx.fillStyle   = 'rgba(5, 10, 30, 0.95)';
  ctx.strokeStyle = '#2a4080';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, POPUP_W, h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle    = '#7090b8';
  ctx.font         = 'bold 10px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, px + POPUP_PAD, py + POPUP_TITLE_H / 2);
}

function drawTierPopup(popup) {
  const options = getPopupOptions();
  const { px, py } = popup;
  drawPopupBase(px, py, getPopupHeight(), 'Place Turret');

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const ry  = py + POPUP_TITLE_H + i * POPUP_ROW_H;
    const canAfford = gold >= opt.cost;

    if (i === popupHoverIdx && canAfford) {
      ctx.fillStyle = 'rgba(60,120,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(px + 2, ry + 2, POPUP_W - 4, POPUP_ROW_H - 4, 4);
      ctx.fill();
    }

    ctx.fillStyle = canAfford ? opt.color : '#2a3040';
    ctx.beginPath();
    ctx.arc(px + POPUP_PAD + 6, ry + POPUP_ROW_H / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = canAfford ? '#d4eeaa' : '#3a4a60';
    ctx.font      = '12px sans-serif';
    ctx.fillText(opt.label, px + POPUP_PAD + 18, ry + POPUP_ROW_H / 2);

    ctx.fillStyle = canAfford ? '#f0c040' : '#3a4a60';
    ctx.textAlign = 'right';
    ctx.fillText(`${opt.cost} Gold`, px + POPUP_W - POPUP_PAD, ry + POPUP_ROW_H / 2);
    ctx.textAlign = 'left';
  }
}

function drawTurretPopup(popup) {
  const rows = getTurretPopupRows(popup.turret);
  const { px, py, turret } = popup;
  drawPopupBase(px, py, getTurretPopupHeight(turret), `${TURRET_TIERS[turret.tier].label} Turret`);

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const ry     = py + POPUP_TITLE_H + i * POPUP_ROW_H;
    const canAct = row.type === 'sell' || (row.type === 'upgrade' && gold >= row.cost);
    const isSell = row.type === 'sell';

    if (i === turretPopupHoverIdx && row.type !== 'maxed') {
      ctx.fillStyle = isSell ? 'rgba(200,60,60,0.2)' : 'rgba(60,120,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(px + 2, ry + 2, POPUP_W - 4, POPUP_ROW_H - 4, 4);
      ctx.fill();
    }

    ctx.fillStyle = row.type === 'maxed' ? '#3a4a60' : isSell ? '#ff8080' : canAct ? '#d4eeaa' : '#3a4a60';
    ctx.font      = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, px + POPUP_PAD, ry + POPUP_ROW_H / 2);

    if (row.type === 'upgrade') {
      ctx.fillStyle = canAct ? '#f0c040' : '#3a4a60';
      ctx.textAlign = 'right';
      ctx.fillText(`${row.cost} Gold`, px + POPUP_W - POPUP_PAD, ry + POPUP_ROW_H / 2);
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
      if (pathSet.has(`${r},${c}`)) continue;
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

// ─── Render sub-functions ─────────────────────────────────────────────────────
function renderTurrets() {
  // Range rings
  ctx.strokeStyle = 'rgba(80,180,60,0.18)';
  ctx.lineWidth   = 1;
  for (const t of turrets) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const t of turrets) {
    drawArcherTower(t, TIER_SCALE[t.tier] || 0.8);
  }
}

function renderEnemies() {
  for (const e of enemies) drawEnemy(e);
}

function renderParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life * 0.9;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function renderBullets() {
  for (const b of bullets) {
    const angle = Math.atan2(b.vy, b.vx);
    const cos   = Math.cos(angle), sin = Math.sin(angle);

    // Arrow shaft
    ctx.strokeStyle = '#6b4a1e';
    ctx.lineWidth   = 1.8;
    ctx.lineCap     = 'butt';
    ctx.beginPath();
    ctx.moveTo(b.px, b.py);
    ctx.lineTo(b.x,  b.y);
    ctx.stroke();

    // Arrowhead
    const hLen = 5, hW = 2.5;
    ctx.fillStyle = '#3d2a10';
    ctx.beginPath();
    ctx.moveTo(b.x + cos * hLen,  b.y + sin * hLen);
    ctx.lineTo(b.x - sin * hW,    b.y + cos * hW);
    ctx.lineTo(b.x + sin * hW,    b.y - cos * hW);
    ctx.closePath();
    ctx.fill();

    // Fletching
    const fLen = 4;
    ctx.strokeStyle = '#c8b870';
    ctx.lineWidth   = 1;
    ctx.lineCap     = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(b.px, b.py);
      ctx.lineTo(b.px - cos * fLen - sin * s * fLen, b.py - sin * fLen + cos * s * fLen);
      ctx.stroke();
    }
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
      ctx.arc(cx(previewCell.col), cy(previewCell.row), TURRET_TIERS.basic.range * CELL, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (tierPopup)   drawTierPopup(tierPopup);
  if (turretPopup) drawTurretPopup(turretPopup);

  // Bottom status bar (placing / between phases only)
  if (phase !== 'wave') {
    const barMsg = phase === 'between'
      ? `Wave ${wave} cleared! — Place turrets or click Start Wave ${wave + 1}  (${gold} Gold available)`
      : `Place turrets then click Start Game  —  ${gold} Gold available`;
    ctx.fillStyle    = 'rgba(0,15,0,0.75)';
    ctx.fillRect(0, H - 32, W, 32);
    ctx.fillStyle    = '#d4eeaa';
    ctx.font         = '13px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(barMsg, W / 2, H - 16);
  }
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
