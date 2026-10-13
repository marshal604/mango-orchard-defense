# 芒果園保衛戰 — domain glossary

An orchard-vs-Formosan-macaques remake of the stage-1 loop described in `docs/reverse-engineering.md`.
Mechanics and numbers follow that document; names follow this glossary. Code names are in `backticks`.

Every action must read naturally: the farmer knocks fruit down with a pole, rangers chase monkeys,
fruit is sold at a roadside stand. Lingering effects are everyday mishaps, never poison or magic.

| Term | Code name | Meaning | Original equivalent |
|---|---|---|---|
| Run | `Game` / `RunState` | One play-through from countdown to defeating the Monkey King. Score = elapsed time. | run |
| 芒果 Mango | `mango` | Harvested from fruit trees. Sells for 5. | wood |
| 香蕉 Banana | `banana` | Recovered from monkeys that stole it. Sells for 8; sold before mangoes. | meat |
| 果樹 / 老欉芒果樹 Fruit tree / Old tree | `tree`, `big` | Small / tall tree. Old trees are out of reach until the farmer owns pruning shears. | small / big tree |
| 獼猴 / 大公猴 Monkey / Big monkey | `monkey`, size `small` / `big` | Fruit thieves. Big monkeys scratch hard enough to make you bleed. | rat / big rat |
| 猴群據點 Monkey den | `den` | Spawns monkeys. Clearing it pays a bounty and grants Quick hands. | rat nest |
| 猴王 Monkey King | `king` | Boss deep in the south-west mountains. Defeating it ends the run. | Rat King |
| 背包 Bag | `bag` | Carried mangoes + bananas, capped by bag level. | bag |
| 地上那堆 Pile | `Pile` | Fruit dropped on the ground when the bag is full. | pile |
| 採果工具 Tool | `tool` | 竹竿 bamboo pole -> 高枝剪 pruning shears (reach old trees) -> 採果機 fruit picker. | weapon |
| 路邊水果攤 Fruit stand | `stall` | Base building; queued customers buy one item at a time. | stall |
| 農會 Farmers' association | `coop` | Hires workers. | mill (招聘站) |
| 農具行 Tool shop | `toolshop` | Tools, reach, boots, arm guards. | tools (工具場) |
| 柑仔店 Grocery | `grocery` | Bag, price, selling speed, home delivery. | shop (商店) |
| Pad | `padOf` | Circle in front of a building; standing on it activates it. | pad |
| Safe area | `inSafeArea` | Around each building; monkeys cannot hurt you there. | base area |
| 採果工 / 驅猴員 Picker / Ranger | `picker` / `ranger` | Workers who harvest small trees / chase monkeys and sell at the stand. | lumberjack / catcher |
| 宅配 Delivery | `delivery` | Courier that collects and sells the whole bag every 20 s. | delivery |
| Zone | `Zone` | Map region with a danger rating (stars) multiplying damage and drops. | zone |
| 淺山果園 / 深山猴區 / 果園村 / 市郊 | `hills` / `deep` / `village` / `town` | The four zones (north, SW, base, SE). | 北投 / 萬華 / 大安 / 信義 |
| 廟口涼亭 Pavilion | `pavilion` | Monkeys keep away, fast regen; entering takes all cash as 香油錢 until $2000 is donated. | parasol |
| 剉冰店 Ice shop | `ice` | Trap: dragged in for shaved ice 5 s, then Bellyache. | smoking booth |
| 朝天椒田 Chilli field | `chili` | Trap: coughing 5 s, then Chilli hands. | hot spring |
| 進香團 Procession | `procession` | Temple procession walking a road; it blocks the player. | parade |
| 驅猴有功 Ranger award | `discount` | 60 monkeys -> 20% off all upgrades. | rat_hero discount |
| 工人過勞 Overwork | `overwork` | 100 trees harvested -> workers half speed, delivery x1.5 slower. | unrest |
| Difficulty | `normal` / `hell` | Preset of numbers (普通 / 地獄). | difficulty |

## Player and monkey conditions

| Term | Code name | Meaning | Original equivalent |
|---|---|---|---|
| 抓傷 Scratch | `scratch` | Clawed by a big monkey / the King: hp keeps dropping for a few seconds. | poison |
| 扭到腳 Sprain | `sprain` | Knocked over by the King: move slower for a few seconds. | slow |
| 肚子痛 Bellyache | `bellyache` | After the ice shop: rushing to a toilet (faster) but losing hp. | smoker |
| 辣椒手 Chilli hands | `chili` (player) | After the chilli field: monkeys you hit become Spicy. | burn ability |
| 辣到跳腳 Spicy | `spicy` (monkey) | A monkey hit by chilli hands loses hp over time. | burning |
| 手腳俐落 Quick hands | `haste` | After clearing a den: attack speed x2. | nest haste |
