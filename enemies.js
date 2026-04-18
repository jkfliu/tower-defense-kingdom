// ─── enemies.js ───────────────────────────────────────────────────────────────
// Enemy factory and per-frame update logic.
// Reads globals: ENEMY_BASE_HP, ENEMY_HP_SCALE, ENEMY_BASE_SPEED, ENEMY_SPEED_SCALE,
//   wave, path, cx, cy, lives, enemies.

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
