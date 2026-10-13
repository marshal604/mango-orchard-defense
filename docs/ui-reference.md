# UI / UX reference: 蔣出來 stage 1「除鼠王」

Study of https://whoismygrandpa.win/game (Next.js + Tailwind for menus/HUD, Phaser 3 for the world) to guide the
look and feel of 芒果園保衛戰. Mechanics live in `docs/reverse-engineering.md`; this file is only about visuals,
layout, animation and screen flow.

Legend:
- **[obs]** observed: read directly from their shipped CSS/JS (2026-10-13 build) or seen in a screenshot.
- **[inf]** inferred: my interpretation or a recommendation, not literally in their code.

Screenshots (internal study only, do not ship): `docs/ui-ref/`
| File | What |
|------|------|
| `m-title.png` / `d-title.png` | Title menu, 430x860 and 1440x900 |
| `m-howto.png` | 遊玩方式 (how-to) |
| `m-leaderboard.png` | 排行榜 with difficulty tabs |
| `m-stage-select.png` | 選擇關卡 |
| `m-nickname.png` | 輸入暱稱 + difficulty cards |
| `d-loading.png` | 載入中… overlay, shows the 480px column on desktop |
| `m-countdown.png` | HUD + countdown "3" |
| `m-hud.png` / `d-hud.png` | In-run HUD 2 s after start |

Not captured visually (documented from code only): the 通關目標 intro card (at +3 s the scene was still loading, the
card appeared after), pause, death/revive, notice, zone banner, toast, building sheet, result.

---

## 1. Visual system

### 1.1 Palette (CSS variables on `.game-root`) [obs]
| Var | Hex | Use |
|-----|-----|-----|
| `--g-night` | `#01215b` | Page/menu background, share-card base, outside-column fill on desktop |
| `--g-gold` | `#f8b800` | Primary accent: titles, timer, primary buttons, quest border, guide arrow, joystick knob |
| `--g-navy` | `#24188c` | Logo extrusion shadow, selected difficulty card fill |
| `--g-white` | `#fcfcfc` | Text, panel borders, secondary buttons |
| `--g-red` | `#d82800` | Danger: king HP bar, bag >= 85 %, warn-tone borders, danger zone banner |
| `--g-gray` | `#bcbcbc` | Secondary text |
| `--g-dim` | `#7c7c7c` | Hint text; also disabled buy-button fill `#7C7C7C` |

This is the NES palette (F8B800, D82800, 24188C, FCFCFC, BCBCBC, 7C7C7C are all NES PPU colours) [inf].

Extra literal colours [obs]: warn text `#FF6A4A`; poison `#9CFF6A`; slow `#8FB8FF`; burn `#FF8A3D`; smoke `#CFCFCF`;
shade `#8FE3FF`; list rows divider `#3C3C3C`; icon cell `#1C1C1C`; quest-row highlight bg `#2A2200`; leaderboard
rank 1/2/3 = gold / `#DCDCDC` / `#F0A060`; trophy tiers platinum `#9FD8FF`, gold `#F8C838`, silver `#C8CCD4`,
bronze `#D0845A`. Player HP bar > 50 % `#5CE65C` (6088284), > 25 % `#F8D800`, else `#FF4040`. Hurt tint `#FF5040`.

### 1.2 Font [obs]
```css
@font-face { font-family: "Cubic 11"; src: url(/game/fonts/Cubic_11.woff2) format("woff2"); font-display: swap; }
.game-root { font-family: "Cubic 11", PingFang TC, Noto Sans TC, sans-serif; }
```
Phaser text uses the same stack: `'"Cubic 11", "PingFang TC", "Noto Sans TC", sans-serif'`. Before creating the Phaser
game they `await document.fonts.load('16px "Cubic 11"')` so canvas text never renders in the fallback font. The share
image also awaits `document.fonts.load("48px ...")`.

- Source: **Cubic 11 / 俐方體11號** by ACh-K, https://github.com/ACh-K/Cubic-11 (fonts in `fonts/`, licence in
  `OFL.txt`). Licence: **SIL Open Font License 1.1** (derived from M+ bitmap fonts / JF Dot M+H 12). Free for
  commercial use and bundling; ship `OFL.txt` alongside; do not sell the font file alone; derivatives must stay OFL
  and must not use the reserved name. Get it from the GitHub releases, not from their site.
- It is an 11x11 bitmap design, so it looks sharpest at multiples of 11 px, but they use it at arbitrary sizes
  (11-96 px) and accept the slight softness [inf].

Text rules on `.game-root` [obs]: `word-break: keep-all; overflow-wrap: anywhere; line-break: strict;
user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; overscroll-behavior: none`.
A `<Wrap text>` helper wraps CJK at phrase boundaries (not inspected in detail) [inf].

### 1.3 Type scale (px) [obs]
| Size | Where |
|------|-------|
| 96 | Countdown digits / 出發！ (`game-logo`) |
| 88 | Title logo 蔣出來 |
| 48 (`text-5xl`) | Result 打倒老鼠王！, result time, revive logo |
| 36 (`text-4xl`) | 選擇關卡 heading, death 被老鼠圍攻了 |
| 30 (`text-3xl`) | Screen headings (排行榜, 暫停, intro 盡快打倒老鼠王) |
| 26 | Title menu items, HUD timer |
| 22 | Building sheet title, death button labels, `.game-input` |
| 18 | `.game-btn`, HUD brand 蔣出來, Phaser building name labels |
| 17 | Building-sheet row name |
| 15-16 | Body, panel text, toast-ish, `.game-btn--sm`, Phaser float text (15) |
| 13 | Secondary text, HUD bars label, row descriptions, Phaser labels (13) |
| 11-12 | Tags/badges, quest header line, brand URL, burn label (11) |

### 1.4 Components (exact CSS) [obs]
```css
.game-panel  { border: 4px solid var(--g-white); background: #000; border-radius: 0; }
.game-btn    { background: var(--g-white); color: #000; border: 3px solid #000; border-radius: 0;
               min-width: 44px; min-height: 48px; padding: 0 16px; font-size: 18px; line-height: 1;
               display: inline-flex; align-items: center; justify-content: center; gap: 6px;
               box-shadow: 4px 4px #000; cursor: pointer; }
.game-btn:active   { transform: translate(2px, 2px); box-shadow: 2px 2px #000; }   /* "press-in" */
.game-btn:disabled { opacity: .6; cursor: default; }
.game-btn--gold    { background: var(--g-gold); }
.game-btn--sm      { min-height: 44px; padding: 0 12px; font-size: 15px; }
.game-caret  { width: 0; height: 0; border-style: solid; border-width: 8px 0 8px 14px;
               border-color: transparent transparent transparent var(--g-white); }  /* 14x16 right triangle */
.game-shadow { text-shadow: 2px 2px #000; }
.game-logo   { color: var(--g-gold);
               text-shadow: 4px 4px 0 var(--g-navy), 8px 8px 0 var(--g-navy), 12px 12px 0 #000; } /* stepped 3D */
.game-input  { background: var(--g-white); color: #000; border: 3px solid #000; border-radius: 0; outline: none;
               width: 100%; min-height: 52px; padding: 0 14px; font-size: 22px; user-select: text; }
.game-input:focus { box-shadow: 0 0 0 3px var(--g-gold); }
.game-link        { color: var(--g-white); text-decoration: none; }
.game-link:hover  { color: var(--g-gold); }

.game-shake { animation: .3s game-shake; }          /* 0,100%:0  20%:-5px 40%:5px 60%:-3px 80%:3px (translateX) */
.game-sheet { animation: .18s ease-out game-slide-up; }   /* translateY(100%) -> 0 */
.game-pop   { animation: .35s ease-out game-pop; }  /* 0%: opacity 0 scale .6; 60%: opacity 1 scale 1.15; 100%: scale 1 */
```
Design language: zero radius everywhere, hard 2-4 px black offsets, black or `bg-black/75..92` translucent panels,
borders 2-4 px in white/gold/red. Only exception is the trophy screen (rounded, gradient `#0A1A3F -> #050A18`).

`game-pop` is applied to everything that appears (cards, toasts, quest panel on change, countdown digits, "新紀錄！",
purchased row). `game-shake` is used on the buy button when you cannot afford it (class added for 320 ms).

Icons: HUD buttons use inline 8x8 SVG paths at 22 px with `shape-rendering: crispEdges` (speaker, muted speaker,
camera); pause is two `16x5` black bars with 5 px gap. Resource icons are webp at 22x22 `object-contain`.

### 1.5 How "pixel art" scaling is actually done [obs]
- Art is **not** true low-res pixel art. It is high-res pixel-style illustration drawn at **2x display size** and
  scaled by `SPRITE_SCALE = 0.5`. Measured: player walk frame 67x112 -> displayHeight 56; rat 80x48 -> 24;
  big rat 106x80 -> 40; rat king 214x176 -> 88; worker 61x104 -> 52.
- Phaser config: `pixelArt: false, antialias: true` (smooth filtering), `type: AUTO`, `Scale.NONE`,
  canvas backing size = container CSS size x `dpr` where `dpr = min(devicePixelRatio, VIEW.maxPixelRatio = 2)`,
  `scale.zoom = 1/dpr`; camera `setZoom(dpr * VIEW.zoom)` with `VIEW.zoom = 0.7`. So 1 world unit = 0.7 CSS px; the
  player is ~39 CSS px tall on screen. Resize listener re-applies size/zoom.
- Phaser text objects set `resolution: dpr` (building labels `dpr * zoom`) and use `stroke #000, strokeThickness 3-4`
  for legibility.
- Share image (1080x1350 canvas) uses `imageSmoothingEnabled = false` when drawing the background and cutscene frame.
- HTML images are not `image-rendering: pixelated` in game code (a Tailwind `[image-rendering:pixelated]` utility
  exists in the site-wide CSS but is not referenced in the inspected game chunks) [obs, partial].
- [inf] For the remake: author sprites at 2x, `setScale(0.5)`, keep antialias on, cap dpr at 2, zoom ~0.7. True
  nearest-neighbour would look jaggy at 0.5 scale; their approach reads as "pixel art" because the source art is
  pixel-styled, the font is bitmap, and all UI chrome is square with hard shadows.

---

## 2. Layout

### 2.1 Viewport [obs]
- Root: `div.game-root.fixed.inset-0.z-50.flex.justify-center` (bg `--g-night`), child
  `div.relative.h-full.w-full.overflow-hidden` with `style.maxWidth = 480` (`VIEW.maxWidth`).
- Desktop (1440x900): a 480 px wide, full-height column centred; the area outside is plain `--g-night`. No scaling,
  no letterbox image, no device frame (see `d-title.png`, `d-hud.png`). The game is simply a portrait phone column.
- Context menu disabled on root. A `touchstart` listener calls `preventDefault` unless the target is a
  button/a/input/textarea/select/label/video or `[data-scroll]`, so the page never scrolls/zooms during play.
- Menu screens: wrapper `absolute inset-0 overflow-y-auto bg-[var(--g-night)]`, optional night-city art
  (`ui/title_bg.webp`, 801x734) pinned `absolute bottom-0 left-0 w-full`; content column
  `relative flex min-h-full flex-col px-5` with `paddingTop: max(16px, env(safe-area-inset-top))`,
  `paddingBottom: max(24px, env(safe-area-inset-bottom))`. Leaderboard uses `night={false}` (no art).

### 2.2 Safe areas [obs]
| Element | Rule |
|---------|------|
| Menu column | top `max(16px, safe-top)`, bottom `max(24px, safe-bottom)` |
| HUD top bar | `pt-[max(10px,env(safe-area-inset-top))]` |
| Building sheet | `paddingBottom: max(14px, safe-bottom)` |
| Notice (non-blocking) | `bottom-[max(96px,calc(env(safe-area-inset-bottom)+84px))]` |
| Revive close btn | `top-[max(12px,env(safe-area-inset-top))]` |
| Photo-mode hint | `bottom-[max(24px,env(safe-area-inset-bottom))]` |
| Trophy header | `pt-[max(14px,env(safe-area-inset-top))]` |

### 2.3 In-run HUD (top bar) [obs]
Container: `absolute inset-x-0 top-0 border-b-[3px] border-black bg-black/80 px-3 pb-2.5 pt-[max(10px,safe-top)]`.
Measured height on a 430 px phone ~175 px (React default before measure: 150). Rows top to bottom:
1. Brand bar `mb-2 flex justify-between`: 蔣出來 18 px gold with `text-shadow 2px 2px 0 #000`; site URL 12 px white.
2. `flex justify-between`: timer `game-shadow text-[26px] leading-none` gold, format `MM:SS`; right side
   `flex gap-2` of three 44x44 buttons `border-[3px] border-black bg-[var(--g-white)]`: sound toggle, camera
   (photo mode), pause.
3. Status badges (only when any): `mt-1.5 flex flex-wrap gap-1`, each `border-2 px-1 text-[11px] leading-4`
   coloured border+text (中毒, 變慢, 攻速x2 N, 燙傷 N, 抽菸, 傘下：回血, 升級8折, 民心不滿...).
4. Resource row `mt-2 grid grid-cols-3 gap-2 text-base`: coin / wood / meat, icon 22x22 + number, `gap-1.5`.
5. Bar `背包 n/cap`: `mt-1.5 flex gap-2 text-[13px]`, track `h-2 flex-1 bg-[#3C3C3C]`, fill gold, red when >= 85 %.
6. Bar `危險度 ★..　老鼠王 hp/max` with red fill. (Danger stars come from the current zone.)

Below the bar, at `top = hudHeight + 10`:
- **Quest panel** (tutorial only): `absolute left-2.5 right-[118px]`, inner `game-pop border-2 bg-black/85 px-2.5
  py-1.5`, border gold (or `#FF6A4A` for "提醒" reminders). Header 11 px `任務 n/6` + right-aligned
  `跟著箭頭 ➜`; title 15 px; detail 12 px gray; warn 12 px `#FF6A4A` pulsing; tip 12 px gold. Re-mounts (re-pops)
  on step change.
- **Minimap**: `absolute right-2.5`, 96 px wide, height `96 * WORLD.h / WORLD.w`, `border-2 border-white bg-black/70`;
  zones as coloured rects with id letter 9 px; buildings as 11x11 gold squares with a CJK initial
  (收/招/工/商) 8 px, quest target pulses with white outline; king = 8x8 red pulsing square; player 6x6 white.
- **Guide arrow** (Phaser, depth 1e6): gold `#F8B800` filled triangle with 3 px black stroke, orbiting the player at
  `GUIDE.arrowRadius = 56` around the player's mid-height, tip 14 px, back corners 10 px at +-2.4 rad; label with the
  target name 13 px gold, 4 px black stroke, placed at radius +30/+22. Hidden within 220 px of a building pad
  (280 px for the king).
- The HUD reports its covered height to Phaser (`topCover = hudH + 10 + max(questH, minimapH) + 6`); the camera
  `setFollowOffset(0, (topCover - sheetH) / 2 / zoom)` keeps the player centred in the *visible* area. Do this.
- Over-head bars (Phaser): player HP bar 54x5 on a 58x9 black 85 % backing, 12 px above head; king bar 64x6 red on
  68x10 backing + label 老鼠王 13 px gold.

### 2.4 Building menu bottom sheet [obs]
`section.game-sheet.absolute.inset-x-0.bottom-0.flex.flex-col.border-t-4.border-[var(--g-gold)].bg-black.px-4.pt-3.5`,
`height: 440` (`UI.menuSheetHeight`), slides up in 180 ms. Opens automatically when standing on a building pad
(not the stall), closes when you walk off or press ✕; timer keeps running.
- Header `flex items-center gap-3`: building texture 48x48, name 22 px gold, description 13 px gray, close button
  44x44 `border-[3px] border-white text-xl` "✕".
- List `ul.mt-2.flex-1.overflow-y-auto` with `data-scroll`. Row: `grid min-h-[76px] grid-cols-[52px_minmax(0,1fr)_96px]
  items-center gap-3 border-b-2 border-[#3C3C3C]`.
  - Icon cell 52x52 `bg-[#1C1C1C]`, image `max-h-11 max-w-[46px]`.
  - Text: name 17 px + `Lv n` 13 px gold + optional `任務` tag (11 px black on gold); desc 13 px gray.
  - Price button `h-11` 96 wide, 15 px black text, coin icon 16x16; bg gold if affordable else `#7C7C7C`;
    shake on fail; 8折 tag 11 px red. Maxed: `bg-[#3C3C3C]` "已滿級" gray.
  - Tutorial-target row: `outline-2 -outline-offset-2 outline-gold bg-[#2A2200] px-1`, auto `scrollIntoView`.
  - On purchase the row text gets `game-pop` for 400 ms.
- Footer `mt-2 text-xs text-[var(--g-dim)]`: 走離建築會自動關閉．選單開著計時不停.
- Camera bounds extend by `440/zoom` while open so the player can still be centred above the sheet.

### 2.5 Dialogs and overlays [obs]
| Overlay | Classes / layout |
|---------|------------------|
| Intro 通關目標 (`GoalOverlay`) | `absolute inset-0 flex items-center justify-center bg-black/75 px-6`; card `game-panel game-pop w-full max-w-[320px] px-5 py-5 text-center`: 通關目標 14 px gray, 盡快打倒老鼠王 30 px gold, rat-king image `h-32`, bullet list 14 px left-aligned with gold / `#9CFF6A` / `#8FB8FF` highlights, `game-btn game-btn--gold mt-5 w-full` "開始". Shown once the scene emitted `ready`; before that `載入中…` (24 px, `game-shadow`) on `bg-black/40`. |
| Countdown | `pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40`; digit `game-pop game-logo text-[96px]`, keyed so each digit re-pops. 3, 2, 1 at 800 ms each then "出發！" 500 ms; then timer + BGM start. |
| Pause | `z-40 bg-black/70 px-8`; `game-panel max-w-[300px] px-6 py-6`; 暫停 30 px gold; 計時停在 MM:SS 14 px gray; `flex-col gap-4` buttons: 繼續 (gold), 成就, 重新開始, 回首頁. Auto-pauses on `visibilitychange`. |
| HoldNotice (blocking) | `z-30 bg-black/60 px-6`; card `game-pop max-w-[350px] border-[3px] px-4 py-4`, bg `rgba(0,0,0,.92)`, border gold or red (warn); title 24 px gold or `#FF6A4A`; lines 15 px; last line of warn 18 px red; gold 繼續 button. Pauses the world; queued. |
| Notice (auto, 4.2 s) | Bottom-anchored (see safe areas), `max-w-[350px] border-[3px] px-3 py-3`, bg `.9`, title 20 px, lines 14 px. Pointer-events none. Can chain via `next`. |
| Toast (2.2 s) | `absolute left-3 right-[118px]` (same column as quest), `game-pop border-2 border-gold bg-black/85 px-2.5 py-1.5 text-center text-sm`. Top = below quest panel, or below the zone banner when it is showing. |
| Zone banner (1.5 s) | Full-width centred `game-pop border-[3px] border-black px-4 py-2`; bg `rgba(216,40,0,.92)` for danger, `rgba(0,0,0,.85)` safe; line 1 20 px `進入危險區域　★★` (stars gold); line 2 13 px `傷害 ×n　掉落 ×n`. Top = `max(hud+18+quest, hud+86)`. |
| Death | `z-20 bg-[rgba(216,40,0,0.55)] px-8`; 被老鼠圍攻了 36 px; two stacked `game-btn` (`flex-col gap-1.5 py-2.5`) 22 px label + 13 px sub-label (看影片 gold / 不看 white); footer 計時沒有停喔 14 px. |
| Revive video | `z-20 bg-black`; logo 48 px; `video max-w-[440px] border-[3px] border-gold`; countdown 36 px gold; close ✕ / 跳過 48 px square gold-bordered top-right. |
| Trophy card | `game-panel game-pop max-w-[340px] px-4 py-5`, 你獲得了一個獎盃, tier label in tier colour, name 30 px gold, gold 繼續. |
| Photo mode | Hides HUD; branded strip on top (`game-logo text-[34px]` + Threads handle), hint fades after 1.5 s; tap anywhere to exit. |

Joystick [obs]: floating, appears where the finger goes down (whole screen is the touch area, `touch-none`).
Base `rounded-full border-4 border-white/70 bg-black/25`, diameter 96 (`radius 48`); knob 44 px (`knobRadius 22`)
`rounded-full border-[3px] border-black bg-[#F8B800]`; knob clamped to radius; dead zone 15 %; output = offset/radius.
Hidden on release. Keyboard WASD/arrows on desktop; mouse/touch input disabled inside Phaser.

---

## 3. Animation (Phaser) [obs]

| Item | Value |
|------|-------|
| `ANIM_FPS` | `{ walk: 8, attack: 12, idle: 2 }` |
| `FRAMES` | 4 per directional cycle; `DIRS = down, up, left, right` (separate art per dir, no mirroring for walk) |
| Player walk | `player_walk_{dir}` 4 frames @ 8 fps, loop. Facing from dominant input axis. Idle = stop anim and show frame 0 of facing dir. |
| Player attack | `player_attack_{axe|chainsaw|harvester}` 4 frames (one set per weapon art, not per direction). Played with `repeat: 0` and **`frameRate = frames.length / attackInterval`** so one swing exactly fills the interval (e.g. 4 / 0.45 s = 8.9 fps for Axe I, 4 / 0.27 = 14.8 fps for Harvester II). Direction by `setFlipX(target.x < player.x)` during `swingUntil`. Auto-attack only fires when standing still. |
| Impact timing | Damage applied at `now + interval * COMBAT.impactAt (0.5)`, i.e. mid-swing, via a `pendingHit`. |
| Worker | `worker_walk_{dir}` @ 8 fps; `worker_chop` 4 frames, `frameRate = 4 / workerInterval`, hit at `cd <= d * (1 - impactAt)`. Catcher workers = same sprite tinted `0x8FC0FF` (`9421055`). |
| Rats | `rat_walk`, `bigrat_walk`, `ratking_walk` 4 frames @ 8 fps (single side view, `setFlipX(target.x > x)` -> art faces left). `*_attack` 2 frames @ 6 fps (attack/2), looped while in bite range. Big-rat attack art faces the opposite way (flip rule inverted). Wander pauses stop the anim. |
| Citizens | `{office,grandma,student,rider}_idle` 2 frames @ 2 fps, start frame alternates by queue index so the queue does not bob in sync. Queue step tween 160 ms, leave tween 450 ms (x-20, y+70 + fade), enter from side with alpha 0 -> 1. |
| Hit flash | `setTintFill(0xffffff)` for 60 ms then `clearTint()` on any damaged target (rats, trees, nests, burn ticks). |
| Tree hit | Extra wobble tween x+2, 40 ms, yoyo, repeat 1. Felled -> random stump texture (6), scaled to `max(36, 0.3*h)` tall, depth `y - 1000`. |
| Player hurt | Tint `0xFF5040` for 120 ms (`hurtFlashUntil`), `camera.shake(80, 0.004)`, hurt sfx (throttled 250 ms). Persistent tint while poisoned `0x9CFF6A` or slowed `0x8FB8FF`. |
| Float text | `floatText(x, y, text, colour, ms = 800)`: 15 px Cubic 11, 4 px black stroke, origin (0.5, 1), depth 1e6; tween y -26 and alpha -> 0, `Quad.easeOut`, destroy. Used for `+n 木/肉` (white), `+$n` sale / 外送 / 鼠窩 (gold), 升級！, 中毒！ (green), 變慢！ (blue), `-$n` (gold), 需要電鋸 (1200 ms), 任務完成！. |
| Hand-over | Coin/wood icon 18x18 tweened from player to customer in 150 ms (throttled 60 ms). |
| Depth sorting | `setDepth(sprite.y)` every frame for player/rats/workers/citizens/buildings (origin 0.5, 1 = feet). Map tiles -10, shadows -9, pad ellipses -5, stumps `y-1000`, overhead decor `5e5 + y`, HUD-like world UI near `1e6` (guide 1e6, float text 1e6, HP bar 1e6-1, king bar 1e6-2, burn label 1e6-3, building labels 1e6-4). |
| Sprite scale | Everything `setScale(SPRITE_SCALE 0.5)`, origin (0.5, 1). Display heights: player 56, worker 52, citizen 52, grandma 66, small rat 24, big rat 40, king 88, nest 56, building 110. |
| Camera | `startFollow(player, roundPixels=true)`, zoom `dpr * 0.7`, bounds = ground rect, follow offset compensates HUD/sheet (2.3). |
| Building pads | Ellipse `3.2r x 1.1r` (r = 30) black 25 % fill + 3 px white 90 % stroke; building name label 18 px gold on black, padding 8x3. |
| Cutscenes (HTML) | Rat-king KO and ending are webp frame sequences with per-frame holds in 100 ms units (e.g. `[8,2,2,2,3,...,14]`), preloaded 15 s into the run. |

Audio [obs]: all synthesized WebAudio (square/triangle oscillators + bandpass noise); chiptune BGM loop at
~132 BPM eighth notes; unlocked on first tap (開始 button). Mute stored in `localStorage.jcl_muted`.

---

## 4. Screen flow [obs]

```
title ─┬─ 開始遊戲 → stage (選擇關卡) → nickname (輸入暱稱 + 難度) → 出發 → [start_run on backend]
       │                                                               → run: 載入中… → 通關目標 card → 開始
       │                                                               → countdown 3-2-1-出發！ → play
       │                                                               → win → result (+trophy cards) → share / 再玩一次 / 看排行榜 / 看全部成就 / 回首頁
       ├─ 排行榜 → board (tabs 普通 / 地獄 / 最終Boss, top 100, infinite scroll by 50, "你的最佳" sticky footer)
       ├─ 遊玩紀錄 → stats
       ├─ 成就 → trophies (full-screen, rounded style)
       ├─ 遊玩方式 → howto (4 numbered cards with art + 操作 panel + 返回)
       └─ 社群 → external Threads link
```
Screen state is a single `useState` string (`title | stage | nickname | board | stats | howto | trophies | result |
result2 | ...`), no routing; everything lives at `/game`.

- **Title** (`m-title.png`): `← 回網站` link 14 px top-left; logo 88 px `mt-12` centred; `nav.mt-8` with
  `flex-col gap-1` buttons `flex min-h-[52px] items-center gap-3.5 px-3 text-[26px] game-shadow`. The first item has a
  `game-caret`, others a `w-[14px]` spacer so labels align (the caret is static on 開始遊戲, not a hover cursor).
  Below: `game-panel max-w-[290px] border-[3px] bg-black/75 px-3.5 py-2.5 text-[15px]` "普通榜前三名" (top 3 with rank
  colours), clicking it opens the board. Night-city art fills the bottom.
- **Stage select** (`m-stage-select.png`): heading `game-shadow mt-10 text-4xl gold`; `mt-8 flex flex-col gap-4` of
  cards `flex items-center gap-3 border-[3px] border-white bg-black/70 px-3 py-3 text-left active:border-gold`, art
  `h-16 w-20`, title 24 px, subtitle 14 px; locked stage shows a gold `?`. 返回 `game-btn`.
- **Nickname** (`m-nickname.png`): label 14 px; `game-input` + `game-btn--sm` 換一個 (random name); 難度 two cards
  `grid-cols-2 gap-3`, each `border-[3px] px-3 py-3`, selected = gold border + navy fill + gold title; title 24 px,
  bullet lines ~12 px. Bottom row 返回 (white) / 出發 (gold), turns into 連線中… while the run is created.
- **How-to** (`m-howto.png`): numbered `game-panel flex items-center gap-3 px-3 py-3` cards (gold number + title, gray
  text, art thumbnail), then 操作 / note panels, `game-btn mt-6 self-center px-10` 返回.
- **Leaderboard** (`m-leaderboard.png`): `game-btn--sm ← 返回`, gold 30 px title, player count top-right; 3-tab
  segmented control on black with gold active tab; `game-panel` table (名次 / 暱稱 / 時間) with ranks 1-3 coloured;
  sticky navy "你的最佳" bar at the bottom.
- **Result**: cutscene player (`max-w-[300px]`), then `nickname · difficulty` 16 px, `game-logo text-5xl`
  打倒老鼠王！, timer icon 36 px + time 48 px, rank line (`新紀錄！` pops gold), stats `dl.game-panel grid-cols-2
  max-w-[320px] text-[15px]` (砍樹, 打老鼠, 拆鼠窩, 賺的錢, 工人, 被打倒), new trophies panel, buttons
  `max-w-[320px] flex-col gap-4`: 分享到 Threads (gold), [再玩一次 | 看排行榜], [看全部成就 | 回首頁] (sm).
- **Share**: client-side 1080x1350 PNG: `--g-night` bg + blurred art with navy gradient, title 88 px with the same
  stepped navy/black shadow, 640x640 black frame with 8 px gold-ish stroke holding the KO frame, subtitle 40 px,
  time 96 px, rank 44 px, 2x2 stats block on `rgba(0,0,0,.72)`, footer URL 32 px. Uses `navigator.share({files})`
  when available, else opens a preview dialog / Threads intent URL.

---

## 5. Takeaways for 芒果園保衛戰 [inf]
1. One small token set (7 colours, 0 radius, 3-4 px black borders, 2/4 px hard shadows) applied everywhere is most
   of the polish. Copy the `.game-btn` press-in (`translate(2px,2px)` + shadow 4 -> 2) and `.game-logo` stepped shadow.
2. Use Cubic 11 (OFL) for both DOM and Phaser text and await `document.fonts.load` before creating the game.
3. Fixed 480 px portrait column, centred on desktop with the night colour outside; respect safe areas with
   `max(Npx, env(...))`.
4. Measure the HUD and bottom sheet and feed them to the camera follow offset so the player is always centred in the
   visible gap.
5. Every popup uses one `pop` keyframe (0.6 -> 1.15 -> 1, 350 ms); re-key elements to replay it.
6. Swing animations stretch to the attack interval and deal damage at 50 %; add 60 ms white flash, -26 px float
   text, 80 ms 0.004 camera shake on player hurt. These four effects carry the game feel.
7. Art at 2x with `setScale(0.5)`, origin bottom-centre, `depth = y`.
