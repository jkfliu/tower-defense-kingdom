// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 27, ROWS = 16, CELL = 30;
const W = COLS * CELL, H = ROWS * CELL;       // 810 × 480
 
const TOTAL_WAVES       = 5;
const ENEMIES_PER_WAVE  = 10;
const SPAWN_MS          = 1000;
const ENEMY_RADIUS      = Math.round(CELL * 0.27);
const BULLET_SPEED      = 320;  // px/s

const STARTING_GOLD     = 100;

const MIN_PATH_CELLS    = 48;    // minimum cells for a valid path (~25% coverage)
const PARTICLE_COUNT    = 8;     // particles spawned per enemy death
const FIRE_ANIM_DECAY   = 9;     // multiplier for muzzle flash fade speed
const HIT_RADIUS_BONUS  = 3;     // extra px added to ENEMY_RADIUS for bullet hit detection
const ENEMY_BASE_HP     = 50;    // starting HP for wave 1 enemies
const ENEMY_HP_SCALE    = 30;    // HP added per wave
const ENEMY_BASE_SPEED  = 1.8;   // cells/sec for wave 1 enemies
const ENEMY_SPEED_SCALE = 0.35; // speed added per wave

const TURRET_TIERS = {
  basic:    { label: 'Basic',    cost: 40,  damage: 30, fireRate: 1.2, range: 3.5 },
  advanced: { label: 'Advanced', cost: 70,  damage: 50, fireRate: 1.5, range: 4.0 },
  ultimate: { label: 'Ultimate', cost: 100, damage: 80, fireRate: 1.8, range: 4.3 },
};

const GOLD_PER_KILL = [null, 8, 12, 18, 25, 35];  // indexed by wave number (1-based)

// ─── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
canvas.width  = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

// ─── UI helpers ───────────────────────────────────────────────────────────────
function setStartButton(label, classes = []) {
  const btn = document.getElementById('start-btn');
  btn.textContent = label;
  btn.className = classes.join(' ');
}

// ─── Audio ────────────────────────────────────────────────────────────────────
let audioCtx = null;
let muted = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playLaser() {
  if (muted) return;
  try {
    const ac   = getAudioCtx();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sawtooth';
    const freq = 480 + Math.random() * 160;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.1);
    gain.gain.setValueAtTime(0.11, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.11);
  } catch (_) {}
}

function playExplosion() {
  if (muted) return;
  try {
    const ac = getAudioCtx();
    const t  = ac.currentTime;

    // Low-frequency boom (sine drop: 90 Hz → 18 Hz)
    const boomOsc  = ac.createOscillator();
    const boomGain = ac.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(90, t);
    boomOsc.frequency.exponentialRampToValueAtTime(18, t + 0.45);
    boomGain.gain.setValueAtTime(0.9, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    boomOsc.connect(boomGain);
    boomGain.connect(ac.destination);
    boomOsc.start(t);
    boomOsc.stop(t + 0.46);

    // Noise crack layered on top
    const dur    = 0.28;
    const frames = Math.floor(ac.sampleRate * dur);
    const buf    = ac.createBuffer(1, frames, ac.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 1.5);
    }
    const src       = ac.createBufferSource();
    src.buffer      = buf;
    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(noiseGain);
    noiseGain.connect(ac.destination);
    src.start(t);
  } catch (_) {}
}

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
    if (!paused) lastFrame = 0;  // reset so dt doesn't spike on resume
    setStartButton(paused ? 'Resume' : 'Pause', paused ? ['paused'] : []);
  }
});

// ─── Canvas placement interaction ────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if (phase !== 'placing' && phase !== 'between' && phase !== 'wave') { hoverCell = null; return; }
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const col = Math.floor(mx / CELL);
  const row = Math.floor(my / CELL);
  hoverCell = (row >= 0 && row < ROWS && col >= 0 && col < COLS) ? { row, col } : null;

  // Track hovered row inside open popup
  if (tierPopup) {
    popupHoverIdx = getPopupRowAt(mx, my, tierPopup, getPopupOptions().length);
  } else if (turretPopup) {
    turretPopupHoverIdx = getPopupRowAt(mx, my, turretPopup, getTurretPopupRows(turretPopup.turret).length);
  }
});

canvas.addEventListener('mouseleave', () => { hoverCell = null; });

function handleTurretPopupClick(mx, my) {
  const idx = getPopupRowAt(mx, my, turretPopup, getTurretPopupRows(turretPopup.turret).length);
  if (idx === 0) {
    const t = turretPopup.turret;
    const nextTier = TIER_ORDER[TIER_ORDER.indexOf(t.tier) + 1] || null;
    if (nextTier && gold >= TURRET_TIERS[nextTier].cost) {
      gold -= TURRET_TIERS[nextTier].cost;
      const cfg = TURRET_TIERS[nextTier];
      t.tier = nextTier; t.damage = cfg.damage; t.fireRate = cfg.fireRate;
      t.range = cfg.range * CELL; t.originalCost = cfg.cost;
    }
  } else if (idx === 1) {
    const t = turretPopup.turret;
    gold += Math.floor(t.originalCost * 0.5);
    turrets = turrets.filter(x => x !== t);
  }
  turretPopup = null;
  turretPopupHoverIdx = -1;
}

function handleTierPopupClick(mx, my) {
  const options = getPopupOptions();
  const idx = getPopupRowAt(mx, my, tierPopup, options.length);
  if (idx >= 0) {
    const tier = options[idx].key;
    if (gold >= TURRET_TIERS[tier].cost) {
      gold -= TURRET_TIERS[tier].cost;
      turrets.push(makeTurret(tierPopup.row, tierPopup.col, tier));
    }
  }
  tierPopup = null;
  popupHoverIdx = -1;
}

function handleCellClick(row, col) {
  const clickedTurret = turrets.find(t => t.row === row && t.col === col);
  if (clickedTurret) {
    const cellPixelX = clickedTurret.col * CELL;
    const px = (cellPixelX + CELL + POPUP_W > W) ? cellPixelX - POPUP_W : cellPixelX + CELL;
    const py = Math.min(clickedTurret.row * CELL, H - getTurretPopupHeight(clickedTurret));
    turretPopup = { turret: clickedTurret, px, py };
    turretPopupHoverIdx = -1;
    return;
  }
  if (!isValidPlacement(row, col)) return;
  const cellPixelX = col * CELL;
  const px = (cellPixelX + CELL + POPUP_W > W) ? cellPixelX - POPUP_W : cellPixelX + CELL;
  const py = Math.min(row * CELL, H - getPopupHeight());
  tierPopup = { row, col, px, py };
  popupHoverIdx = -1;
}

canvas.addEventListener('click', e => {
  if (phase !== 'placing' && phase !== 'between' && phase !== 'wave') return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const col = Math.floor(mx / CELL);
  const row = Math.floor(my / CELL);

  if (turretPopup)      { handleTurretPopupClick(mx, my); return; }
  if (tierPopup)        { handleTierPopupClick(mx, my);   return; }
  handleCellClick(row, col);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const cx = col => col * CELL + CELL / 2;   // cell centre x
const cy = row => row * CELL + CELL / 2;   // cell centre y

// ─── State (declared here, initialised in initGame) ───────────────────────────
let path, pathSet, turrets, enemies, bullets, particles;
let wave, lives, score, gold, phase;
let spawnedCount, lastSpawnTime, lastFrame;
let hoverCell = null;   // {row, col} of cell under mouse, or null
let tierPopup = null;         // { row, col, px, py } — open placement popup, or null
let popupHoverIdx = -1;       // hovered row index inside tier popup (-1 = none)
let turretPopup = null;       // { turret, px, py } — open upgrade/sell popup, or null
let turretPopupHoverIdx = -1; // hovered row index inside turret popup (-1 = none)
let stars = [];
let paused = false;

// ─── Path generation ──────────────────────────────────────────────────────────
// Builds a zigzag right-angle path from left edge to right edge.
// 6 intermediate waypoints alternate between top zone (rows 1-2) and
// bottom zone (rows 9-10) to guarantee ≥25% canvas coverage.
// Between each pair: go right (horizontal), then up/down (vertical).
function buildPath() {
  const topZone    = () => randInt(1, 3);
  const bottomZone = () => randInt(ROWS - 4, ROWS - 2);
  const numMid     = 4;
  const firstTop   = Math.random() < 0.5;

  const waypoints = [{ row: randInt(3, ROWS - 4), col: 0 }];
  for (let i = 1; i <= numMid; i++) {
    const goTop = firstTop ? (i % 2 === 1) : (i % 2 === 0);
    // Add slight column jitter so waypoints aren't perfectly evenly spaced
    const baseCol = Math.floor(COLS * i / (numMid + 1));
    const jitter  = randInt(-1, 1);
    const col     = Math.max(1, Math.min(COLS - 2, baseCol + jitter));
    waypoints.push({ row: goTop ? topZone() : bottomZone(), col });
  }
  waypoints.push({ row: randInt(3, ROWS - 4), col: COLS - 1 });

  const cells = [];
  const seen  = new Set();
  const add   = (r, c) => {
    const k = `${r},${c}`;
    if (!seen.has(k)) { seen.add(k); cells.push({ row: r, col: c }); }
  };

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    // Horizontal: move right from a.col to b.col at a.row
    const cStep = b.col >= a.col ? 1 : -1;
    for (let c = a.col; c !== b.col + cStep; c += cStep) add(a.row, c);
    // Vertical: move from a.row to b.row at b.col
    if (a.row !== b.row) {
      const dr = b.row > a.row ? 1 : -1;
      for (let r = a.row + dr; r !== b.row + dr; r += dr) add(r, b.col);
    }
  }

  return cells;
}

function generatePath() {
  // Regenerate until path covers ≥25% of canvas (≥MIN_PATH_CELLS unique cells)
  let cells;
  do { cells = buildPath(); } while (cells.length < MIN_PATH_CELLS);
  return cells;
}

// ─── Turret helpers ───────────────────────────────────────────────────────────
function makeTurret(row, col, tier = 'basic') {
  const cfg = TURRET_TIERS[tier];
  return {
    row, col,
    x: cx(col), y: cy(row),
    tier,
    originalCost: cfg.cost,
    damage:   cfg.damage,
    fireRate: cfg.fireRate,
    range:    cfg.range * CELL,
    cooldown: 0,
    angle:    -Math.PI / 2,
    fireAnim: 0,
  };
}

function isValidPlacement(row, col) {
  return (
    row >= 0 && row < ROWS &&
    col >= 0 && col < COLS &&
    !pathSet.has(`${row},${col}`) &&
    !turrets.some(t => t.row === row && t.col === col)
  );
}

// ─── Enemy factory ────────────────────────────────────────────────────────────
// pathIndex = index of the cell the enemy is moving TOWARD (starts at 1).
// progress  = 0–1 interpolation between path[pathIndex-1] and path[pathIndex].
function makeEnemy() {
  const hp = ENEMY_BASE_HP + (wave - 1) * ENEMY_HP_SCALE;
  return {
    type:      wave,   // 1 / 2 / 3 — controls colour
    pathIndex: 1,
    progress:  0,
    hp,
    maxHp: hp,
    speed: ENEMY_BASE_SPEED + (wave - 1) * ENEMY_SPEED_SCALE,  // cells per second
    x: cx(path[0].col),
    y: cy(path[0].row),
    alive: true,
  };
}

// ─── Update: enemies ──────────────────────────────────────────────────────────
function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;

    e.progress += e.speed * dt;

    // Advance through path cells (handles fast enemies or slow frames)
    while (e.progress >= 1.0 && e.alive) {
      e.progress -= 1.0;
      e.pathIndex++;
      if (e.pathIndex >= path.length) {
        e.alive = false;
        lives = Math.max(0, lives - 1);
      }
    }

    if (e.alive) {
      const prev = path[e.pathIndex - 1];
      const curr = path[e.pathIndex];
      e.x = cx(prev.col) + (cx(curr.col) - cx(prev.col)) * e.progress;
      e.y = cy(prev.row) + (cy(curr.row) - cy(prev.row)) * e.progress;
    }
  }

  enemies = enemies.filter(e => e.alive);
}

// ─── Update: turrets ──────────────────────────────────────────────────────────
function updateTurrets(dt) {
  for (const t of turrets) {
    t.cooldown  = Math.max(0, t.cooldown - dt);
    t.fireAnim  = Math.max(0, t.fireAnim - dt * FIRE_ANIM_DECAY);  // fades in ~110 ms

    // Find nearest alive enemy within range
    let nearest = null, nearestDist = Infinity;
    for (const e of enemies) {
      const dx = e.x - t.x, dy = e.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= t.range && dist < nearestDist) {
        nearest = e; nearestDist = dist;
      }
    }

    if (nearest) {
      t.angle = Math.atan2(nearest.y - t.y, nearest.x - t.x);
      if (t.cooldown <= 0) {
        t.cooldown = 1 / t.fireRate;
        t.fireAnim = 1.0;
        playLaser();
        const angle = Math.atan2(nearest.y - t.y, nearest.x - t.x);
        bullets.push({
          x: t.x, y: t.y,
          px: t.x, py: t.y,  // previous position for trail
          vx: Math.cos(angle) * BULLET_SPEED,
          vy: Math.sin(angle) * BULLET_SPEED,
          originX: t.x, originY: t.y, range: t.range,
          damage: t.damage,
          done: false,
        });
      }
    }
  }
}

// ─── Update: bullets ──────────────────────────────────────────────────────────
function updateBullets(dt) {
  for (const b of bullets) {
    if (b.done) continue;
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Cull if beyond turret range
    const dx0 = b.x - b.originX, dy0 = b.y - b.originY;
    if (dx0 * dx0 + dy0 * dy0 > b.range * b.range) {
      b.done = true;
      continue;
    }

    // Hit detection against all alive enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = b.x - e.x, dy = b.y - e.y;
      if (dx * dx + dy * dy < (ENEMY_RADIUS + HIT_RADIUS_BONUS) ** 2) {
        e.hp -= b.damage;
        if (e.hp <= 0) {
          e.alive = false;
          score += 10;
          gold  += GOLD_PER_KILL[wave];
          playExplosion();
          spawnParticles(e.x, e.y, ENEMY_COLORS[e.type] || ENEMY_COLORS[1]);
        }
        b.done = true;
        break;
      }
    }
  }

  bullets = bullets.filter(b => !b.done);
  enemies = enemies.filter(e => e.alive);
}

// ─── Particles ────────────────────────────────────────────────────────────────
function spawnParticles(x, y, colors) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
    const speed = 40 + Math.random() * 60;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 4 + Math.random() * 4,
      life: 1.0,       // 0–1, fades to 0
      decay: 1.8 + Math.random() * 1.2,
      color: Math.random() < 0.6 ? colors.body : colors.accent,
    });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x    += p.vx * dt;
    p.y    += p.vy * dt;
    p.vx   *= 0.88;
    p.vy   *= 0.88;
    p.r    *= 0.96;
    p.life -= p.decay * dt;
  }
  particles = particles.filter(p => p.life > 0);
}

// ─── Enemy drawing ────────────────────────────────────────────────────────────
const ENEMY_COLORS = [
  null,
  { body: '#30c830', dark: '#186018', accent: '#90ff90' },  // wave 1: green
  { body: '#2070e0', dark: '#103880', accent: '#70b8ff' },  // wave 2: blue
  { body: '#c030c0', dark: '#601060', accent: '#ff80ff' },  // wave 3: magenta
  { body: '#e06020', dark: '#803010', accent: '#ffb070' },  // wave 4: orange
  { body: '#e02020', dark: '#800010', accent: '#ff7070' },  // wave 5: red
];

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
  ctx.fillStyle   = c.body;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.42, r * 0.58, Math.PI, 0);
  ctx.fill();

  // Main body
  ctx.fillStyle   = c.body;
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
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.28, r * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.28, r * 0.2, 0, Math.PI * 2); ctx.fill();
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
  const mx = x - r * 0.36, my = y + r * 0.18;
  ctx.moveTo(mx, my);
  ctx.lineTo(mx + r * 0.18, my - r * 0.16);
  ctx.lineTo(mx + r * 0.36, my);
  ctx.lineTo(mx + r * 0.54, my - r * 0.16);
  ctx.lineTo(mx + r * 0.72, my);
  ctx.stroke();

  // HP bar
  const ratio = e.hp / e.maxHp;
  const bw = r * 2.2, bh = 3, bx = x - bw / 2, by = y - r * 1.5 - 4;
  ctx.fillStyle = '#333';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = ratio > 0.5 ? '#30cc30' : ratio > 0.25 ? '#cccc00' : '#cc2020';
  ctx.fillRect(bx, by, bw * ratio, bh);
}

// ─── Smooth path drawing ──────────────────────────────────────────────────────
function drawSmoothPath() {
  const pts = path.map(c => ({ x: cx(c.col), y: cy(c.row) }));

  // Builds the bezier curve through midpoints (rounds all corners)
  function tracePath() {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }

  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  // Outer glow bloom
  tracePath();
  ctx.strokeStyle = 'rgba(60, 20, 160, 0.35)';
  ctx.lineWidth   = CELL * 1.1;
  ctx.stroke();

  // Dark void lane
  tracePath();
  ctx.strokeStyle = '#0a0618';
  ctx.lineWidth   = CELL * 0.85;
  ctx.stroke();

  // Energy field mid-layer
  tracePath();
  ctx.strokeStyle = 'rgba(80, 40, 200, 0.55)';
  ctx.lineWidth   = CELL * 0.55;
  ctx.stroke();

  // Bright core
  tracePath();
  ctx.strokeStyle = 'rgba(140, 90, 255, 0.45)';
  ctx.lineWidth   = CELL * 0.22;
  ctx.stroke();

  // Entry circle (blue-green warp point)
  const p0 = pts[0], pN = pts[pts.length - 1];
  ctx.fillStyle   = '#1a6080';
  ctx.strokeStyle = '#40c0ff';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.arc(p0.x, p0.y, CELL * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Exit circle (red danger zone)
  ctx.fillStyle   = '#801a1a';
  ctx.strokeStyle = '#ff4040';
  ctx.beginPath(); ctx.arc(pN.x, pN.y, CELL * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Labels
  ctx.font         = 'bold 9px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#a0e8ff';
  ctx.fillText('IN',  p0.x, p0.y);
  ctx.fillStyle = '#ffaaaa';
  ctx.fillText('OUT', pN.x, pN.y);
}

// ─── Placement popup ─────────────────────────────────────────────────────────
const POPUP_ROW_H  = 34;
const POPUP_PAD    = 10;
const POPUP_TITLE_H = 24;
const POPUP_W      = 190;

// Returns the list of turret options shown in the popup.
// Add future turret styles here when ready.
function getPopupOptions() {
  return [
    { key: 'basic', label: TURRET_TIERS.basic.label, cost: TURRET_TIERS.basic.cost, color: '#38485a' },
    // future styles: { key: 'archer', label: 'Archer', cost: 25, color: '#5a3820' },
  ];
}

function getPopupHeight() {
  return POPUP_TITLE_H + getPopupOptions().length * POPUP_ROW_H + POPUP_PAD;
}

// Returns the index of the popup row the mouse is over, or -1.
function getPopupRowAt(mx, my, popup, rowCount) {
  if (mx < popup.px || mx > popup.px + POPUP_W) return -1;
  const relY = my - popup.py - POPUP_TITLE_H;
  if (relY < 0) return -1;
  const idx = Math.floor(relY / POPUP_ROW_H);
  return (idx >= 0 && idx < rowCount) ? idx : -1;
}

// Draws the shared popup background panel and title label.
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
  const h = getPopupHeight();
  const { px, py } = popup;

  drawPopupBase(px, py, h, 'Place Turret');

  // Rows
  for (let i = 0; i < options.length; i++) {
    const opt  = options[i];
    const ry   = py + POPUP_TITLE_H + i * POPUP_ROW_H;
    const canAfford = gold >= opt.cost;

    // Row hover highlight
    if (i === popupHoverIdx && canAfford) {
      ctx.fillStyle = 'rgba(60,120,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(px + 2, ry + 2, POPUP_W - 4, POPUP_ROW_H - 4, 4);
      ctx.fill();
    }

    // Colour dot
    ctx.fillStyle = canAfford ? opt.color : '#2a3040';
    ctx.beginPath();
    ctx.arc(px + POPUP_PAD + 6, ry + POPUP_ROW_H / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = canAfford ? '#c8e0ff' : '#3a4a60';
    ctx.font      = '12px sans-serif';
    ctx.fillText(opt.label, px + POPUP_PAD + 18, ry + POPUP_ROW_H / 2);

    // Cost
    ctx.fillStyle = canAfford ? '#f0c040' : '#3a4a60';
    ctx.textAlign = 'right';
    ctx.fillText(`${opt.cost} Gold`, px + POPUP_W - POPUP_PAD, ry + POPUP_ROW_H / 2);
    ctx.textAlign = 'left';
  }
}

// ─── Turret upgrade/sell popup ────────────────────────────────────────────────
const TIER_ORDER = ['basic', 'advanced', 'ultimate'];

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

function drawTurretPopup(popup) {
  const rows = getTurretPopupRows(popup.turret);
  const h = getTurretPopupHeight(popup.turret);
  const { px, py, turret } = popup;

  drawPopupBase(px, py, h, `${TURRET_TIERS[turret.tier].label} Turret`);

  // Rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ry  = py + POPUP_TITLE_H + i * POPUP_ROW_H;
    const canAct = row.type === 'sell' || (row.type === 'upgrade' && gold >= row.cost);
    const isSell = row.type === 'sell';

    // Hover highlight
    if (i === turretPopupHoverIdx && row.type !== 'maxed') {
      ctx.fillStyle = isSell ? 'rgba(200,60,60,0.2)' : 'rgba(60,120,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(px + 2, ry + 2, POPUP_W - 4, POPUP_ROW_H - 4, 4);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = row.type === 'maxed' ? '#3a4a60' : isSell ? '#ff8080' : canAct ? '#c8e0ff' : '#3a4a60';
    ctx.font      = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(row.label, px + POPUP_PAD, ry + POPUP_ROW_H / 2);

    // Cost (upgrade only)
    if (row.type === 'upgrade') {
      ctx.fillStyle = canAct ? '#f0c040' : '#3a4a60';
      ctx.textAlign = 'right';
      ctx.fillText(`${row.cost} Gold`, px + POPUP_W - POPUP_PAD, ry + POPUP_ROW_H / 2);
      ctx.textAlign = 'left';
    }
  }
}

// ─── Render sub-functions ─────────────────────────────────────────────────────
function renderBackground() {
  // Stars
  for (const s of stars) {
    ctx.globalAlpha = s.brightness;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Subtle grid
  ctx.strokeStyle = 'rgba(30, 50, 90, 0.5)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke();
  }
}

function renderPath() {
  // Smooth wavy path
  drawSmoothPath();
}

function renderTurrets() {
  // Turret range rings (subtle)
  ctx.strokeStyle = 'rgba(80,140,255,0.12)';
  ctx.lineWidth   = 1;
  for (const t of turrets) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Turrets — Imperial turbolaser style, tier-differentiated
  const TIER_SCALE  = { basic: 1.0, advanced: 1.1, ultimate: 1.2 };
  const DOME_COLOR  = { basic: '#38485a', advanced: '#2a5a3a', ultimate: '#5a2a5a' };
  const DOME_STROKE = { basic: '#586878', advanced: '#4a8a5a', ultimate: '#8a4a8a' };

  for (const t of turrets) {
    const sc = TIER_SCALE[t.tier] || 1.0;

    // Ultimate pulsing glow ring (drawn before save/translate so it's in world space)
    if (t.tier === 'ultimate') {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
      ctx.globalAlpha = 0.15 + 0.15 * pulse;
      ctx.strokeStyle = '#cc66ff';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 0.54 * sc, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Advanced outer ring
    if (t.tier === 'advanced') {
      ctx.strokeStyle = 'rgba(60, 200, 80, 0.35)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 0.52 * sc, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(sc, sc);

    // Armored base
    ctx.fillStyle   = '#28303c';
    ctx.strokeStyle = '#48586c';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, CELL * 0.47, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Base panel lines
    ctx.strokeStyle = '#18202a';
    ctx.lineWidth   = 0.8;
    for (const a of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
      const dx = Math.cos(a) * CELL * 0.44, dy = Math.sin(a) * CELL * 0.44;
      ctx.beginPath(); ctx.moveTo(-dx, -dy); ctx.lineTo(dx, dy); ctx.stroke();
    }

    // Rotating dome
    ctx.rotate(t.angle);

    ctx.fillStyle   = DOME_COLOR[t.tier]  || DOME_COLOR.basic;
    ctx.strokeStyle = DOME_STROKE[t.tier] || DOME_STROKE.basic;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(0, 0, CELL * 0.33, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Dome ridge
    ctx.strokeStyle = '#202e3c';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(-CELL * 0.33, 0); ctx.lineTo(CELL * 0.33, 0); ctx.stroke();

    // Twin barrels
    const bLen = CELL * 0.52, bW = 2.8, bGap = 3.8;
    ctx.fillStyle   = '#141c26';
    ctx.strokeStyle = '#283040';
    ctx.lineWidth   = 0.8;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(CELL * 0.1, s * bGap - bW, bLen, bW * 2, 1);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#202c3a';
      ctx.beginPath();
      ctx.rect(CELL * 0.2, s * bGap - bW - 0.5, bW * 1.2, bW * 2 + 1);
      ctx.fill();
      ctx.fillStyle = '#141c26';
    }

    // Targeting sensor
    ctx.fillStyle = '#cc2020';
    ctx.beginPath();
    ctx.arc(CELL * 0.18, 0, CELL * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6060';
    ctx.beginPath();
    ctx.arc(CELL * 0.16, -CELL * 0.02, CELL * 0.03, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Twin muzzle flashes
    if (t.fireAnim > 0) {
      const fwd  = CELL * 0.1 * sc + CELL * 0.52 * sc;
      const bGap = 3.8 * sc;
      for (const s of [-1, 1]) {
        const tipX = t.x + Math.cos(t.angle) * fwd - Math.sin(t.angle) * s * bGap;
        const tipY = t.y + Math.sin(t.angle) * fwd + Math.cos(t.angle) * s * bGap;
        ctx.globalAlpha = t.fireAnim * 0.75;
        ctx.fillStyle   = '#ff4400';
        ctx.beginPath();
        ctx.arc(tipX, tipY, CELL * 0.2 * t.fireAnim, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = t.fireAnim;
        ctx.fillStyle   = '#ffee88';
        ctx.beginPath();
        ctx.arc(tipX, tipY, CELL * 0.1 * t.fireAnim, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

function renderEnemies() {
  // Enemies
  for (const e of enemies) drawEnemy(e);
}

function renderParticles() {
  // Particles (death explosions)
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
  // Bullets with trail
  for (const b of bullets) {
    // Fading trail line
    const grad = ctx.createLinearGradient(b.px, b.py, b.x, b.y);
    grad.addColorStop(0, 'rgba(240, 208, 32, 0)');
    grad.addColorStop(1, 'rgba(240, 208, 32, 0.8)');
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(b.px, b.py);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // Bullet head
    ctx.fillStyle = '#f8e84a';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderPlacementUI() {
  // ── Placement UI (placing, between waves, and mid-wave) ──
  if (phase === 'placing' || phase === 'between' || phase === 'wave') {
    // Range preview — use popup cell if popup is open, otherwise hovered cell
    const previewCell = tierPopup ? { row: tierPopup.row, col: tierPopup.col } : hoverCell;
    if (previewCell) {
      const valid = isValidPlacement(previewCell.row, previewCell.col);
      ctx.fillStyle = valid ? 'rgba(60,160,255,0.25)' : 'rgba(255,60,60,0.25)';
      ctx.fillRect(previewCell.col * CELL + 1, previewCell.row * CELL + 1, CELL - 2, CELL - 2);
      if (valid) {
        ctx.strokeStyle = 'rgba(80,160,255,0.35)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.arc(cx(previewCell.col), cy(previewCell.row), TURRET_TIERS.basic.range * CELL, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Tier popup
    if (tierPopup) drawTierPopup(tierPopup);

    // Turret upgrade/sell popup
    if (turretPopup) drawTurretPopup(turretPopup);

    // Instruction bar — only during placing and between phases
    if (phase !== 'wave') {
      const barMsg = phase === 'between'
        ? `Wave ${wave} cleared! — Place turrets or click Start Wave ${wave + 1}  (${gold} Gold available)`
        : `Place turrets then click Start Game  —  ${gold} Gold available`;
      ctx.fillStyle = 'rgba(0,5,20,0.75)';
      ctx.fillRect(0, H - 32, W, 32);
      ctx.fillStyle    = '#c8e0ff';
      ctx.font         = '13px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(barMsg, W / 2, H - 16);
    }
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, W, H);
  renderBackground();
  renderPath();
  renderTurrets();
  renderEnemies();
  renderParticles();
  renderBullets();
  renderPlacementUI();
  updateHUD();
}

function updateHUD() {
  document.getElementById('wave-val').textContent  = `${wave} / ${TOTAL_WAVES}`;
  document.getElementById('lives-val').textContent = lives;
  document.getElementById('score-val').textContent = score;
  document.getElementById('gold-val').textContent  = gold;
}

// ─── Game loop ────────────────────────────────────────────────────────────────
function gameLoop(ts) {
  if (lastFrame === 0) lastFrame = ts;
  const dt = Math.min((ts - lastFrame) / 1000, 0.1);  // cap at 100 ms
  lastFrame = ts;

  if (phase === 'wave' && !paused) {
    // Spawn next enemy on schedule
    if (spawnedCount < ENEMIES_PER_WAVE && ts - lastSpawnTime >= SPAWN_MS) {
      enemies.push(makeEnemy());
      spawnedCount++;
      lastSpawnTime = ts;
    }

    updateEnemies(dt);
    updateTurrets(dt);
    updateBullets(dt);
    updateParticles(dt);

    // Lives check takes priority over wave-complete check
    if (lives <= 0) {
      phase = 'lose';
      bullets = [];
      setStartButton('Start Game', ['dimmed']);
      showOverlay('Game Over', 'Play Again', `Score: ${score}`);
    } else if (spawnedCount >= ENEMIES_PER_WAVE && enemies.length === 0 && particles.length === 0) {
      bullets = [];
      if (wave >= TOTAL_WAVES) {
        phase = 'win';
        setStartButton('Start Game', ['dimmed']);
        showOverlay('You win!', 'Play Again', `Score: ${score}`);
      } else {
        phase = 'between';
        canvas.classList.add('placing');
        setStartButton(`Start Wave ${wave + 1}`);
        hideOverlay();
      }
    }
  }

  render();
  requestAnimationFrame(gameLoop);
}

// ─── Overlay helpers ──────────────────────────────────────────────────────────
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
  document.getElementById('msg').style.display         = 'none';
  document.getElementById('sub-msg').style.display     = 'none';
  document.getElementById('action-btn').style.display  = 'none';
}

document.getElementById('new-game-btn').addEventListener('click', initGame);

document.getElementById('action-btn').addEventListener('click', () => {
  if (phase === 'lose' || phase === 'win') {
    initGame();
  }
});

function startWave() {
  wave++;
  spawnedCount  = 0;
  lastSpawnTime = 0;
  enemies       = [];
  bullets       = [];
  tierPopup           = null;
  turretPopup         = null;
  turretPopupHoverIdx = -1;
  phase               = 'wave';
  paused        = false;
  canvas.classList.remove('placing');
  setStartButton('Pause');
  hideOverlay();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function initGame() {
  path      = generatePath();
  pathSet   = new Set(path.map(c => `${c.row},${c.col}`));
  turrets   = [];
  enemies   = [];
  bullets   = [];
  particles = [];
  wave     = 0;
  lives    = 3;
  score    = 0;
  gold     = STARTING_GOLD;
  phase    = 'placing';
  lastFrame     = 0;
  spawnedCount  = 0;
  lastSpawnTime = 0;
  hoverCell     = null;
  tierPopup           = null;
  popupHoverIdx       = -1;
  turretPopup         = null;
  turretPopupHoverIdx = -1;
  paused        = false;
  setStartButton('Start Game');
  stars = Array.from({ length: 90 }, () => ({
    x:          Math.random() * W,
    y:          Math.random() * H,
    r:          Math.random() * 1.1 + 0.2,
    brightness: Math.random() * 0.6 + 0.3,
  }));
  canvas.classList.add('placing');
  hideOverlay();
}

initGame();
requestAnimationFrame(gameLoop);
