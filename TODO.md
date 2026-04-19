# Tower Defense Kingdom — TODO

## Design decisions
- [x] Decide on path style — free-angle pixel-space waypoints (implemented)

## Gameplay depth
- [ ] Enemy variety within waves — e.g. fast "scout" (low HP) vs. slow "tank" (high HP)
- [x] Multiple turret types — Arrow (Archers/Rangers/Longbow) and Mage (Elven mage/wizard/sorcerer)
- [x] Gold/economy system — starting gold, earn on kills, spend to place turrets
- [x] Turret tiers (Archers/Rangers/Longbow, Elven mage/wizard/sorcerer) — upgrade during game
- [x] Sell turrets for 50% refund
- [x] Place/upgrade turrets mid-wave
- [x] Waves per level scale with level number (level 1 = 1 wave, level 5 = 5 waves)
- [x] Tower exclusion zone — placed tower blocks all 8 adjacent cells

## Kingdom map & campaign
- [ ] Enemy scaling across loops (each full loop +40% HP/speed)
- [x] Parchment-style kingdom overview map with 5 level nodes
- [x] Fixed path per level (Forest Outpost, River Crossing, Mountain Pass, Ruined Village, Castle Siege)
- [x] Level progression — complete a level to unlock the next node
- [x] Gold resets per level (scales 100 → 180 across levels)
- [x] Multi-wave support per level — waves = level number

## Feel & polish
- [ ] High score persistence via localStorage
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
- [x] Start Game / New Game / Pause buttons
- [x] Visual tier differentiation — scale, colour, flags per tier; mage staff orb glows on fire
- [x] Preview page (preview.html) — dictionary of all levels, towers, and enemies with stats

## Technical
- [x] Free-angle paths — pixel-space waypoints, `worldToScreen`-ready, `buildPathSet` with configurable radius
- [x] Full file restructure — constants, audio, path, enemies, towers, ui, map, theme, game
- [x] Grid doubled (40×24, CELL=20) for finer placement granularity
- [x] Per-bullet-type speeds — ARROW_SPEED and ORB_SPEED independently tunable
