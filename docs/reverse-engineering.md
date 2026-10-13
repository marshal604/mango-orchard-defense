# Reverse-engineering notes: 蔣出來 stage 1「除鼠王」

Source: https://whoismygrandpa.win/game (Next.js + Turbopack + Phaser, Supabase leaderboard).
Captured 2026-10-13 with REA (`capture_browser_scenario`, static reading of shipped chunks).
Only mechanics and numbers are reused. No original art, audio or text is copied.

Observed = read directly from shipped JS. Inferred = reasoning on top of it.

## Core loop (observed)

1. Player walks (WASD / arrows / touch drag joystick). Standing near a target auto-attacks it.
2. Targets: trees give wood, rats give meat, nests (rat spawners) give $200 + attack haste.
3. Loot goes straight into the bag; if the bag is full a pile drops on the ground to pick up later.
4. Stand on the stall pad: queued citizens buy one item at a time (meat first, then wood).
5. Spend money at three buildings (each with a pad that opens a menu) on 12 upgrade tracks.
6. Kill the Rat King in the SW corner -> run ends, time is the score.

## World (observed)

- 4800 x 3200 px, background `0x01215B`, camera zoom 0.7, max view width 480.
- 4 zones split by one horizontal divider and two vertical dividers in the bottom half:

| zone | stars | rect | damage x | drop x | rats | big rats | nests |
|---|---|---|---|---|---|---|---|
| north (北投) | ★★ | full width, top half | 2 | 2 | 24 | 20 | 3 |
| south-west (萬華) | ★★★ | bottom-left | 3 | 3 | 60 | 16 | 5 |
| south-centre (大安, base) | ★ | bottom-middle | 1 | 1 | 7 | 0 | 1 |
| south-east (信義) | ★☆ | bottom-right | 1.5 | 1.5 | 13 | 7 | 2 |

- Unknown zone -> falls back to the base zone.
- Buildings: stall + mill in base zone, tools in north, shop in south-east. Safe area around each
  building (`x-w/2-50 .. x+w/2+50`, `y-h/2 .. y+h/2+110`): rats do not bite inside, regen happens there in hell mode.
- Trees are placed procedurally with a fixed seed, min spacing 40 (64 for big trees), not within 220 px of buildings.
- Player spawns at stall + (110, 50).

## Player (observed)

speed 270 (+20% per shoes level), pickup radius 28, revive invulnerability 1.5 s.

## Difficulty (observed)

| key | normal | hell |
|---|---|---|
| hpMax | 170 | 48 |
| rat bite | 4/3 | 16/3 |
| big rat bite | 7 | 14 |
| rat sight radius | 160 | 160 |
| extra big rats | 6 | 0 |
| regen | out of combat: after 5 s, 2/s | only in safe area, 10/s |
| nest spawn every | 8 s | 2.7 s |
| bag base | 30 | 15 |
| price multiplier (upgrades) | 1 | 1.5 |
| workers can die | no | yes |
| big rat poison | 2 dps 3 s | 3 dps 4 s |
| king hp | 120 | 160 |
| king bite | 12.48 | 24.96 |
| king poison | 3 dps 4 s | 4 dps 5 s |
| king slow | x0.6 2.5 s | x0.5 3.5 s |

Zone `damageMult` multiplies enemy bite damage (inferred from name; bite code not fully read).

## Combat (observed)

Weapons (damage / interval s / can cut big tree):

| # | name | dmg | interval | big tree |
|---|---|---|---|---|
| 0 | axe I | 1.5 | 0.45 | no |
| 1 | axe II | 2 | 0.40 | no |
| 2 | chainsaw I | 3 | 0.36 | yes |
| 3 | chainsaw II | 4 | 0.33 | yes |
| 4 | harvester I | 5.5 | 0.30 | yes |
| 5 | harvester II | 7 | 0.27 | yes |

- Attack ranges by level: 48 / 64 / 80 (plus target hit radius).
- Damage lands at 50% of the swing (`impactAt`). Nest haste: attack interval / 2 for 10 s.
- Target priority: rats chasing the player > any rat > nest > tree (big trees only with a saw).
  If only a big tree is in range without a saw, toast "need chainsaw" at most every 2 s.
- The player does NOT need to stop to attack in stage 1 (attacks whenever a target is in range).

## Enemies (observed)

- Rat base speed 180. small: hp 4, meat 1, speed x0.6, hit radius 12. big: hp 9, meat 4, speed x0.7, hit radius 18.
- Bite interval 0.7 s, bite range 28. Wander radius 90 at half speed, pause 1-3 s. Leash 360 from home.
- States: wander -> chase (player within sight, or hit by someone) -> back to wander when target dead,
  target sheltered (parasol / safe area) or out of leash.
- Big rats poison. King: home (260, 3010), hp per difficulty, speed x0.55, sight 220, leash 560,
  bite every 1.3 s range 44, regen 3/s when not chasing, meat 30, clears trees within 120.
  King returns home when leashed and regenerates while returning.
- Nest: hp 13, respawn 60 s, reward $200, spawns a rat within 50 px every `nestSpawnEvery` s, max 6 alive children.

## Trees (observed)

small: hp 3, wood 1. big: hp 10, wood 5. Loot = base x zone dropMult (rounded). Felled tree becomes a stump (stays).

## Economy (observed)

- Start money 0. Sell price: wood 5, meat 8, x(1 + 0.4 x price level).
- Sell interval at the stall by window level: 0.15 / 0.08 / 0.04 s per item. Meat sold before wood.
- Bag cap = bagBase + 15 x bag level. Near-full warning at 85%.
- Armor: hpMax x (1 + 0.25 x level); buying armor also heals by the hpMax delta.
- Delivery (one level): every 20 s a rider sells the whole bag wherever the player is.
- Upgrade price = base x difficulty priceMult x (0.8 if discount perk), rounded.

| track | building | prices |
|---|---|---|
| bag | shop | 80, 160, 320 |
| price | shop | 120, 240 |
| window | shop | 200, 400 |
| delivery | shop | 250 |
| lumberjack | mill | 120, 180, 260, 360 |
| catcher | mill | 150, 220, 320 |
| workerTool | mill | 200, 350 |
| cart | mill | 300, 450 |
| weapon | tools | 150, 300, 500, 750, 1100 |
| range | tools | 150, 300 |
| shoes | tools | 100, 200 |
| armor | tools | 180, 300, 450 |

## Workers (observed)

- Lumberjacks chop small trees only; catchers hunt non-king rats. Each picks the nearest unlocked
  target to the mill, locks it, walks there (speed 160, range 36 + hit radius), hits for 1 dmg every
  0.7 s / (1 + 0.3 x workerTool level).
- Worker bag 5 / 10 / 15 by cart level; also picks up piles within 30. When full (or no targets and
  carrying something) walks to the stall pad and sells everything instantly at current prices.
- Idle workers loiter near the mill. hp 30, respawn at mill after 10 s (hell only, workers can die).

## Milestones (observed)

- 60 rats killed -> permanent 20% shop discount (notice dialog).
- 100 trees felled -> "unrest": worker interval x2, delivery interval x1.5 (notice dialog).

## Hazards (observed)

- Parasol: radius 44; rats cannot target a player under it (drops aggro); regen 10/s there.
  Entering costs ALL current cash as a donation until $2000 total donated, then free.
- Smoking booth: walking in locks the player 5 s, then 10 s of x1.5 speed while losing 2 hp/s (observed in updatePlayer).
- Hot spring / hotpot: radius 75, locks 5 s, then a 30 s ability that sets hit rats on fire (1 dps, 3 s).
- Parade: a crowd walks back and forth along a road at speed 110 and pushes / blocks the player.
- Grandma NPC at (3200, 2300): passes by 3 times with 5 s gaps (behaviour not fully read).

## Death (observed)

On death: drop aggro, show revive dialog. Two revive options: keep progress (after an ad-style video,
10 s fallback) or "lose": respawn at spawn and lose bag + money. Deaths counted in stats.

## HUD / UX (observed)

Timer, money, wood, meat, bag x/y bar, zone stars + king hp bar, sound / screenshot / pause buttons,
quest panel top-left with a gold arrow to the next suggested target. Countdown 3 s before start.
Suggested upgrade order: weapon, armor, bag, lumberjack, catcher, price, range, shoes, window, workerTool, cart, delivery.
Tutorial: first buys guided are lumberjack, weapon, bag.

## Meta (observed)

Title, nickname (random pun list + profanity filter), difficulty normal/hell, leaderboard (Supabase RPC,
server-verified run log), stats, trophies (first_tree, first_rat, all_zones, rat_hero, unrest, first_down, ...),
how-to page, result screen with share image.
