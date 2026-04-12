# Tower Defense — TODO

## Design decisions
- [ ] Define theme
- [ ] Decide on path style — user-modifiable (Radiant TD) vs. multipath (Kingdom Rush)

## Gameplay depth
- [ ] Multiple turret types — bomb, mage, arrows, etc. (placement popup ready for future styles)
- [ ] Enemy variety within waves — e.g. fast "scout" (low HP) vs. slow "tank" (high HP)
- [x] Gold/economy system — starting gold, earn on kills, spend to place turrets
- [x] Turret tiers (Basic/Advanced/Ultimate) — upgrade during game
- [x] Sell turrets for 50% refund
- [x] Place/upgrade turrets mid-wave
- [x] 5 waves with scaling enemy HP, speed, and gold rewards

## Feel & polish
- [ ] Twinkling stars — animate star brightness over time
- [ ] Score multiplier / combo for killing enemies quickly
- [x] Enemy death particles — expanding circles on kill
- [x] Bullet trails — short fading line behind bullets instead of a dot

## UX
- [ ] High score persistence via localStorage
- [ ] Wave preview — show incoming enemy count and type before wave starts
- [x] Turret upgrades — click turret between waves or mid-wave
- [x] Pause button
- [x] Start Game / New Game buttons (no forced 4-turret placement)
- [x] Visual tier differentiation (dome colour + size + glow ring for Ultimate)

## Technical
- [x] Full refactor — named constants, split render/click handlers, unified popup helpers
