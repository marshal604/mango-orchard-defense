# Feel and progression reference: 蔣出來 stage 1

Companion to `reverse-engineering.md` (mechanics/numbers) and `ui-reference.md` (visuals/CSS/layout).
This file covers **feel** (motion, feedback, pacing) and **progression** (guidance, run arc, meta).
Source: shipped chunks only (scene `js3/04-6owp9ax0ta`, HUD/sfx `js3/3px9jeuk1v0_z`, config `2_2pmjwoe9np8`,
map `0m92hv491eos7`, screens `game.pretty.js`). Original names are used below; map them through `CONTEXT.md`.

**[O]** = observed in code (function / constant quoted). **[I]** = inferred.

---

## 1. Motion and feedback

### Loop and timing
- [O] `update(t, e)`: `dt = Math.min(e/1000, 0.1)`, accumulated into `this.now`. All timers (cooldowns, poison,
  haste, trap lock) are seconds-based on `dt`, so the game is frame-rate independent; a hitch longer than 100 ms
  slows the world instead of teleporting it. Nothing runs until `started` (bus `go`) and stops on `finished`.
- [O] Phaser `type: AUTO`, `pixelArt: false`, `antialias: true`, arcade physics (`overlapBias: 16`, no gravity),
  canvas sized `clientWidth * dpr` (dpr capped by `VIEW.maxPixelRatio = 2`) with `scale.zoom = 1/dpr` (crisp on retina).
- [O] HUD state is pushed to React every `UI.hudIntervalMs = 100` ms (`emitHud`), not every frame. Timer display polls every 250 ms.

### Player physics
- [O] `createPlayer`: `physics.add.sprite`, origin (0.5, 1), `SPRITE_SCALE 0.5`, `setCollideWorldBounds`.
  Body is a **feet box** `PLAYER.bodyWidth 24 x bodyHeight 12` (divided by scale), bottom-centred; re-centred every
  frame in `updatePlayer` (`g.setOffset(...)`) because frame sizes differ. Collides with `obstacles` (building zones
  `bodyFrac {w:0.85, h:0.5}`, tree trunk zones `TREE.bodyFrac 0.1`).
- [O] `readInput`: keys WASD/arrows or joystick (`registry moveInput`), vector normalised only when length > 1
  (analog joystick allows slow walk; `JOYSTICK.deadZone 0.15`, radius 48).
- [O] `setVelocity(dir * speed)` directly: **no acceleration, no friction** (instant start/stop, arcade feel).
  Speed `playerSpeed(levels)` = 270 x (1 + 0.2 shoes) x slow mult x smoker 1.5.
- [O] Player keeps moving while attacking (velocity is set before the attack check, no root on swing).
- [O] `paradeBlock`: walkers within `touchRadius 30` remove the inward velocity component and push out with
  `(30 - d) * pushGain 12`; after `blockSec 5` of contact you get `passSec 3` of free passage; toast "被洋流擋住了！" once.

### Camera
- [O] `e.startFollow(this.player, true)` - roundPixels on, **default lerp 1 (hard lock, no smoothing, no deadzone)**.
- [O] Zoom `dpr * VIEW.zoom 0.7`. Bounds = `groundRect` = world inflated by 1024 px on every side, so the camera never
  stops at the map edge (background colour `0x01215B` shows past the edge).
- [O] `fitCamera()`: follow offset `(topCover - menuSheet)/2 / zoom` so the player stays centred in the *visible*
  area when the HUD covers the top and when a building menu (`UI.menuSheetHeight 440`) covers the bottom; bounds
  height also grows by the sheet height. Called on bus `menu` and `topCover`.
- [O] Only shake: `hurtPlayer` -> `cameras.main.shake(80, 0.004)`. No shake on kills, felling, nest, boss.
- Note: remake `scene.ts` uses `startFollow(player, true, 0.15, 0.15)`; original is a hard lock.

### Depth sorting
- [O] Everything with origin (0.5, 1) uses `setDepth(sprite.y)` every frame (player, rats, workers, parade, customers).
- [O] Stumps and destroyed nests drop to `y - 1000` (always under walkers). Piles: icon depth `y`, label `y+1`.
  Pads drawn at depth -5. World-space UI: guide arrow/label and float text `1e6`, hp bar `1e6-1`, king bar `1e6-2`,
  burn labels `1e6-3`, building name plates `1e6-4`.

### Animation
- [O] `ANIM_FPS = { walk: 8, attack: 12, idle: 2 }`, `FRAMES = 4`, `DIRS = down, up, left, right` (left and right
  are separate art; `setFlipX(false)` while walking).
- [O] Facing (`updatePlayer`): only updated while input is non-zero; `|x| > |y|` -> left/right, else up/down
  (pure diagonals pick vertical). Idle = `anims.stop()` + `walk_<facing>_0` texture (no idle animation for player).
- [O] **Attack anim is tied to the weapon interval**: on swing `anims.play({ key: 'player_attack_<art>', frameRate:
  frames.length / interval, repeat: 0 })` -> exactly one 4-frame swing per cooldown, so faster weapons visibly swing
  faster and back-to-back swings loop seamlessly. Art per tier: `axe`, `chainsaw`, `harvester` (`WEAPON_ART`).
- [O] Swing flip: `attackFlip = target.x < player.x`; while `now < swingUntil` the attack pose and flip win over walking
  (you can strafe while swinging and stay facing the target).
- [O] **Impact timing**: `pendingHit.at = now + interval * COMBAT.impactAt (0.5)`; damage lands mid-swing. If the
  target died/left meanwhile it still resolves on that target (`hit` checks `alive`).
- [O] Workers mirror this: `worker_chop` at `frames / workerInterval`, `hitPending` resolves at the same 50 %.
- [O] Rats: walk 8 fps; attack is 2 frames at `attack/2 = 6` fps, looped while in bite range; flip toward target
  (big-rat art is mirrored, hence `e.big && !e.king ? d.x < r.x : d.x > r.x`). Wanderers `anims.stop()` while pausing.
  Customers/riders: 2-frame idle at 2 fps, staggered `startFrame`.

### Hit and death feedback
- [O] `flash(sprite)`: `setTintFill(0xffffff)` for 60 ms (every hit, all targets, incl. burn ticks and workers).
- [O] Tree hit (not lethal): tween `x: t.x + 2`, 40 ms, `yoyo`, `repeat 1` (two quick wiggles, 160 ms).
- [O] **No hit-stop, no knockback, no particles, no damage numbers** on normal hits. Juice = white flash + wiggle + sfx.
- [O] `fellTree`: instant texture swap to `stump_<0..5>` (random of 6), rescaled to `max(36, 0.3*h)` px tall, depth
  `y - 1000`, trunk body destroyed (walkable).
- [O] `killRat`: tween `alpha 0` over 200 ms then destroy. King kill adds float "打倒老鼠王！".
- [O] `destroyNest`: tween `alpha 0.25, scaleY 0.4*base` 250 ms (squashed rubble stays); `respawnNest` tweens back 400 ms.
  Nest hp bar (48 px gold) redrawn on each hit.
- [O] Player hurt: red tint `0xff5040` for 0.12 s (`hurtFlashUntil`), then status tints persist: poison `0x9cff6a`,
  slow `0x8FB8FF`. Floats "中毒！" (green) / "變慢！" (blue) only on first application.
- [O] `die()`: velocity 0, `setAlpha(0.4)`, anims stop, aggro dropped (no fade tween, instant ghost look).
  `revive()`: alpha 1, `invulnerableUntil = now + 1.5` (no blink effect).
- [O] Overhead hp bar `drawPlayerBar`: 54x5 px, green > 50 %, yellow > 25 %, red below; hidden when dead/trapped.

### Float text
- [O] `floatText(x, y, text, color, ms = 800)`: 15 px pixel font, black stroke 4, origin (0.5, 1), tween `y - 26` +
  `alpha 0`, `Quad.easeOut`. Colours: gold `#F8B800` money/quests, white `#FCFCFC` loot, `#FF8A3D` burn, `#CFCFCF` smoke.
  Long ones: "需要電鋸" 1200 ms, "任務完成！" 1400 ms.

### Loot and selling
- [O] `giveLoot`: loot goes **straight into the bag** (no flying pickup). Float `+N 木/肉` at kill point - 40 px for
  the amount that fit; the overflow becomes a pile on the spot.
- [O] `dropPile`: merges into an existing pile within 24 px; visual = 22 px icon (meat icon if any meat) + "×N"
  label. Picked up automatically within `pickupRadius 28` while the bag has room (`takePile`, meat first).
- [O] `updateBase` on the stall pad: `while (sellCd <= 0 && bagUsed > 0)` sells one item per `sellInterval`
  (0.15/0.08/0.04 s), meat first. Each sale calls `handOver`: an 18 px item icon tweens from player head to the
  front customer's head in **150 ms** (icons throttled to one per 60 ms). Customer leaves after
  `buysPerCustomer 3`: tween `(-20, +70)`, fade, `leaveMs 450`; queue (4 people, spacing 34) steps forward `stepMs 160`;
  a new customer slides in from -160 px with fade-in. Money float "+$N" above the stall is **aggregated every 0.3 s**.
- [O] Workers sell instantly on reaching the stall pad (float "+$N" over the worker), no customer animation.
- [O] `delivery()`: a rider sprite pops in 36 px right of the player, plays `rider_idle`, fades after 900 ms over
  300 ms; float "外送 +$N". Whole bag sold at once, wherever you are.
- [O] `buy`: float "升級！" above the building; menu row flashes (`bought` 400 ms, `buyFail` 320 ms). No buy sfx.

### Sound (all procedural WebAudio, module `13773`)
- [O] Scene hooks: `sfx.chop(lethal)` and `sfx.ratHit(lethal)` on **player** hits only (workers are silent),
  throttled 80 ms, lethal adds a low thud / two-note blip; `sfx.hurt()` throttled 250 ms; `sfx.quest()` 3-note
  arpeggio on tutorial step; `sfx.trophy()` when a trophy card shows. `levelUp`, `shoot`, `flame` exist but are stage 2.
- [O] BGM: 64-step square+triangle chiptune loop, step 0.227 s, starts on `go`, stops on unmount; `duck()` during
  revive video, `suspend()` on pause; muted flag in `localStorage jcl_muted`. Audio unlocked by the intro "開始" tap.

---

## 2. Guidance and goals

### Intro and countdown
- [O] Every run: `GoalOverlay` "通關目標 / 盡快打倒老鼠王" with king art and bullets (king in SW corner; follow the
  top-left quest + gold arrow; bites poison + slow, upgrade weapon and armor first; trees/rats make money, nests give
  bounty + temporary double attack speed; king hp N). Button "開始" -> `sfx.unlock()`.
- [O] `CountdownOverlay` 3, 2, 1 (800 ms each) then "出發！" (500 ms); then `RunTimer.start()`, bus `go`, `startBgm()`.

### Tutorial state machine (`advanceTutorial` / `computeGuide`, module `82891`)
Runs only if `localStorage jcl_tutorial_done` is unset (set by `markTutorialDone` on first win). Otherwise
`tutorialProgress = TUTORIAL_STEPS` and there is **no quest panel, but the arrow still points at the king** all run.

`refreshGuide()` runs every frame: `advanceTutorial` advances `progress` past every step whose `done()` is true
(can skip several at once). On advance: float "任務完成！" (last: "任務完成！去打老鼠王"), 1400 ms, + `sfx.quest()`.

| step (panel "任務 n/6") | title | done when | arrow target |
|---|---|---|---|
| 1 | 砍樹、打老鼠，裝滿背包 (detail shows bag x/y) | bag >= 85 % or sold once | none |
| 2 | 回收購攤賣掉 (detail changes on pad: "站著別動…") | bag empty, or sold once and off the pad | stall |
| 3 | 到招聘站請一個伐木工 | lumberjack >= 1 | mill **only if money >= price**, else none + "先存到 $X（目前 $Y）" |
| 4 | 到工具場升級武器 | weapon >= 1 | tools (same money gate) |
| 5 | 到商店加大背包 | bag >= 1 | shop (same money gate) |
| 6 final | 賺錢、提升裝備等級，打敗老鼠王 / "老鼠王在地圖西南角，跟著金色箭頭走" | - | king |

- [O] Reminder override (tutorial only): bag >= 85 %, not on stall pad, not on step 2, king not chasing ->
  red pulsing "提醒 / 背包快滿了！ 回收購攤賣掉(，或等外送員來收)", arrow to stall.
- [O] Final step `tip`: first track in `suggestOrder` (weapon, armor, bag, lumberjack, catcher, price, range, shoes,
  window, workerTool, cart, delivery) that is not maxed **and affordable** -> "可升級：工具場・武器 $300". The open
  building menu scrolls to and highlights that row (`quest` prop). `warn` = bag-near-full line.
- [O] `updateGuide()`: gold triangle (fill `0xf8b800`, black stroke 3) orbiting the player's chest at radius
  `GUIDE.arrowRadius 56`, pointing at the target; building/king name label at radius ~86. Hidden within
  `arrowHideDist 220` of a pad, `KING.arrowMinDist 280` of the king, when dead, or king dead.

### Zone banners, toasts, notices
- [O] Zone change (not at spawn) -> `ZoneBanner` 1500 ms: "進入危險區域 ★★ / 傷害 ×2 掉落 ×2" on red, or
  "進入安全區域" on black. Danger = reward: the same multiplier is shown for damage and drops.
- [O] Toasts (2200 ms, non-blocking, teach by doing): "大樹要電鋸才砍得動：到工具場升級武器" (+ float "需要電鋸" on the
  tree, max every 2 s); nest destroyed "+$200, 攻擊速度 ×2（10 秒）"; "老鼠王發現你了！被咬會中毒、變慢" (once);
  worker down (hell); parade blocked; hot-spring ability; parasol free.
- [O] Notices with `hold: true` (milestones, parasol, smoking booth, hot spring, grandma "大炎上") and **every trophy
  unlock** go through one queue that **pauses the World scene and the run timer** (`scene.pause("World")`,
  `RunTimer.pause()`, joystick zeroed) until "繼續". `next` chains a follow-up notice. Trophies earned after the win
  are deferred to the result screen (`finishTrophies`).
- [O] Building menus open automatically on the pad and do **not** pause ("走離建築會自動關閉．選單開著計時不停").
  Death choice and revive video do **not** pause the timer ("計時沒有停喔"). Manual pause / tab hidden does.

---

## 3. Progression arc (normal difficulty)

Distances [O, map module]: stall (2092, 2774), mill (2915, 2774) ~820 px east, tools (3620, 1030) ~2350 px NE
in the north zone, shop (4041, 2620) ~1950 px east, king (260, 3010) ~1830 px west. At 270 px/s: mill 3 s, shop
7-8 s, tools 9-10 s, king 7 s (straight line). Map trees [O]: base 93 small; north 59 small + 109 big; SW 75 small;
SE 9 small. Nearest small trees ~175-330 px from the stall; nearest big tree ~1570 px.

Estimated run [I] (numbers from config, walking overhead guessed):
- **0:00-0:45** Base zone small trees: axe I 1.5 dmg / 0.45 s -> 2 hits, ~1 s per tree incl. walking = ~$5/s.
  Bag 30 fills in ~35 s; selling 30 items takes 4.5 s with the customer conveyor -> first sale ~$150.
  Trophy cards first_tree, first_sale (and first_rat if a base rat aggroes) interrupt early on purpose.
- **~0:50** Lumberjack ($120) at the mill next door. A worker (1 dmg / 0.7 s, bag 5, 160 px/s) earns roughly
  $1/s -> pays back in ~2 min; real value is cumulative + cart upgrades. Workers' trees count toward unrest.
- **~1:30** Second bag -> walk north to tools for axe II ($150). Then shop bag ($80). Tutorial ends ~2:00-2:30.
- **~3:00-4:00** Chainsaw I (cumulative $450): big trees in the north (hp 10, 10 wood with ×2 = $50 each,
  ~1.3 s to fell) - the big jump in income. Bag 30 = 3 big trees, so bag levels and **delivery ($250, sells the
  whole bag every 20 s anywhere)** become the bottleneck fixes. North rats (big: 8 meat = $64, bite 14 + poison)
  and 3 nests ($200 each) are reachable now.
- **~4:00-6:00** Unrest at 100 trees (player + workers) hits around here if you tree-farm; rat_hero (60 kills)
  needs deliberate hunting, easiest in SW (60 small rats, ×3 drops) or with catchers.
- **King**: hp 120, no zone multiplier, bite 12.48 / 1.3 s + poison 3 dps 4 s + slow ×0.6 -> ~12 dps taken vs
  hp 170 = ~14 s to live. Player dps: axe I 3.3 (36 s, impossible), chainsaw I 8.3 (14.4 s, coin flip), +armor 1
  (hp 212) comfortable; chainsaw II 12.1 (10 s); harvester I 18.3 (6.5 s). Nest haste ×2 (5 nests in SW) halves it.
  King regenerates 3/s only when not chasing, so retreats are punished. Expected first clear ~8-12 min;
  `speedrun` trophy = normal <= 300 s, i.e. the designed "expert" line is chainsaw + armor + a nest haste by ~4:30.

### Milestone design intent [I]
`MILESTONES`: 60 rats -> permanent 20 % discount (carrot for fighting); 100 trees -> workers ×2 slower and delivery
×1.5 slower (stick for passive tree farming, and hiring lumberjacks accelerates it). Together they push the player
from safe base farming toward the dangerous zones and combat, and create a route choice (`no_tree` gold trophy).

### Trophies (module `83186`; stored per device in localStorage; card pauses game)
- Gold: `max_weapon`, `no_death`, `speedrun` (normal <= 300 s), `king_hell`, `clean_run` (no grandma/hotpot/smoking/
  parasol), `no_tree` (workers count). Platinum `platinum` auto when all other stage-1 trophies are owned.
- Silver: `rat_hero` (60 rats), `unrest` (100 trees), `flame` (ignored grandma 3 passes -> parade), `sponsor`
  ($2000 donated), `chainsaw`, `nest_buster` (5 nests), `king_normal`.
- Bronze: `first_tree`, `first_rat`, `first_sale`, `first_nest`, `first_upgrade` (weapon), `first_worker`,
  `all_zones` (4 zones in one run), `first_down`, `smoking`, `hotpot`, `donate`, `burn_kill`, `skip_video`
  (10 lifetime downs; unlocks the revive-video skip button).

### Death and revive
- [O] `DeadOverlay` "被老鼠圍攻了": **看影片** = watch a revive clip (random of 5; close button after
  `fallbackSec 10`, or immediately once `skip_video` is owned) -> revive in place keeping bag + money;
  **不看** = respawn at spawn, bag and money zeroed. Timer keeps running either way, so death always costs time.

### After the win
- [O] `finish()`: awards king / no_death / speedrun / clean_run / no_tree, freezes the player, emits `win`;
  tutorial marked done. Result screen: king-defeat cutscene animation, then newly earned trophies revealed one by
  one; time, leaderboard rank (server-verified run log), stats rows (trees, rats, nests, earned, workers, deaths).
  Buttons: 進入下一關 (stage 2), 分享到 Threads (canvas share image: time, rank, trophy %, rats/nests/deaths), 再玩一次,
  看排行榜. Stage 2 is not hard-locked; the picker shows it as a "？" silhouette.

---

## 4. What the remake must reproduce (priority order)

1. **dt-based sim, dt clamped to 0.1 s, instant arcade velocity, feet-box collision, `y` depth sort** (`game.ts step`, `scene.ts syncPlayer/syncWorld`).
2. **Attack anim frameRate = frames / interval, impact at 50 %, swing flip toward target, move while swinging** (`combat.ts`, `scene.ts syncPlayer`). Remake currently applies damage at swing start; move it to `impactAt`.
3. **Hit juice exactly**: 60 ms white `setTintFill`, tree 2 px wiggle (40 ms yoyo x2), 200 ms enemy fade, instant stump swap, nest squash. No hit-stop (the original has none; adding it changes the feel).
4. **Selling conveyor**: one item per interval, 150 ms icon toss to the front customer, 3 buys then leave/step-forward, "+$" aggregated every 0.3 s (`customers.ts`, `renderEvent`).
5. **Guide state machine**: 5 tutorial steps + final, money-gated arrows, near-full reminder, affordable-upgrade tip, completion float + chime; orbiting arrow r=56, hide 220/280 (`meta/quest.ts`, `drawArrow`, `QuestPanel.tsx`).
6. **Blocking notices and trophy cards pause world + timer; menus, death and revive do not** (`PlayScreen.tsx`, `Dialog.tsx`).
7. **Hard-locked camera** (lerp 1), zoom 0.7, follow offset compensating HUD/menu sheet, shake only on hurt (80 ms, 0.004).
8. **Teaching toasts and zone banners** (need-saw float + toast throttled 2 s, nest bounty, king noticed once, danger ×N banner 1.5 s).
9. **Sfx on player hits/lethal, hurt, quest, trophy + looping chiptune BGM** (procedural WebAudio is enough).
10. Intro goal card + 3-2-1 countdown every run; result cutscene, trophy reveal, share, retry.
