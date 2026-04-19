// ─── path.js ──────────────────────────────────────────────────────────────────
// Path generation. Reads globals: COLS, ROWS, CELL, MIN_PATH_LENGTH, PATH_BLOCK_RADIUS.
// Paths are arrays of {x, y} pixel-space waypoints.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distToSegment(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - a.x, py - a.y);
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function pathLength(waypoints) {
  let len = 0;
  for (let i = 1; i < waypoints.length; i++) {
    len += Math.hypot(waypoints[i].x - waypoints[i - 1].x, waypoints[i].y - waypoints[i - 1].y);
  }
  return len;
}

// Precomputes the set of grid cells within `radius` px of any path segment.
function buildPathSet(waypoints, radius) {
  const blocked = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const px = cx(c), py = cy(r);
      for (let i = 0; i < waypoints.length - 1; i++) {
        if (distToSegment(px, py, waypoints[i], waypoints[i + 1]) < radius) {
          blocked.add(`${r},${c}`);
          break;
        }
      }
    }
  }
  return blocked;
}

// ─── Random path generation ───────────────────────────────────────────────────
// Builds a zigzag path from left to right edge using pixel-space waypoints.
// 4 intermediate waypoints alternate between top zone (rows 2–6) and
// bottom zone (rows 16–20), guaranteeing ≥ MIN_PATH_LENGTH coverage.

function buildPath() {
  const topZone    = () => randInt(2, 6) * CELL + CELL / 2;
  const bottomZone = () => randInt(ROWS - 8, ROWS - 4) * CELL + CELL / 2;
  const NUM_MID    = 4;
  const firstTop   = Math.random() < 0.5;

  const waypoints = [{ x: CELL / 2, y: (randInt(6, ROWS - 8)) * CELL + CELL / 2 }];
  for (let i = 1; i <= NUM_MID; i++) {
    const goTop = firstTop ? (i % 2 === 1) : (i % 2 === 0);
    const baseCol = Math.floor(COLS * i / (NUM_MID + 1));
    const col     = Math.max(1, Math.min(COLS - 2, baseCol + randInt(-2, 2)));
    waypoints.push({ x: col * CELL + CELL / 2, y: goTop ? topZone() : bottomZone() });
  }
  waypoints.push({ x: (COLS - 1) * CELL + CELL / 2, y: (randInt(6, ROWS - 8)) * CELL + CELL / 2 });

  return waypoints;
}

function generatePath() {
  let waypoints;
  do { waypoints = buildPath(); } while (pathLength(waypoints) < MIN_PATH_LENGTH);
  return waypoints;
}

// ─── Fixed level paths ────────────────────────────────────────────────────────
// Each entry is an array of {x, y} pixel-space waypoints.
// Derived from original {row, col} waypoints via: x = col*CELL + CELL/2, y = row*CELL + CELL/2

const CAMPAIGN_LEVEL_WAYPOINTS = [
  // 0 — Forest Outpost: gentle diagonal S-curve
  [ {x:10,y:240}, {x:200,y:140}, {x:380,y:340}, {x:560,y:120}, {x:790,y:260} ],
  // 1 — River Crossing: wide diagonal sweep then back
  [ {x:10,y:100}, {x:260,y:380}, {x:400,y:200}, {x:540,y:400}, {x:790,y:140} ],
  // 2 — Mountain Pass: tight zigzag diagonals
  [ {x:10,y:200}, {x:160,y:60}, {x:320,y:420}, {x:480,y:80}, {x:640,y:360}, {x:790,y:180} ],
  // 3 — Ruined Village: long crossing diagonals
  [ {x:10,y:380}, {x:220,y:80}, {x:380,y:300}, {x:500,y:60}, {x:650,y:340}, {x:790,y:160} ],
  // 4 — Castle Siege: sharp angular switchbacks
  [ {x:10,y:160}, {x:150,y:420}, {x:300,y:100}, {x:450,y:380}, {x:600,y:80}, {x:790,y:320} ],
];

function getLevelPath(levelId) {
  return CAMPAIGN_LEVEL_WAYPOINTS[levelId];
}
