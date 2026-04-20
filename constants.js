// ─── constants.js ─────────────────────────────────────────────────────────────
// All top-level game configuration. No logic — just data.

// ─── Grid ─────────────────────────────────────────────────────────────────────
const COLS = 50, ROWS = 30, CELL = 20;
const W    = COLS * CELL;   // 1000
const H    = ROWS * CELL;   // 600

// ─── Waves ────────────────────────────────────────────────────────────────────
const ENEMIES_PER_WAVE = 10;
const SPAWN_MS_MIN     = 600;   // fastest spawn interval (ms)
const SPAWN_MS_MAX     = 1800;  // slowest spawn interval (ms)

// ─── Enemies ──────────────────────────────────────────────────────────────────
const ENEMY_RADIUS      = Math.round(CELL * 0.27);
const ENEMY_BASE_HP     = 50;
const ENEMY_HP_SCALE    = 30;
const ENEMY_BASE_SPEED  = 1.8 * CELL;   // px/sec
const ENEMY_SPEED_SCALE = 0.35 * CELL;  // px/sec per wave
const ENEMY_NAMES       = [null, 'Goblins', 'Orcs', 'Trolls', 'Dark Elves', 'Demons'];
// Per-type speed and HP multipliers (index 1–5 matches type)
const ENEMY_SPEED_MOD   = [null, 1.4,  1.0,  0.65, 1.25, 0.75];
const ENEMY_HP_MOD      = [null, 0.6,  1.0,  1.8,  0.9,  2.2 ];

// Enemy types allowed per level (0-based). Levels 0-3: no dark elves/demons.
const LEVEL_ENEMY_POOL = [
  [1],           // 0 Forest Outpost   — goblins only
  [1, 2],        // 1 Goblin Warren    — goblins + orcs
  [1, 2],        // 2 Mudflats         — goblins + orcs
  [2, 3],        // 3 Stoneback Ridge  — orcs + trolls
  [1, 2, 3],     // 4 Troll Bridge     — mixed early
  [3, 4],        // 5 Shadowfen        — trolls + dark elves
  [2, 3, 4],     // 6 Ashwood          — orcs + trolls + dark elves
  [4, 5],        // 7 Cursed Ruins     — dark elves + demons
  [3, 4, 5],     // 8 Demon Gate       — trolls + dark elves + demons
  [4, 5],        // 9 Volcano Summit   — dark elves + demons
];

// ─── Bullets & combat ─────────────────────────────────────────────────────────
const ARROW_SPEED      = 420;   // px/s
const ORB_SPEED        = 320;   // px/s — orbs travel slower than arrows
const HIT_RADIUS_BONUS = 3;     // extra px for bullet hit detection
const PARTICLE_COUNT   = 8;

// ─── UI ───────────────────────────────────────────────────────────────────────
const FIRE_ANIM_DECAY  = 9;     // muzzle-flash fade multiplier

// ─── Economy ──────────────────────────────────────────────────────────────────
const STARTING_GOLD  = 100;
const GOLD_PER_KILL  = [null, 8, 10, 12, 15, 18, 22, 26, 30, 35, 40];  // 1-based wave index

// ─── Path ─────────────────────────────────────────────────────────────────────
const MIN_PATH_LENGTH   = 60 * CELL;  // ~25% canvas coverage minimum
const PATH_BLOCK_RADIUS  = CELL * 1.0; // grid cells within this px distance of any segment are blocked
const PATH_RENDER_RADIUS = CELL * 1.0;  // visual half-width of the path stroke

// ─── Campaign ─────────────────────────────────────────────────────────────────
// mx/my are positions in map.jpg image space (1125×1137).
// Levels 0-5 form the vertical arm (top-left going down), 6-9 bend right to the volcano.
const CAMPAIGN_LEVELS = [
  { id: 0, name: 'Forest Outpost',  mx: 180, my: 155,  icon: 'forest',   startGold: 100, description: 'Goblins raid from the treeline. Hold the outpost at all costs.' },
  { id: 1, name: 'Goblin Warren',   mx: 180, my: 290,  icon: 'forest',   startGold: 110, description: 'The goblins have dug in deep. Root them out before they multiply.' },
  { id: 2, name: 'Mudflats',        mx: 180, my: 430,  icon: 'river',    startGold: 120, description: 'Orcs wade through the marshes. Slow them in the mud or be overwhelmed.' },
  { id: 3, name: 'Stoneback Ridge', mx: 180, my: 570,  icon: 'mountain', startGold: 135, description: 'Trolls hurl boulders from the ridgeline. Reach them before they reach you.' },
  { id: 4, name: 'Troll Bridge',    mx: 180, my: 710,  icon: 'mountain', startGold: 150, description: 'A horde crosses the old stone bridge. Destroy it or hold the line.' },
  { id: 5, name: 'Shadowfen',       mx: 180, my: 860,  icon: 'village',  startGold: 165, description: 'Dark Elves emerge from the fen at dusk. They move fast — be ready.' },
  { id: 6, name: 'Ashwood',         mx: 370, my: 930,  icon: 'village',  startGold: 180, description: 'The forest burns. Demons fan the flames while dark elves harry your flanks.' },
  { id: 7, name: 'Cursed Ruins',    mx: 560, my: 980,  icon: 'volcano',  startGold: 200, description: 'Demons have consecrated the ruins. Purge them or lose the east forever.' },
  { id: 8, name: 'Demon Gate',      mx: 750, my: 1020, icon: 'volcano',  startGold: 220, description: 'The gate tears open. Wave after wave pours through. Hold until dawn.' },
  { id: 9, name: 'Volcano Summit',  mx: 940, my: 1040, icon: 'volcano',  startGold: 250, description: 'The demon lord commands from the volcano\'s peak. End this — now.' },
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
