// ─── towers.js ────────────────────────────────────────────────────────────────
// Turret factory, placement validation, and per-frame update logic.
// Reads globals: ARROW_TIERS, MAGE_TIERS, getTierTable, TIER_ORDER, CELL,
//   FIRE_ANIM_DECAY, ARROW_SPEED, ORB_SPEED,
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
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  if (pathSet.has(`${row},${col}`)) return false;
  for (const t of turrets) {
    if (Math.abs(t.row - row) <= 1 && Math.abs(t.col - col) <= 1) return false;
  }
  return true;
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
          const speed = ORB_SPEED;
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
          const arcKick    = nearestDist * 3.15;
          const flightTime = nearestDist / ARROW_SPEED;
          const aimX = nearest.x + Math.cos(nearest.facing) * nearest.speed * flightTime;
          const aimY = nearest.y + Math.sin(nearest.facing) * nearest.speed * flightTime;
          const aimAngle = Math.atan2(aimY - t.y, aimX - t.x);
          bullets.push({
            x: t.x, y: t.y,
            px: t.x, py: t.y,
            vx: Math.cos(aimAngle) * ARROW_SPEED,
            vy: Math.sin(aimAngle) * ARROW_SPEED - arcKick,
            originX: t.x, originY: t.y,
            targetX: aimX + (Math.random() - 0.5) * 12,
            targetY: aimY + (Math.random() - 0.5) * 12,
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

    if (b.kind === 'arrow') b.vy += 600 * dt;  // gravity for arc
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.kind === 'arrow') {
      // Terminate when arrow has passed its target landing spot
      const dtx = b.targetX - b.x, dty = b.targetY - b.y;
      const dot = dtx * b.vx + dty * b.vy;
      if (dot <= 0) { b.done = true; continue; }
    } else {
      // Orbs fly until they exceed range — can pass the target
      const dx0 = b.x - b.originX, dy0 = b.y - b.originY;
      if (dx0 * dx0 + dy0 * dy0 > b.range * b.range) { b.done = true; continue; }
    }

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
          spawnParticles(e.x, e.y);
        }
        b.done = true;
        break;
      }
    }
  }

  bullets = bullets.filter(b => !b.done);
  enemies = enemies.filter(e => e.alive);
}

const BLOOD_COLORS = ['#8b0000', '#a00000', '#c00010', '#6b0000', '#b01020'];

function updateParticles(dt) {
  for (const p of particles) {
    p.x    += p.vx * dt;
    p.y    += p.vy * dt;
    p.vx   *= p.drag;
    p.vy   *= p.drag;
    p.vy   += 180 * dt;  // gravity
    p.r    *= 0.97;
    p.life -= p.decay * dt;
  }
  particles = particles.filter(p => p.life > 0);
}

function spawnParticles(x, y) {
  // large slow blobs
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 40;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      r: 5 + Math.random() * 4,
      life: 1.0, decay: 1.2 + Math.random() * 0.6,
      drag: 0.90,
      color: BLOOD_COLORS[Math.floor(Math.random() * BLOOD_COLORS.length)],
      streak: false,
    });
  }
  // fast small droplets
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 100;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      r: 1.5 + Math.random() * 2,
      life: 1.0, decay: 2.0 + Math.random() * 1.5,
      drag: 0.86,
      color: BLOOD_COLORS[Math.floor(Math.random() * BLOOD_COLORS.length)],
      streak: false,
    });
  }
  // elongated streaks
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 80;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      r: 2 + Math.random() * 2,
      life: 1.0, decay: 2.5 + Math.random() * 1.0,
      drag: 0.84,
      color: BLOOD_COLORS[Math.floor(Math.random() * BLOOD_COLORS.length)],
      streak: true,
    });
  }
}
