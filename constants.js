// ─── constants.js ─────────────────────────────────────────────────────────────
// All top-level game configuration. No logic — just data.

// ─── Grid ─────────────────────────────────────────────────────────────────────
const COLS = 20, ROWS = 12, CELL = 40;
const W    = COLS * CELL;   // 800
const H    = ROWS * CELL;   // 480

// ─── Waves ────────────────────────────────────────────────────────────────────
const TOTAL_WAVES      = 5;
const ENEMIES_PER_WAVE = 10;
const SPAWN_MS         = 1000;

// ─── Enemies ──────────────────────────────────────────────────────────────────
const ENEMY_RADIUS      = Math.round(CELL * 0.27);
const ENEMY_BASE_HP     = 50;
const ENEMY_HP_SCALE    = 30;
const ENEMY_BASE_SPEED  = 1.8;   // cells/sec
const ENEMY_SPEED_SCALE = 0.35;

// ─── Bullets & combat ─────────────────────────────────────────────────────────
const BULLET_SPEED     = 420;   // px/s
const HIT_RADIUS_BONUS = 3;     // extra px for bullet hit detection
const PARTICLE_COUNT   = 8;

// ─── UI ───────────────────────────────────────────────────────────────────────
const FIRE_ANIM_DECAY  = 9;     // muzzle-flash fade multiplier

// ─── Economy ──────────────────────────────────────────────────────────────────
const STARTING_GOLD  = 100;
const GOLD_PER_KILL  = [null, 8, 12, 18, 25, 35];  // 1-based wave index

// ─── Path ─────────────────────────────────────────────────────────────────────
const MIN_PATH_CELLS = 30;    // ~25% canvas coverage minimum

// ─── Mage bullet speed ────────────────────────────────────────────────────────
const MAGE_BULLET_SPEED = 320;  // px/s — orbs travel slower than arrows

// ─── Tower tiers ──────────────────────────────────────────────────────────────
const TIER_ORDER = ['basic', 'advanced', 'ultimate'];

const ARROW_TIERS = {
  basic:    { label: 'Archers tower', cost: 40,  damage: 30, fireRate: 1.2, range: 3.5 },
  advanced: { label: 'Rangers tower', cost: 70,  damage: 50, fireRate: 1.5, range: 4.0 },
  ultimate: { label: 'Longbow tower', cost: 100, damage: 80, fireRate: 1.8, range: 4.3 },
};

const MAGE_TIERS = {
  basic:    { label: 'Elven mage',     cost: 60,  damage: 45,  fireRate: 0.9, range: 4.0 },
  advanced: { label: 'Elven wizard',   cost: 90,  damage: 75,  fireRate: 1.1, range: 4.5 },
  ultimate: { label: 'Elven sorcerer', cost: 130, damage: 120, fireRate: 1.4, range: 5.0 },
};

function getTierTable(kind) {
  return kind === 'mage' ? MAGE_TIERS : ARROW_TIERS;
}
