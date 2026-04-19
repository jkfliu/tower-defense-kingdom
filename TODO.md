# Sylvan Defenders — TODO

## Gameplay depth

## Kingdom map & campaign
- [ ] Enemy scaling across loops (each full loop +40% HP/speed)

## Feel & polish
- [ ] Perspective tilt view — board tilts toward viewer; towers/enemies stand up vertically (plan ready)

## UX
- (all done)

## Technical
- [ ] Save slots — 3 slots via localStorage (currentLevel, campaignLoop, score)
- [ ] High score persistence via localStorage



---

## Completed

### Gameplay depth
- [x] Multiple turret types — Arrow (Archers/Rangers/Longbow) and Mage (Elven mage/wizard/sorcerer)
- [x] Enemy variety — per-type speed/HP modifiers (Goblin fast/weak, Troll/Demon slow/tanky)
- [x] Vary enemy spawn timing — random intervals between 600–1800ms
- [x] Arrow arc trajectory — ballistic lob with X-axis hit detection; target-reference tracking
- [x] Gold/economy system — starting gold, earn on kills, spend to place turrets
- [x] Turret tiers — upgrade during game; sell for 50% refund
- [x] Place/upgrade turrets mid-wave
- [x] Waves per level scale with level number (capped at 5)
- [x] Tower exclusion zone — placed tower blocks all 8 adjacent cells

### Kingdom map & campaign
- [x] Parchment-style kingdom overview map with 10 level nodes (L-shape layout)
- [x] Fixed path per level (Forest Outpost → Volcano Summit)
- [x] Level progression — nodes appear progressively; sparkle trail reveal animation
- [x] Gold resets per level (scales 100 → 180 across levels)
- [x] Per-level enemy pools — dark elves/demons from level 5+
- [x] Biome backgrounds — grass (0-4), desolate (5-8), volcanic obsidian (9)
- [x] Level-select popup — name, description, difficulty picker, Begin button
- [x] Victory/Level Complete screen with › button back to map
- [x] Quit to Map button during gameplay

### Feel & polish
- [x] Wave preview panel — enemy types from level pool, count, HP, speed; closeable
- [x] Enemy death particles — blood splatter with blobs, droplets, streaks
- [x] Arrow visuals — shaft, arrowhead, 3-line fletching, shadow, arc + gravity
- [x] Mage orb visuals — tiered: dim purple / blue glow / white pulsing aura
- [x] Arrow + mage shot sounds — tiered
- [x] Enemy walking legs + facing direction of travel
- [x] Path start/end markers — flanking green/red flags

### UX
- [x] Retheme enemies — Goblin, Orc, Troll, Dark Elf, Demon
- [x] Two-card tower placement popup — Arrow vs Mage side-by-side
- [x] Turret upgrade + sell popup
- [x] Start Game / New Campaign / Pause / Quit to Map buttons
- [x] Visual tier differentiation — scale, colour, flags per tier
- [x] Game dictionary page (dictionary.html)
- [x] Cinzel serif font throughout
- [x] Debug mode toggle — 1 enemy per wave for fast testing
- [x] Restart Level / New Campaign confirm dialog — context-aware title, canvas-drawn parchment card
- [x] Map hint bar with clickable Reset View

### Technical
- [x] Full file restructure — constants, audio, path, enemies, towers, ui, map, theme, game
- [x] Grid 50×30, 1000×600 canvas, CELL=20
- [x] Free-angle diagonal paths — pixel-space waypoints, stroke-based rendering
- [x] Per-bullet-type speeds — ARROW_SPEED and ORB_SPEED independently tunable
- [x] Refactor — drawTowerBase/drawTierFlags, resetPopups, resetMapCamera, canvasXY, cached DOM refs, .hud-toggle CSS, ENEMY_RADIUS
