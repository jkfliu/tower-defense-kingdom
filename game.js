// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 20, ROWS = 12, CELL = 40;
const W    = COLS * CELL;   // 800
const H    = ROWS * CELL;   // 480

// Waves
const TOTAL_WAVES      = 5;
const ENEMIES_PER_WAVE = 10;
const SPAWN_MS         = 1000;

// Enemies
const ENEMY_RADIUS     = Math.round(CELL * 0.27);
const ENEMY_BASE_HP    = 50;
const ENEMY_HP_SCALE   = 30;
const ENEMY_BASE_SPEED = 1.8;   // cells/sec
const ENEMY_SPEED_SCALE = 0.35;

// Bullets & combat
const BULLET_SPEED     = 420;   // px/s
const HIT_RADIUS_BONUS = 3;     // extra px for bullet hit detection
const PARTICLE_COUNT   = 8;

// UI
const FIRE_ANIM_DECAY  = 9;     // muzzle-flash fade multiplier

// Economy
const STARTING_GOLD    = 100;
const GOLD_PER_KILL    = [null, 8, 12, 18, 25, 35];  // 1-based wave index

// Path
const MIN_PATH_CELLS   = 30;    // ~25% canvas coverage minimum

const TURRET_TIERS = {
  basic:    { label: 'Basic',    cost: 40,  damage: 30, fireRate: 1.2, range: 3.5 },
  advanced: { label: 'Advanced', cost: 70,  damage: 50, fireRate: 1.5, range: 4.0 },
  ultimate: { label: 'Ultimate', cost: 100, damage: 80, fireRate: 1.8, range: 4.3 },
};

// ─── Canvas setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
canvas.width  = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

// ─── Game state ───────────────────────────────────────────────────────────────
// Declared here; initialised (and reset) in initGame().
let path, pathSet;
let turrets, enemies, bullets, particles;
let wave, lives, score, gold, phase;
let spawnedCount, lastSpawnTime, lastFrame;
let paused = false;
let hoverCell = null;           // {row, col} under mouse, or null

// Popup state
let tierPopup           = null; // { row, col, px, py } — new-turret popup
let popupHoverIdx       = -1;
let turretPopup         = null; // { turret, px, py }   — upgrade/sell popup
let turretPopupHoverIdx = -1;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const cx = col => col * CELL + CELL / 2;   // cell-centre x
const cy = row => row * CELL + CELL / 2;   // cell-centre y

// ─── Audio ────────────────────────────────────────────────────────────────────
let audioCtx = null;
let muted    = false;

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

// ─── Path generation ──────────────────────────────────────────────────────────
// Builds a zigzag right-angle path from left to right edge.
// 4 intermediate waypoints alternate between top zone (rows 1–3) and
// bottom zone (rows 8–10), guaranteeing ≥ MIN_PATH_CELLS coverage.
// Each segment: horizontal first, then vertical (L-shaped corners).
function buildPath() {
  const topZone    = () => randInt(1, 3);
  const bottomZone = () => randInt(ROWS - 4, ROWS - 2);
  const NUM_MID    = 4;
  const firstTop   = Math.random() < 0.5;

  const waypoints = [{ row: randInt(3, ROWS - 4), col: 0 }];
  for (let i = 1; i <= NUM_MID; i++) {
    const goTop  = firstTop ? (i % 2 === 1) : (i % 2 === 0);
    const base   = Math.floor(COLS * i / (NUM_MID + 1));
    const col    = Math.max(1, Math.min(COLS - 2, base + randInt(-1, 1)));
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
    const cStep = b.col >= a.col ? 1 : -1;
    for (let c = a.col; c !== b.col + cStep; c += cStep) add(a.row, c);
    if (a.row !== b.row) {
      const dr = b.row > a.row ? 1 : -1;
      for (let r = a.row + dr; r !== b.row + dr; r += dr) add(r, b.col);
    }
  }

  return cells;
}

function generatePath() {
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
function makeEnemy() {
  const hp = ENEMY_BASE_HP + (wave - 1) * ENEMY_HP_SCALE;
  return {
    type:      wave,
    pathIndex: 1,
    progress:  0,
    hp,
    maxHp: hp,
    speed: ENEMY_BASE_SPEED + (wave - 1) * ENEMY_SPEED_SCALE,
    x: cx(path[0].col),
    y: cy(path[0].row),
    alive: true,
  };
}

// ─── Update logic ─────────────────────────────────────────────────────────────
function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.progress += e.speed * dt;

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

function updateTurrets(dt) {
  for (const t of turrets) {
    t.cooldown = Math.max(0, t.cooldown - dt);
    t.fireAnim = Math.max(0, t.fireAnim - dt * FIRE_ANIM_DECAY);

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
          px: t.x, py: t.y,
          vx: Math.cos(angle) * BULLET_SPEED,
          vy: Math.sin(angle) * BULLET_SPEED,
          originX: t.x, originY: t.y,
          range:  t.range,
          damage: t.damage,
          done:   false,
        });
      }
    }
  }
}

function updateBullets(dt) {
  for (const b of bullets) {
    if (b.done) continue;
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const dx0 = b.x - b.originX, dy0 = b.y - b.originY;
    if (dx0 * dx0 + dy0 * dy0 > b.range * b.range) { b.done = true; continue; }

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

function spawnParticles(x, y, colors) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
    const speed = 40 + Math.random() * 60;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r:     4 + Math.random() * 4,
      life:  1.0,
      decay: 1.8 + Math.random() * 1.2,
      color: Math.random() < 0.6 ? colors.body : colors.accent,
    });
  }
}

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
    popupHoverIdx = getPopupRowAt(mx, my, tierPopup, getPopupOptions().length);
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
  const py = Math.min(row * CELL, H - getPopupHeight());
  tierPopup     = { row, col, px, py };
  popupHoverIdx = -1;
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
  tierPopup     = null;
  popupHoverIdx = -1;
}

function handleTurretPopupClick(mx, my) {
  const rows = getTurretPopupRows(turretPopup.turret);
  const idx  = getPopupRowAt(mx, my, turretPopup, rows.length);
  const t    = turretPopup.turret;

  if (idx === 0) {
    const nextTier = TIER_ORDER[TIER_ORDER.indexOf(t.tier) + 1] || null;
    if (nextTier && gold >= TURRET_TIERS[nextTier].cost) {
      gold -= TURRET_TIERS[nextTier].cost;
      const cfg = TURRET_TIERS[nextTier];
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

// ─── Game loop ────────────────────────────────────────────────────────────────
function gameLoop(ts) {
  if (lastFrame === 0) lastFrame = ts;
  const dt = Math.min((ts - lastFrame) / 1000, 0.1);
  lastFrame = ts;

  if (phase === 'wave' && !paused) {
    if (spawnedCount < ENEMIES_PER_WAVE && ts - lastSpawnTime >= SPAWN_MS) {
      enemies.push(makeEnemy());
      spawnedCount++;
      lastSpawnTime = ts;
    }

    updateEnemies(dt);
    updateTurrets(dt);
    updateBullets(dt);
    updateParticles(dt);

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

// ─── UI helpers ───────────────────────────────────────────────────────────────
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

// ─── Bootstrap ────────────────────────────────────────────────────────────────
initGame();
requestAnimationFrame(gameLoop);
