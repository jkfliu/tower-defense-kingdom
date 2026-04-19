# Tower Defense Kingdom — TODO

## Design decisions
- [x] Decide on path style — free-angle pixel-space waypoints (implemented)

## Gameplay depth
- [ ] Enemy variety within waves — e.g. fast "scout" (low HP) vs. slow "tank" (high HP)
- [ ] Vary enemy spawn timing — random intervals instead of fixed SPAWN_MS spacing
- [x] Multiple turret types — Arrow (Archers/Rangers/Longbow) and Mage (Elven mage/wizard/sorcerer)
- [x] Gold/economy system — starting gold, earn on kills, spend to place turrets
- [x] Turret tiers (Archers/Rangers/Longbow, Elven mage/wizard/sorcerer) — upgrade during game
- [x] Sell turrets for 50% refund
- [x] Place/upgrade turrets mid-wave
- [x] Waves per level scale with level number (level 1 = 1 wave, level 5 = 5 waves)
- [x] Tower exclusion zone — placed tower blocks all 8 adjacent cells

## Kingdom map & campaign
- [ ] Enemy scaling across loops (each full loop +40% HP/speed)
- [x] Parchment-style kingdom overview map with 10 level nodes (L-shape layout)
- [x] Fixed path per level (Forest Outpost → Volcano Summit)
- [x] Level progression — nodes appear progressively; sparkle trail reveal animation
- [x] Gold resets per level (scales 100 → 180 across levels)
- [x] Multi-wave support per level — waves = level number (capped at 5)
- [x] Per-level enemy pools — dark elves/demons from level 5+
- [x] Biome backgrounds — grass (0-4), desolate (5-8), volcanic obsidian (9)
- [x] Level-select popup — name, description, difficulty picker, Begin button
- [x] Victory/Level Complete screen with › button back to map
- [x] Quit to Map button during gameplay

## Feel & polish
- [ ] High score persistence via localStorage
- [ ] Saveable game state — 3 save slots via localStorage (currentLevel, campaignLoop, score)
- [ ] Perspective tilt view — board tilts toward viewer; towers/enemies stand up vertically (plan ready)
- [x] Wave preview panel — enemy type, count, HP, speed; closeable; shown at top-left
- [x] Enemy death particles — blood splatter with blobs, droplets, gravity-arced streaks
- [x] Arrow visuals — shaft, arrowhead, 3-line fletching, shadow
- [x] Arrow arc — upward launch kick + gravity, leads target based on flight time
- [x] Arrow vs orb behaviour — arrows land near target; orbs fly past
- [x] Arrow sound — bowstring twang + whoosh (replaces laser)
- [x] Mage orb visuals — tiered: dim purple / blue-purple with glow / white-blue with pulsing aura
- [x] Mage shot sounds — tiered: soft sine / two-osc chord / three-osc swell
- [x] Enemy walking legs — alternating stride animation driven by distance traveled
- [x] Enemies face direction of travel with perspective Y-scale
- [x] Path start/end markers — two flanking green/red flags at each end
- [x] Free-angle diagonal paths — all 5 levels use diagonal waypoints; stroke-based path rendering

## UX
- [x] Wave preview — show incoming enemy count and type before wave starts
- [x] Retheme enemies — Goblin (wave 1), Orc (2), Troll (3), Dark Elf (4), Demon (5)
- [x] Two-card tower placement popup — Arrow vs Mage side-by-side with icons and costs
- [x] Turret upgrades — click turret between waves or mid-wave
- [x] Start Game / New Campaign / Pause buttons
- [x] Visual tier differentiation — scale, colour, flags per tier; mage staff orb glows on fire
- [x] Preview page (preview.html) — dictionary of all levels, towers, and enemies with stats
- [x] Cinzel serif font throughout (UI + all canvas text)

## Technical
- [x] Free-angle paths — pixel-space waypoints, `worldToScreen`-ready, `buildPathSet` with configurable radius
- [x] Full file restructure — constants, audio, path, enemies, towers, ui, map, theme, game
- [x] Grid expanded to 50×30 (1000×600 canvas), CELL=20
- [x] Per-bullet-type speeds — ARROW_SPEED and ORB_SPEED independently tunable
- [x] Debug mode toggle — 1 enemy per wave for fast testing
- [ ] Refactor (identified via architecture review):
  - [ ] Extract resetMapCamera(), pointInRect(), canvasXY() helpers
  - [ ] Deduplicate DIFF_LABELS/DIFF_COLORS (defined 3× in map.js)
  - [ ] Extract drawTowerBase() + drawTierFlags() (~90 lines duplicated between archer/mage)
  - [ ] Use ENEMY_RADIUS const in theme.js draw code (currently hardcodes CELL*0.27)
  - [ ] Reuse t.angle instead of recomputing atan2 in towers.js
  - [ ] Cache segLen per path segment in drawSmoothPath (computed twice)
  - [ ] Cache DOM element refs in ui.js (getElementById called per-frame)
  - [ ] Add resetPopups() helper (4 duplicate popup-clear blocks)
  - [ ] Fix missing initGame resets: mapPopup, _victoryBtnRect, wavePreviewDismissed
  - [ ] Merge #mute-btn / #debug-btn into shared .hud-toggle CSS class
