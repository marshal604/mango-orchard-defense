# Art manifest

All art is generated with Codex image generation. Style: cute 16-bit pixel art, top-down 3/4 view,
consistent warm palette, crisp 1-px dark outline, single subject centered, transparent background.
Single-frame sprites; walking / attacking is animated in code (bob, squash, flip).

Post-process each sprite: trim transparent borders, then resize (nearest-neighbour) so the
longest side of the subject matches "target px" below. Save PNG into `public/assets/`.

| file | subject | target px (height) |
|---|---|---|
| player.png | badminton player in sporty jersey holding a racket, facing camera | 112 |
| ballboy.png | worker kid in cap carrying a shuttle tube (Ball boy) | 104 |
| wrangler.png | worker in green vest holding a net on a pole (Goose wrangler) | 104 |
| customer_a.png | office worker customer | 104 |
| customer_b.png | grandma customer with a racket bag | 104 |
| customer_c.png | student customer | 104 |
| goose.png | white goose | 48 |
| big_goose.png | angry big grey goose, honking | 80 |
| goose_king.png | huge goose wearing a golden crown and red cape | 176 |
| goose_nest.png | straw goose nest with eggs | 112 |
| cork_tree.png | small cork tree with round canopy | 128 |
| cork_oak.png | big old cork oak, wide canopy | 208 |
| stump.png | tree stump | 72 |
| stall.png | badminton workshop market stall with shuttlecocks on display | 220 |
| clubhouse.png | small sports clubhouse with a "HIRE" sign | 220 |
| proshop.png | racket pro shop with rackets in window | 220 |
| supply.png | supply store with backpacks and boxes | 220 |
| shade_tent.png | white pop-up shade tent | 120 |
| locker_room.png | small locker room hut | 140 |
| drink_stand.png | small sports drink stand / kiosk with a cooler, colourful sports drink bottles and a shuttlecock logo sign | 140 |
| icon_cork.png | cork piece icon | 48 |
| icon_feather.png | white feather icon | 48 |
| icon_coin.png | gold coin icon | 48 |
| icon_heart.png | red heart icon | 48 |
| icon_racket.png | badminton racket icon | 48 |
| shuttle.png | single shuttlecock | 32 |
| tile_park.png | seamless tileable grass ground texture, top-down, NO transparency, 256x256 | 256 |
| tile_lake.png | seamless tileable lakeside grass with small flowers, NO transparency, 256x256 | 256 |
| tile_wetland.png | seamless tileable muddy wetland with reeds, NO transparency, 256x256 | 256 |
| tile_arena.png | seamless tileable sports court floor tiles, NO transparency, 256x256 | 256 |
| title_bg.png | wide pixel-art park at sunset with badminton courts and geese, NO transparency, 960x540 | 540 |
