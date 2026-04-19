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
  const topZone    = () => randInt(2, 7) * CELL + CELL / 2;
  const bottomZone = () => randInt(ROWS - 9, ROWS - 4) * CELL + CELL / 2;
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
  // 0 — Forest Outpost: gentle S-curve
  [ {x:10,y:300}, {x:250,y:175}, {x:475,y:425}, {x:700,y:150}, {x:990,y:325} ],
  // 1 — Goblin Warren: wide sweep
  [ {x:10,y:475}, {x:225,y:125}, {x:500,y:375}, {x:725,y:100}, {x:990,y:375} ],
  // 2 — Mudflats: shallow zigzag
  [ {x:10,y:150}, {x:275,y:450}, {x:538,y:175}, {x:763,y:475}, {x:990,y:250} ],
  // 3 — Stoneback Ridge: tight high-low zigzag
  [ {x:10,y:250}, {x:188,y:75}, {x:388,y:500}, {x:588,y:75}, {x:800,y:475}, {x:990,y:225} ],
  // 4 — Troll Bridge: long diagonal crossings
  [ {x:10,y:475}, {x:250,y:100}, {x:475,y:400}, {x:650,y:75}, {x:850,y:425}, {x:990,y:200} ],
  // 5 — Shadowfen: sweeping curves with deep dips
  [ {x:10,y:200}, {x:200,y:525}, {x:413,y:100}, {x:625,y:525}, {x:825,y:150}, {x:990,y:425} ],
  // 6 — Ashwood: fast aggressive switchbacks
  [ {x:10,y:525}, {x:213,y:75}, {x:400,y:525}, {x:575,y:100}, {x:750,y:475}, {x:990,y:125} ],
  // 7 — Cursed Ruins: deep crossing diagonals
  [ {x:10,y:125}, {x:250,y:525}, {x:463,y:100}, {x:663,y:500}, {x:850,y:100}, {x:990,y:350} ],
  // 8 — Demon Gate: maximum chaos zigzag
  [ {x:10,y:375}, {x:175,y:75}, {x:350,y:525}, {x:525,y:75}, {x:700,y:525}, {x:875,y:75}, {x:990,y:300} ],
  // 9 — Volcano Summit: long winding approach
  [ {x:10,y:300}, {x:225,y:75}, {x:413,y:475}, {x:588,y:125}, {x:738,y:525}, {x:900,y:175}, {x:990,y:400} ],
];

function getLevelPath(levelId) {
  return CAMPAIGN_LEVEL_WAYPOINTS[levelId];
}
