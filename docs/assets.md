# Art manifest (theme: orchard vs Taiwanese macaques)

All art is generated with Codex image generation.

## Shared style

Cute 16-bit pixel art (SNES-era RPG look), top-down 3/4 view, warm saturated palette,
crisp 1-px dark outline, consistent light from the top-left, NO text or letters in images.
Characters are chibi (big head, ~2.5 heads tall). Everything must look like one game.

## Sprite sheets (animation)

Generate each sheet as ONE image laid out as a strict grid of equal square cells on a flat
#FF00FF magenta background (or transparent), one pose per cell, the character centred in its
cell, same scale and same baseline (feet on the same line) in every cell, nothing crossing cell
borders. Then post-process with Python/PIL:

1. key out magenta to transparency (if used),
2. split the grid into cells,
3. compute ONE union bounding box over all cells of the sheet (so frames do not jitter), crop every
   cell to it,
4. resize with NEAREST so the frame height equals "frame px",
5. save each frame as `public/assets/<name>_<row>_<col>.png` using the row names below.

Generate the player walk sheet first, then pass it as a reference image (`-i`) for every other
character sheet so proportions, outline and palette match.

| sheet | grid | rows (top -> bottom) | columns | subject | frame px |
|---|---|---|---|---|---|
| player | 4x4 | `walk_down`, `walk_up`, `walk_side` (facing right), `attack_pole` (facing right) | 4 animation frames | young Taiwanese fruit farmer, straw hat, towel round neck, rubber boots, holding a long bamboo pole; attack row = full overhead swing of the pole to the right | 112 |
| player_tools | 2x4 | `attack_shears`, `attack_picker` (facing right) | 4 frames | same farmer swinging long-reach pruning shears / a motorised fruit-picker pole | 112 |
| picker | 2x4 | `walk_side`, `work` (facing right) | 4 frames | hired fruit picker worker, cap, basket on back; work = reaching up and picking with a short pole | 104 |
| ranger | 2x4 | `walk_side`, `work` | 4 frames | monkey ranger worker, green vest, whistle, waving a big net; work = net swipe | 104 |
| monkey | 2x4 | `walk_side`, `attack` (facing right) | 4 frames | small Formosan rock macaque (grey-brown fur, pink face) carrying a stolen banana; attack = lunging scratch | 56 |
| big_monkey | 2x4 | `walk_side`, `attack` | 4 frames | big alpha male macaque, bared teeth; attack = lunging scratch | 80 |
| monkey_king | 2x4 | `walk_side`, `attack` | 4 frames | huge old macaque king with a golden crown and red cape, holding a banana sceptre | 176 |
| customer | 3x2 | `a`, `b`, `c` | 2 idle frames | `a` office worker, `b` grandma with a shopping cart, `c` student with backpack, all facing left | 104 |

## Single sprites

Trim transparent borders, resize with NEAREST so the height equals "target px".

| file | subject | target px |
|---|---|---|
| fruit_tree.png | small mango tree heavy with ripe mangoes | 128 |
| old_tree.png | tall old mango tree, huge canopy, mangoes high up | 208 |
| picked_tree.png | the same small mango tree with no fruit left (harvested) | 128 |
| monkey_den.png | macaque gathering spot: rocks, branches, banana peels | 112 |
| stall.png | Taiwanese roadside fruit stand with mango and banana crates and a red umbrella | 220 |
| coop.png | small farmers' association office (農會 style) with a notice board | 220 |
| toolshop.png | farm tool shop with poles, shears and baskets on display | 220 |
| grocery.png | traditional Taiwanese grocery shop (柑仔店) with baskets and boxes | 220 |
| pavilion.png | small red temple pavilion with a donation box | 140 |
| ice_shop.png | shaved-ice (剉冰) stall with a big ice machine | 140 |
| chili_field.png | small patch of red chilli plants (朝天椒) with a wooden fence | 140 |
| procession_a.png | temple procession member carrying a flag | 104 |
| procession_b.png | temple procession member with a gong | 104 |
| icon_mango.png | mango icon | 48 |
| icon_banana.png | banana bunch icon | 48 |
| icon_coin.png | gold coin icon | 48 |
| icon_heart.png | red heart icon | 48 |
| icon_tool.png | bamboo pole and shears crossed icon | 48 |
| tile_village.png | seamless tileable orchard grass with dirt path bits, NO transparency, 256x256 | 256 |
| tile_hills.png | seamless tileable hillside grass with ferns, NO transparency, 256x256 | 256 |
| tile_deep.png | seamless tileable dark mountain forest floor with roots and moss, NO transparency, 256x256 | 256 |
| tile_town.png | seamless tileable suburban ground, grass with paving stones, NO transparency, 256x256 | 256 |
| title_bg.png | wide pixel-art Taiwanese mango orchard on a hillside at sunset, mountains behind, a few macaques in trees, NO transparency, 960x540 | 540 |
