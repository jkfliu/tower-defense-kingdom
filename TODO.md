# Tower Defense Kingdom — TODO

## Design decisions
- [ ] Decide on path style — user-modifiable (Radiant TD) vs. multipath (Kingdom Rush)

## Gameplay depth
- [x] Multiple turret types — Arrow (Archers/Rangers/Longbow) and Mage (Elven mage/wizard/sorcerer)
- [ ] Enemy variety within waves — e.g. fast "scout" (low HP) vs. slow "tank" (high HP)
- [x] Gold/economy system — starting gold, earn on kills, spend to place turrets
- [x] Turret tiers (Archers/Rangers/Longbow, Elven mage/wizard/sorcerer) — upgrade during game
- [x] Sell turrets for 50% refund
- [x] Place/upgrade turrets mid-wave
- [x] 5 waves with scaling enemy HP, speed, and gold rewards

## Kingdom map & campaign
- [ ] Parchment-style kingdom overview map with 5 level nodes
- [ ] Fixed path per level (Forest Outpost, River Crossing, Mountain Pass, Ruined Village, Castle Siege)
- [ ] Level progression — complete a level to unlock the next node
- [ ] Gold resets per level (scales from 100 → 180 across levels)
- [ ] Enemy scaling across loops (each full loop +40% HP/speed)
- [ ] Multi-wave support per level (currently 1 wave; architecture supports more)

## Feel & polish
- [x] Enemy death particles — expanding circles on kill
- [x] Arrow visuals — shaft, arrowhead, 3-line fletching, shadow
- [x] Arrow sound — bowstring twang + whoosh (replaces laser)
- [x] Mage orb visuals — tiered: dim purple / blue-purple with glow / white-blue with pulsing aura
- [x] Mage shot sounds — tiered: soft sine / two-osc chord / three-osc swell
- [ ] High score persistence via localStorage
- [ ] Wave preview — show incoming enemy count and type before wave starts

## UX
- [x] Retheme enemies — Goblin (wave 1), Orc (2), Troll (3), Dark Elf (4), Demon (5)
- [x] Two-card tower placement popup — Arrow vs Mage side-by-side with icons and costs
- [x] Turret upgrades — click turret between waves or mid-wave
- [x] Pause button
- [x] Start Game / New Game buttons
- [x] Visual tier differentiation — scale, colour, flags per tier; mage staff orb glows on fire
- [ ] Wave preview — show incoming enemy count and type before wave starts

## Technical
- [x] Full file restructure — constants, audio, path, enemies, towers, ui, map, theme, game
- [ ] Allow free-angle paths — drop grid, use pixel-space waypoints at any angle
