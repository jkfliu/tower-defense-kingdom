// ─── enemies.js ───────────────────────────────────────────────────────────────
// Enemy factory and per-frame update logic.
// Reads globals: ENEMY_BASE_HP, ENEMY_HP_SCALE, ENEMY_BASE_SPEED, ENEMY_SPEED_SCALE,
//   wave, path, lives, enemies.

function makeEnemy() {
  const hp = ENEMY_BASE_HP + (wave - 1) * ENEMY_HP_SCALE;
  const seg0len = Math.hypot(path[1].x - path[0].x, path[1].y - path[0].y);
  return {
    type:          wave,
    pathIndex:     1,         // index of destination waypoint
    distRemaining: seg0len,   // px left until reaching path[pathIndex]
    dist:          0,         // total px traveled (for animation)
    hp,
    maxHp: hp,
    speed: ENEMY_BASE_SPEED + (wave - 1) * ENEMY_SPEED_SCALE,
    x:      path[0].x,
    y:      path[0].y,
    facing: Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x),
    alive:  true,
  };
}

function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    let stepPx = e.speed * dt;
    e.dist += stepPx;

    while (stepPx > 0 && e.alive) {
      if (stepPx >= e.distRemaining) {
        stepPx -= e.distRemaining;
        e.pathIndex++;
        if (e.pathIndex >= path.length) {
          e.alive = false;
          lives = Math.max(0, lives - 1);
          break;
        }
        const prev = path[e.pathIndex - 1], curr = path[e.pathIndex];
        e.distRemaining = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        e.x = prev.x;
        e.y = prev.y;
      } else {
        e.distRemaining -= stepPx;
        stepPx = 0;
      }
    }

    if (e.alive) {
      const prev = path[e.pathIndex - 1], curr = path[e.pathIndex];
      const segLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const t = segLen > 0 ? 1 - e.distRemaining / segLen : 0;
      e.x = prev.x + (curr.x - prev.x) * t;
      e.y = prev.y + (curr.y - prev.y) * t;
      const fdx = curr.x - prev.x, fdy = curr.y - prev.y;
      if (fdx !== 0 || fdy !== 0) e.facing = Math.atan2(fdy, fdx);
    }
  }
  enemies = enemies.filter(e => e.alive);
}
