// ─── towers.js ────────────────────────────────────────────────────────────────
// Turret factory, placement validation, and per-frame update logic.
// Reads globals: ARROW_TIERS, MAGE_TIERS, getTierTable, TIER_ORDER, CELL,
//   FIRE_ANIM_DECAY, BULLET_SPEED, MAGE_BULLET_SPEED,
//   ENEMY_RADIUS, HIT_RADIUS_BONUS, PARTICLE_COUNT, GOLD_PER_KILL,
//   cx, cy, turrets, enemies, bullets, particles, wave, score, gold,
//   pathSet, ROWS, COLS, playArrowShot, playMagicShot, playExplosion, ENEMY_COLORS.

function makeTurret(row, col, tier = 'basic', kind = 'arrow') {
  const cfg = getTierTable(kind)[tier];
  return {
    row, col,
    x: cx(col), y: cy(row),
    tier,
    kind,
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
        const angle = Math.atan2(nearest.y - t.y, nearest.x - t.x);
        if (t.kind === 'mage') {
          playMagicShot(t.tier);
          const speed = MAGE_BULLET_SPEED;
          bullets.push({
            x: t.x, y: t.y,
            px: t.x, py: t.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            originX: t.x, originY: t.y,
            range:  t.range,
            damage: t.damage,
            kind:   'orb',
            tier:   t.tier,
            trail:  [],
            done:   false,
          });
        } else {
          playArrowShot();
          bullets.push({
            x: t.x, y: t.y,
            px: t.x, py: t.y,
            vx: Math.cos(angle) * BULLET_SPEED,
            vy: Math.sin(angle) * BULLET_SPEED,
            originX: t.x, originY: t.y,
            range:  t.range,
            damage: t.damage,
            kind:   'arrow',
            done:   false,
          });
        }
      }
    }
  }
}

function updateBullets(dt) {
  for (const b of bullets) {
    if (b.done) continue;
    b.px = b.x;
    b.py = b.y;

    // Update orb trail before moving
    if (b.kind === 'orb') {
      b.trail.push({ x: b.x, y: b.y });
      const maxTrail = b.tier === 'ultimate' ? 5 : b.tier === 'advanced' ? 3 : 0;
      if (b.trail.length > maxTrail) b.trail.shift();
    }

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
