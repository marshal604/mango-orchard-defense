# Shuttle Tycoon — domain glossary

A badminton-themed remake of the stage-1 loop described in `docs/reverse-engineering.md`.
Mechanics and numbers follow that document; names follow this glossary.

| Term | Meaning | Original equivalent |
|---|---|---|
| Run | One play-through from countdown to defeating the Goose King. Score = elapsed time. | run |
| Cork | Resource from cork trees. Sold for 5. | wood |
| Feather | Resource from geese. Sold for 8. Sold before cork. | meat |
| Cork tree / Old cork oak | Small / big harvestable tree. Old oaks need a carbon racket or better. | small / big tree |
| Goose / Big goose | Small / big enemy. Big geese peck hard enough to Scrape. | rat / big rat |
| Goose nest | Spawner. Destroying it pays a bounty and grants haste. | rat nest |
| Goose King | Boss in the south-west corner. Defeating it ends the run. | Rat King |
| Bag | Carried cork + feathers, capped by bag level. | bag |
| Pile | Loot dropped on the ground when the bag is full. | pile |
| Workshop stall | Base building where queued customers buy one item at a time. | stall |
| Club house | Hires workers. | mill (招聘站) |
| Pro shop | Rackets and gear. | tools (工具場) |
| Supply store | Bag, price, selling speed, delivery. | shop (商店) |
| Pad | Circle in front of a building; standing on it activates it. | pad |
| Safe area | Area around a building where enemies cannot hurt you. | base area |
| Ball boy / Goose wrangler | Workers who collect cork / hunt geese. | lumberjack / catcher |
| Zone | One of four map regions with a danger rating (stars) that multiplies damage and drops. | zone |
| Lakeside / Wetland / Central park / Arena district | The four zones (north, SW, base, SE). | 北投 / 萬華 / 大安 / 信義 |
| Shade tent | Geese ignore you, fast regen; entering takes all cash until $2000 total is donated. | parasol |
| Locker room | Trap: locked 5 s changing into match kit, then Rush mode. | smoking booth |
| Sports drink stand | Trap: held 5 s in the tasting queue, then Hype for 30 s. | hot spring |
| Marathon | Crowd walking a road that blocks the player. | parade |
| Rally discount | 60 geese defeated -> 20% off all upgrades. | rat_hero discount |
| Park complaints | 100 cork trees felled -> workers half speed, delivery x1.5 slower. | unrest |
| Difficulty | `normal` or `hell` preset of numbers. | difficulty |

## Player and goose conditions

Every lingering effect is a sports injury or a sports mood, never poison or fire.

| Term | Code name | Meaning | Original equivalent |
|---|---|---|---|
| 破皮 Scrape | `scrape` | Pecked by a big goose / the King: hp keeps dropping for a few seconds. | poison |
| 扭到腳 Sprain | `sprain` | Bowled over by the King: move slower for a few seconds. | slow |
| 拚戰模式 Rush | `rush` | After the Locker room: faster, but stamina (hp) drains. | smoker |
| 熱血 Hype | `hype` | After the Sports drink stand: geese you hit start Molting. | burn ability |
| 掉毛 Molt | `molt` | A goose shedding feathers in fright: loses hp over time. | burning |
| 手感發燙 Hot hand | `haste` | After destroying a Goose nest: attack speed x2. | nest haste |
