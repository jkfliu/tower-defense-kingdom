// ─── path.js ──────────────────────────────────────────────────────────────────
// Path generation. Reads globals: COLS, ROWS, MIN_PATH_CELLS.

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
