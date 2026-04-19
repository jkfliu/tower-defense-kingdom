// ─── constants.js ─────────────────────────────────────────────────────────────
// All top-level game configuration. No logic — just data.

// ─── Grid ─────────────────────────────────────────────────────────────────────
const COLS = 40, ROWS = 24, CELL = 20;
const W    = COLS * CELL;   // 800
const H    = ROWS * CELL;   // 480

// ─── Waves ────────────────────────────────────────────────────────────────────
const ENEMIES_PER_WAVE = 10;
const SPAWN_MS         = 1000;

// ─── Enemies ──────────────────────────────────────────────────────────────────
const ENEMY_RADIUS      = Math.round(CELL * 0.27);
const ENEMY_BASE_HP     = 50;
const ENEMY_HP_SCALE    = 30;
const ENEMY_BASE_SPEED  = 1.8 * CELL;   // px/sec
const ENEMY_SPEED_SCALE = 0.35 * CELL;  // px/sec per wave
const ENEMY_NAMES       = [null, 'Goblins', 'Orcs', 'Trolls', 'Dark Elves', 'Demons'];

// ─── Bullets & combat ─────────────────────────────────────────────────────────
const ARROW_SPEED      = 420;   // px/s
const ORB_SPEED        = 320;   // px/s — orbs travel slower than arrows
const HIT_RADIUS_BONUS = 3;     // extra px for bullet hit detection
const PARTICLE_COUNT   = 8;

// ─── UI ───────────────────────────────────────────────────────────────────────
const FIRE_ANIM_DECAY  = 9;     // muzzle-flash fade multiplier

// ─── Economy ──────────────────────────────────────────────────────────────────
const STARTING_GOLD  = 100;
const GOLD_PER_KILL  = [null, 8, 12, 18, 25, 35];  // 1-based wave index

// ─── Path ─────────────────────────────────────────────────────────────────────
const MIN_PATH_LENGTH   = 60 * CELL;  // ~25% canvas coverage minimum
const PATH_BLOCK_RADIUS  = CELL * 0.5; // grid cells within this px distance of any segment are blocked
const PATH_RENDER_RADIUS = CELL * 1.0;  // visual half-width of the path stroke

// ─── Campaign ─────────────────────────────────────────────────────────────────
const CAMPAIGN_LEVELS = [
  { id: 0, name: 'Forest Outpost',  x: 90,  y: 260, icon: 'forest',   startGold: 100 },
  { id: 1, name: 'River Crossing',  x: 230, y: 175, icon: 'river',    startGold: 120 },
  { id: 2, name: 'Mountain Pass',   x: 390, y: 215, icon: 'mountain', startGold: 140 },
  { id: 3, name: 'Ruined Village',  x: 560, y: 270, icon: 'village',  startGold: 160 },
  { id: 4, name: 'Castle Siege',    x: 700, y: 170, icon: 'castle',   startGold: 180 },
];

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
