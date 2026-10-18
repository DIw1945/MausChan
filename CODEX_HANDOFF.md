# Burnice Pixel Walk — handoff for Codex

Export date: 2026-10-18. Source commit: `2a5f3db146dda14d2c680d1c0f85ad32a725b25c`.
Owner communicates in Thai. Read `AGENTS.md` first.

## Purpose and current scope

An existing playable, Zelda SNES-inspired, top-down pixel-art fan prototype starring Burnice White from Zenless Zone Zero. Continue this implementation rather than starting a new game or migrating engines.

The original handoff exported source and explained local setup without publishing changes. Later local additions are recorded below: Nitro sparkle cleanup, bombs/brittle rocks, and the Slime practice arena. The owner deferred a map-editor system to work on basic gameplay first.

Original preview: https://burnice-pixel-walk.woollyseed10.chatgpt.site
Access to that preview is independent of this local source archive. Local changes are not automatically deployed there.

## Run / test

- Node.js 20+; no runtime package dependencies, install step or build step.
- `npm start` -> http://127.0.0.1:4173. Windows: `npm.cmd start` or `start-game.cmd`.
- `npm start -- 4174` selects another port. Stop the server with Ctrl+C.
- `npm test` / `npm.cmd test` discovers all `tests/*.test.mjs` portably.
- Open the served URL, not `dist/index.html` with file://; ES modules need HTTP.
- `dist/` is the complete static game. No server-side game state or API key is needed.
- CSS requests an external Google font; fallback fonts allow play without that font.
- Python sprite tools are optional and use Pillow, NumPy and SciPy. Install `requirements-art.txt` in a virtual environment only if you need those tools.

## File map

| File | Responsibility |
| --- | --- |
| `dist/index.html`, `dist/style.css` | Thai UI, controls, hearts, canvas layout, sprite inspector |
| `dist/game.mjs` | Rendering, world art, asset loading, input, update loop, UI integration |
| `dist/core.mjs` | World dimensions, collision shapes, normalized eight-way movement, facing |
| `dist/combat.mjs` | Slash/charge/spin, dummies, hit detection, per-attack hit IDs, damage stats |
| `dist/visuals.mjs` | Charge walking and continuously pulsing blade aura |
| `dist/health.mjs` | HP, hurt, knockback, invulnerability, shooter and projectiles |
| `dist/defeat.mjs` | Timed defeat poses and three orbiting stars |
| `dist/fire.mjs` | Full-heart directional/radial sword fire and shared hit history |
| `dist/nitro.mjs` | Item collection, rare drops, use sequence and delayed healing |
| `dist/bombs.mjs`, `dist/bombs.css` | Collectible bombs, placement/fuse/blasts, brittle rocks and bomb UI |
| `dist/slimes.mjs`, `dist/slimes.css` | Four-point Slime arena, monster AI/splitting, sticky status/struggle UI |
| `dist/spiders.mjs` | West spider arena, melee/ranged AI, silk projectiles, Webbed/escape |
| `dist/assets/` | Generated originals, retained/current atlases, metadata, frames, ZIP packs |
| `tests/*.test.mjs` | Existing gameplay and asset consistency checks; baseline 45 tests |
| `tools/*.py` | Original sprite slicing/calibration/repair tools |
| `tools/dev-server.mjs`, `tools/run-tests.mjs` | New dependency-free local handoff helpers |

The original README is retained as `docs/DEVELOPMENT-HISTORY.md`. Its later sections describe the latest versions; its opening title and early descriptions are historical. Old absolute `/workspace/...` paths must be interpreted relative to this local checkout.

## Current behavior to preserve

- World:2304x768 spanning x=-640..1664, including west spider arena, original 1024-wide yard and east Slime arena. Existing object/player positions are preserved: player starts(468,408), speed104px/s. Collision is in `core.mjs`. Diagonal motion is normalized; four sprite facings cover eight movement directions.
- WASD/arrows move. J/Z/Space or attack button slash. Hold after the initial slash to charge; release full charge to spin. Touch joystick and attack can be held simultaneously.
- Slash: 0.34 s, 20 damage. Charge: 0.8 s after slash, moving at 42% speed. Spin: 0.64 s, 60 damage. Each attack hits a target at most once.
- Charge walking uses actual distance, stops at walls and matches idle body/head scale. Blade aura has its own clock and keeps pulsing at full charge.
- Four 300-HP training dummies: (468,474), (352,397), (626,466), (280,354). They restore HP after 4 s idle or 2.2 s defeated.
- The fourth dummy fires down every 1.35 s after an initial 1.6 s delay. Bullet speed is 110 px/s; each hit costs half a heart.
- Player starts with three hearts: six half-heart units. Hurt has four frames per facing; 0.38 s hurt lock, 0.18 s knockback, 1.25 s blinking invulnerability.
- At zero HP: 2 s dizzy spinning (16 unique frames), 1 s collapse (16 frames), then 1.2 s of the 8-frame dazed rest before Game Over appears (4.2 s total). Spiral eyes and exactly three separately orbiting stars remain visible. The first rest frame matches the final collapse frame; the arm remains by the cheek.
- Only at full HP, a normal slash releases one fire crescent along its facing. A fully charged spin emits eight normalized radial fire waves plus an expanding ring. Waves travel at 240 px/s, range 300, with 20/60 damage for slash/spin. Melee and all waves from an attack share one hit-ID set. New attacks/cancel replace the set without clearing older in-flight waves' hit history.
- Nitro starts with inventory zero and one sample pickup at (412,432), southwest of spawn. Walk within 18 px to collect +1. E/button uses one only if alive, not hurt, not already drinking, and below full HP.
- Using Nitro consumes one at start, cancels charge/attack, faces down, and fixes position. Fetch: 16 frames / 1.2 s; sip: 16 frames / 2 s; cheer: 16 frames / 1.4 s. Total 48 frames / 4.6 s. Sparkles appear near the raised can late in the cheer. HP changes only on completion: +4 half-heart units (two hearts), capped at maximum. Combat/projectiles pause during the drink; completion gives at least 0.35 s grace.
- A defeated-target event rolls a 5% rare Nitro drop once per event via WeakSet. Both dummies and Slimes use this hook. Reset dummies preserves item/monster state; Retry/reset game restores starting state.

## Production sprite selection

Use `dist/assets/corrected-v8-atlas.json` for the combined200 combat/item/effect frames, `burnice-atlas.json` for24 movement frames, `bombs-v9-atlas.json` for20 bomb/rock frames, `slimes-v11-atlas.json` for40 Slime/struggle frames, `spiders-v14-atlas.json` for100 spider/web frames, and `trees-v15-atlas.json` for4 still tree variants:388 current frames total. Several older-named atlases remain intentionally active; new supplements do not replace every texture.

| Runtime texture | Frame canvas / origin |
| --- | --- |
| `burnice-atlas.png` | 64x64 / (32,61) |
| `burnice-slash-v3-atlas.png` | 160x160 / (80,112) |
| `burnice-charge-spin-atlas.png`, `dummy-atlas.png` | 96x96 / (48,75) |
| `burnice-charge-walk-v4-atlas.png`, `burnice-hurt-atlas.png` | 160x160 / (80,112) |
| `shooter-v8-atlas.png` | 96x96 / (48,75) |
| `projectile-v8-atlas.png` | 24x24 / (12,18) |
| `defeat-spin-atlas.png`, `defeat-collapse-atlas.png`, `defeat-rest-v6-atlas.png` | 160x160 / (80,112) |
| `defeat-stars-atlas.png` | 16x16 / (8,8) |
| `fire-wave-v6-atlas.png`, `fire-ring-v6-atlas.png` | 64x64, 128x128; see metadata |
| `nitro-fetch-v8-atlas.png`, `nitro-sip-v8-atlas.png`, `nitro-cheer-v8-atlas.png` | 160x160 / (80,112) |
| `nitro-item-v8-atlas.png`, `nitro-sparkle-v8-atlas.png` | 32x32, 24x24; see metadata |
| `bomb-v9-atlas.png`, `bomb-blast-v9-atlas.png`, `brittle-rock-v9-atlas.png` | 64x64 / (32,50), 192x192 / (96,96), 96x96 / (48,76) |
| `slime-normal-v10-atlas.png`, `slime-big-v10-atlas.png`, `slime-swift-v10-atlas.png`, `slime-pop-v10-atlas.png` | 96x96 / (48,76) |
| `sticky-struggle-v11-atlas.png` | 160x160 / (80,112) |
| `spider-weaver-v13-atlas.png`, `spider-hunter-v13-atlas.png` | 96x96 / (48,64);32 frames each |
| `web-shot-v12-atlas.png` | 32x32 / (16,16) |
| `burnice-webbed-v12-atlas.png` | 160x160 / (80,112) |
| `burnice-webbed2-v14-atlas.png`, `burnice-webbed-rest-v14-atlas.png` | 160x160 / (80,112);12 struggle /8 breathing frames |
| `trees-v15-atlas.png` | 96x112 / (48,96);4 separate still variants, root baseline100 |

UI item image: `dist/assets/corrected-v8-frames/nitro-item-0.png`.
Latest combat/item ZIP: `burnice-corrected-v8-sprites.zip`; movement ZIP: `burnice-sprites.zip`. All historical ZIPs are also included to preserve source tooling. They contain previous versions and must not be treated as the active selection.

### Latest corrections: v8

Nitro-Fuel must match the owner's reference: a gold rectangular METAL CAN, bevelled edges, square top, integrated short upright gold pour-tab/spout, embossed X side ribs, and dark flame/face emblem with white details. It is not the obsolete red/white cup. This was corrected in all 48 held-item character frames, four item frames and the UI.

The gold generated v8 item and held-item sheets are included as authoritative visual references, relative to `dist/assets/`:

- `nitro-item-v8-generated.png`
- `burnice-nitro-fetch-v8-generated.png`
- `burnice-nitro-sip-v8-generated.png`
- `burnice-nitro-cheer-v8-generated.png`

Shooter/projectile corruption came from source-row spill: a complete dummy base extended into the next nominal grid cell. On projectile cells it could be larger than the intended projectile. `tools/repair_sprites_v8.py` finds complete connected components across the whole source, selects by full bounding-box centre inside the intended cell, and crops the entire selected subject while excluding neighbours. Keep this rule; fixed cell crops or selecting the largest fragment in a cell bring the corruption back.

Post-export Nitro sparkle repair: the old v7 sparkle cells included bottoms of the obsolete cups from the source row above. Runtime and current combined metadata now use `nitro-sparkle-v8-atlas.png`, sliced from the lower-row glints in `nitro-item-v8-generated.png` by complete component centres. `tools/repair_nitro_sparkles.py` repairs only these four frames and updates the current ZIP; the v8 preparation script also calls its slicer. Historical v7 assets remain for reproduction. Character poses and Nitro timing/healing are unchanged.

### Post-export feature: bombs and brittle rocks (v9)

- Q or the bomb button places one bomb 24 px in front of the current facing. Inventory starts empty; three one-time pickups are at (430,390), (392,488), (526,474). Blocked/overlapping placements do not spend inventory. Hurt, defeat and Nitro use prevent placement. Placing cancels the current attack without clearing movement input, so the player can retreat immediately.
- Fuse: 2.2 s, with animated lit fuse, countdown bar and visible circular danger radius. Blast radius: 88 px; damage: 180 per dummy once per bomb. Standing in one's own blast costs two half-heart units (one heart), respecting normal invulnerability. Separate bombs are separate hits. Kill events retain the existing rare Nitro loot hook.
- Three cracked boulders at (542,410), (592,410), (700,592) block movement, knockback, melee, fire waves and projectiles. Only a bomb removes their collision; an eight-frame .8 s crumble animation finishes before they disappear. Ordinary swords/spins/fire leave them intact.
- Nitro pauses bomb fuses and effects together with combat. Existing explosion/crumble effects finish during defeat; remaining fuses stop. Retry/full reset restores rocks and pickups and clears placed bombs/effects. Reset Dummies preserves bomb inventory and rock state.
- `dist/assets/bombs-v9-atlas.json` supplements the existing v8 combined metadata and movement metadata; 20 new frames make 244 current frames in total. The three new atlases are `bomb-v9-atlas.png` (64 px, origin 32,50; unlit frame 0 plus three lit fuse states), `bomb-blast-v9-atlas.png` (192 px, centre 96,96; eight frames), and `brittle-rock-v9-atlas.png` (96 px, origin 48,76; intact frame 0 plus crumble frames).
- Retain `bombs-rocks-v9-generated.png`, all `bombs-v9-frames/*.png`, `docs/art-prompts/bombs-v9.txt`, and `tools/prepare_bomb_assets.py`. The slicer uses the shared complete-component bounds helper and nearest-neighbour scaling; do not redraw these sprites procedurally. The additional download is `bombs-rocks-v9-sprites.zip`; the v8 pack still provides character/Nitro art. Sprite Inspector's “ระเบิด / หินแตก” tab shows all new states and supports pause/frame stepping.
- Validation: all 59 Node tests pass (45 existing + 14 bomb/rock checks). Browser checks cover pickup, Q placement, on-screen placement, retreat, 180 damage, one-heart self damage, breaking two boulders, walking through their former collision area, and inspector frame stepping. A 390 px iframe checks narrow-screen layout; physical-device touch remains untested. The new ZIP's CRC and every frame/atlas byte match were also checked.

### Post-export feature: Slime training (v10)

- World width is now 1664; height, original spawn and original training-yard objects remain unchanged. The east border opens at x982..1024 / y336..532. A connected path leads into the adjoining dirt arena at (1048,160), size548x472. The player can walk around the brittle rocks via y440, then north to y409 to cross above the pond; bombs are not required to reach the arena.
- Four pads: (1150,260), (1476,260), (1150,534), (1476,534). Initial spawning is staggered; subsequent spawns wait3.2s and refill while capacity allows. At most3 living Slimes per point, including split children. A live big slime reserves a second slot, so it can always become two small blue children without exceeding the cap. Unique string IDs prevent shared melee/fire hit-history collisions with dummies or later generations. Spawned children have .55s grace and cannot be erased by the same ongoing strike immediately after the parent dies.
- Green normal:40HP/speed32; blue large:100HP/speed23/splits; pink swift:20HP/speed65; blue tiny children:20HP/speed58. All use generated art. Enemies wind up before contact damage, respect invulnerability/scenery/rocks, stay inside the arena and leash near their own point. Swords, spin, full-heart fire and bombs use the existing shared target damage/loot event path. The 5% Nitro hook now applies to real monster defeats. Death goo pops finish before removal; fresh spawn IDs never reuse an old target's hit history.
- Each registered Slime hit costs half a heart and adds goo: normal34, large45, swift/tiny26. At100 the player is rooted, attacks/items are disabled, knockback stops and the 12-frame generated front-facing struggle loop replaces movement/hurt rendering. Slimes retreat and damage is suppressed while bound to leave room for input. Time alone cannot free the player. Twelve distinct direction keydowns, struggle-button clicks, or joystick direction changes clear goo and give1.2s grace. Keyboard auto-repeat is ignored; holding one joystick direction does not farm progress. Goo below100 starts decaying after6 quiet seconds at7/s. Nitro pauses Slime AI, spawning and goo clocks with combat. Full reset restores the arena/status; dummy reset preserves monsters.
- New art: `slimes-v10-generated.png` (28 frames), `burnice-sticky-struggle-v10-generated.png` (12 poses), `slimes-v10-atlas.json`, five runtime atlases and `slimes-v10-frames/`. The first draft source and all prompts are retained. `tools/prepare_slime_assets.py` detects uneven transparent row gutters, selects complete components by centre, keeps full bounds, calibrates every struggle pose to54px body height and40px head width, fixes feet at(80,112), and exports with nearest-neighbour sampling. Monster/effect frames are96px/origin(48,76); struggle is160px/(80,112).
- The supplemental download is `slimes-sticky-v10-sprites.zip`; the current production count is284 frames (224 character/Nitro +20 bomb/rock +40 Slime/struggle). Keep the v8 and v9 metadata/atlases as active dependencies. The new Sprite Inspector tab shows three Slime loops and the 12-frame struggle; source prompts are in `docs/art-prompts/slimes-v10.txt` and `sticky-struggle-v10.txt`.
- Validation:79 Node tests pass, including20 Slime/status tests. Browser checks confirm the connected walking route, spawning, real-hit goo buildup, bound pose/root, held-key rejection, keyboard and on-screen struggle input, and movement after escape. A390px iframe also confirms the rooted-state layout and12-click escape button flow. All40 frame/atlas bytes and ZIP CRC were verified. Physical-device touch remains untested.

### Owner tuning: Slime attacks / four-child split / restrained struggle (v11)

- Attack windup/cooldown in seconds: normal .52/1.8, big .68/2.2, swift .42/1.4, tiny .44/1.5. This increases both phases about20–30%; movement speeds, damage and goo buildup remain unchanged.
- Big Slimes now always split into exactly four blue children, with distinct IDs/positions and .55s grace. This supersedes v10's two-child reservation. Regular spawns count all live entities and wait whenever a point has3 or more. Splits are the explicit exception to that cap, so a full point can temporarily hold6; the HUD no longer claims a12-monster total maximum. Children do not split again and duplicate death events do not split twice.
- `burnice-sticky-struggle-v11-generated.png` is a built-in Image Generation edit of the retained v10 source: restrained wrist/shoulder movements, elbows near the body, disgusted expression and planted feet. Twelve unique poses now play at9fps (1⅓s loop), matching the inspector. Body54/head40 and foot origin80,112 remain calibrated. No root/escape mechanics changed.
- Active Slime metadata/download: `slimes-v11-atlas.json` / `slimes-sticky-v11-sprites.zip`. These retain monster/pop v10 atlases and select only the new `sticky-struggle-v11-atlas.png` / `slimes-v11-frames/` for Burnice. Total production count stays284. Keep both historical v10 originals/pack and new source/frames. Reproduce only this edit with `tools/prepare_sticky_v11.py`; it reuses the complete-component slicer and never rebuilds old assets. Prompt: `docs/art-prompts/sticky-struggle-v11.txt`.
- Validation:82/82 Node tests (23 Slime/status) pass, covering slower real attack intervals, four-child splitting at full capacity/boundaries, respawn suppression/refill, weapon/spawn grace and the9fps loop. Browser checks confirm v11 loads, the inspector displays the new frame selection, real hits trigger the restrained/disgusted bound pose, holding W counts once without movement, and twelve presses restore movement. Screenshots: `output/slime-v11-inspector.png`, `output/slime-v11-bound.png`. ZIP CRC, all40 frame/atlas bytes and fixed feet/body height are verified by the v11 preparation script. Physical-device touch remains untested; no touch/input layout changed in v11.

### Post-export feature: west Spider training / Webbed (v12)

- The world extends west to x=-640 with total width2304; east edge1664, height768, original player/object coordinates and original random scenery remain fixed. `WORLD.left` offsets the ground canvas/camera and projectile bounds. The original west border opens at x0..42 / y336..532. Spider yard is(-572,160),548x472. Four nests(-474,260),(-156,260),(-474,534),(-156,534) refill after4.2s, cap2 live enemies per nest,8 total, .65s spawn grace. IDs use `spider-` separately from Slimes/dummies. Monsters leash inside their own yard; webs expire at its bounds.
- Purple weaver:40HP,speed25, .8s telegraph/2.5s cooldown,220px attack range; retreats at close range and shoots aimed, non-homing silk balls. Orange hunter:60HP,speed46, .6s telegraph/1.9s cooldown,29px melee range. Hits cost half a heart. Only silk projectiles build Webbed:34 each successful hit, respecting health invulnerability. Web speed118, range285; swept collision hits scenery/rocks and cannot tunnel through the player. Moving out of the yard or blocking sight cancels casting. Sword/fire/bomb damage and the5% Nitro drop hook apply to both species through the existing target path.
- At100 Webbed, movement/attack/items lock and Burnice lies trapped in silk with arms/legs and mouth covered, showing12 unique generated wriggle poses at8fps. Twenty distinct movement presses, button clicks or joystick direction changes free her, versus12 for Slime. Auto-repeat is ignored. Time cannot end a full bind; partial Webbed decays5/s after8 quiet seconds. Enemies stop attacks, retreat and clear in-flight silk while either restraint is active. Escape grants1.5s grace. Shared restraint input/HUD choose Webbed or sticky without stacking a second bind; Nitro pauses all new clocks; defeat uses the original defeat rendering. Full Retry resets nests, shots and status; dummy reset preserves them.
- Production art: `spiders-v12-generated.png`, `burnice-webbed-v12-generated.png`,32 individual PNGs in`spiders-v12-frames/`, four atlases and `spiders-v12-atlas.json`. Download:`spiders-webbed-v12-sprites.zip`. Source prompts:`docs/art-prompts/spiders-v12.txt`,`webbed-v12.txt`; built-in Image Generation with existing Slime style/Burnice rest identity references. `tools/prepare_spider_assets.py` selects whole components by centre using detected row gutters; spider body colour landmarks keep the attached shooting silk from shifting the body anchor. Webbed head width40, full body length73..75. All scaling is nearest-neighbour. ZIP CRC and all32 frame/atlas bytes are verified in the script. Historical sources/packs remain intact.
- Validation:104/104 Node tests pass, including22 new spider/Webbed cases plus the previous82. Browser checks confirm the connected west route,8 spawned enemies, actual silk buildup/root and the12-frame lying Webbed loop. Held W counts once without movement; items/attacks remain locked,19 total inputs remain bound and the20th frees the player. Nitro works after escape and movement returns through the gate. Inspector frame stepping reaches frame12 and displays all four new sequences. A390px iframe confirms HUD/button layout and20-click escape followed by walking back to the hub. Proofs:`output/spider-v12-bound.png`,`spider-v12-escaped.png`,`spider-v12-inspector.png`,`spider-v12-mobile.png`. Physical-device touch remains untested. The temporary narrow-screen QA page is removed after validation.

### Owner update: four-facing spiders / Webbed II (v13)

- Each species now has32 generated frames: facings down,left,right,up in that order,8 per facing (4 walk +4 attack). `spiderAtlasFrame` adds the facing offset; `spiderFacing` follows actual movement and aims casts/melee at the player. Stationary spiders do not cycle their walk animation. Windup and .28s attack recovery render distinct attack phases; facing-specific death fading retains the correct view. Source sheets:`spider-weaver-v13-generated.png`,`spider-hunter-v13-generated.png`. Inspector has four dedicated walk/attack tabs showing all facings.
- Stage-one silk now builds50 per real projectile hit (two hits) and requires28 distinct escape inputs. While Webbed, both ranged and melee spiders continue attacking; these attacks leave HP/hit count/position unchanged and reinforce a second meter instead:34 for silk,25 for melee, with a shared .7s grace between reinforcement hits. Initial bind also gives .7s reinforcement grace. Slime binding still suppresses spider attacks; Webbed still suppresses Slime attacks. Health invulnerability is deliberately separate from reinforcement grace.
- At100 reinforcement, tier2 starts with fresh progress:44 inputs within16s. Generated art adds thicker silk and an opaque eye covering. Later attacks cannot restart the timer or erase progress. `webEscapePresses` selects28/44; `advanceWebbed` owns the countdown and accepts health to mark timeout. Failure sets`webbed.failed` and`health.dead` while preserving HP, so do not assume every defeat has zero HP. Full Retry resets every new field. Escape clears both tiers and gives1.5s health grace. Nitro pauses all clocks as before.
- Timeout immediately displays Game Over and renders the same wrapped/blindfolded body with8 quiet breathing frames at4fps. It skips the normal HP-defeat spin/collapse/stars sequence; normal HP defeat remains unchanged. The last .18s of struggle settles on frame11, which is byte-identical to breathing frame0. Breathing continues after Game Over; input cannot revive failure. R/Retry work for both defeat causes. HUD shows escape progress plus reinforcement or time remaining, including narrow-screen spacing.
- Current metadata/pack:`spiders-v13-atlas.json`,`spiders-webbed-v13-sprites.zip`.100 selected frames =64 directional spiders +4 retained v12 silk shots +12 retained v12 Webbed I +12 new Webbed II +8 breathing. Total game count384. Retain v12 dependencies, all sources/drafts, individual frames and prompts. The new character source is`burnice-webbed2-v13-generated.png`; scripts:`tools/prepare_spiders_v13.py` with versioned export helper in`prepare_spider_assets.py`. Whole connected components are selected by centre in the intended grid, rejecting merged neighbours; generated layout repairs give safe transparent gutters. No fixed-cell clipping. Head width40 and lying body length74..77 are calibrated with nearest-neighbour scaling. Prompts are`docs/art-prompts/spider-*-v13*.txt`,`webbed2-v13*.txt`.
- Validation:120/120 Node tests, including16 new v13 cases plus22 updated spider checks. Tests cover four-facing frame mapping/aiming, faster binding, HP-free reinforcement, burst grace, tier transitions, both escape/deadline boundaries, failure persistence and exact struggle/rest continuity. ZIP CRC and all100 selected frame/atlas bytes are verified by the preparation script. Browser ordinary play confirms reinforcement, timer, unchanged HP at timeout, wrapped breathing Game Over and normal HP defeat. A temporary weaver-only fixture using the production runtime checks held-key rejection,44-input escape and walking afterward; the same controlled scene at390px checks the two-meter HUD and44-click escape. Inspector verifies all four species/action tabs and stage I/II/rest previews. Proofs:`output/spider-v13-four-directions.png`,`webbed2-v13-inspector.png`,`webbed2-v13-live.png`,`webbed2-v13-escaped.png`,`webbed2-v13-timeout.png`,`webbed2-v13-mobile.png`. Temporary fixture files are removed; physical-device touch remains untested.

### Owner tuning: stronger Webbed II / living world after timeout (v14)

- The built-in Image Generation edit`burnice-webbed2-v14-generated.png` adds stronger shoulder/torso/knee contractions and denser silk while retaining the eye/mouth covering, head40 scale and grounded lying orientation. Twelve struggle poses remain8fps; eight quiet breathing poses remain4fps with exact final-struggle/first-rest continuity. Screen-space body-height variation increases1→4px; average bright neutral silk pixels378→529 under the same metric. The16s/44-input second tier and all status rules remain unchanged.
- After Webbed timeout, `advanceSpidersAfterWebDefeat` keeps the arena alive. It cancels casts/recovery, clears shots, and first moves each live spider out to92px from the player's anchor, including exact overlap and wall/corner cases. It then picks seeded random targets near its own nest, with small pauses; wandering cannot come within80px of the body and still respects arena/scenery/rock collision. Facings/walk clocks continue. Spawn caps and death-effect cleanup remain active. The game-over branch also advances Slime wandering/spawns. Attacks, player input and player position stay disabled. Ordinary HP-defeat behavior is unchanged; Retry creates clean monster/status state.
- Current metadata/pack:`spiders-v14-atlas.json`,`spiders-webbed-v14-sprites.zip`. Only the20 Webbed II/rest frames change; the four-facing spider, projectile and first-tier atlases remain active dependencies. Total selection100 / game384 frames. Keep v13 assets and originals. Reproduce this edit with`tools/prepare_webbed_v14.py`; prompt:`docs/art-prompts/webbed2-v14.txt`; complete-component slicing, nearest-neighbour alignment, ZIP CRC and100 frame/atlas comparisons are retained.
- Validation:127/127 Node tests pass, including7 new v14 cases covering retreat of both species, overlap/corners/obstacles, continued random wandering, body clearance, live spawn caps and new pose selection. Browser validation checks a controlled timeout with mixed spider species initially beside the player, continued movement on successive Game Over captures, body staying fixed, the new struggle/rest inspector frames, and R resetting to the original spawn with full HP and cleared monster/status state. Proofs:`output/webbed-v14-roaming-a.png`,`webbed-v14-roaming-b.png`,`webbed-v14-inspector.png`. Temporary fixture files are removed. Physical-device touch remains untested; no input/layout change was introduced.

### Owner tuning: slower tier-two buildup / shorter deadline / still tree sprites (v15)

- Current Webbed II rules supersede the timing/buildup in v13/v14: reinforcement now adds20 per silk hit or15 per melee hit, so pure attacks require5 silk hits or7 bites after the first bind. Mixed attacks share the same100-point cap. The .7s reinforcement grace remains. First-tier28-input escape has no deadline; first-tier projectile buildup50 is unchanged. Tier two still starts a fresh44-input escape, but the deadline is now10s instead of16s. Further hits do not reset progress or extend the timer. HP-free reinforcement, heavier v14 struggle/rest art and post-timeout wandering remain unchanged.
- All9 original trees now draw generated static sprites from`trees-v15-atlas.png`, using4 fixed variants (not a time-driven sequence). Shared`TREE_POSITIONS` in`core.mjs` drives rendering and the unchanged18x16 trunk colliders. Tree sprites use96x112 canvases, anchor48,96, aligned root baseline100, nearest-neighbour sampling and existing y-depth sorting/shadows. No wind or tree motion is introduced. Visible bounds are62..76px wide /61..78px high. The inspector has a still-tree tab and supplemental download`trees-v15-sprites.zip`.
- New art:`trees-v15-generated.png`,4 individual`trees-v15-frames/tree-*.png`,atlas and`trees-v15-atlas.json`. Prompt/style reference:`docs/art-prompts/trees-v15.txt`,`output/trees-v15-before.png`; built-in Image Generation. Reproduce only these assets with`tools/prepare_trees_v15.py`; whole connected components by2x2-cell centre, no cell clipping (one canopy extends past its nominal cell), trunk-colour anchor calibration, transparent alpha and nearest-neighbour resize. The script verifies ZIP CRC,4 frame/atlas byte comparisons and identical root baselines. Current total388 frames; all existing character/monster art remains active.
- Validation:129/129 Node tests pass (47 relevant spider/Webbed/scenery checks). Boundary cases now verify5/7 pure-hit thresholds, mixed95% reinforcement staying tier one,10s failure, escape just before expiry, and the preserved first-tier progress during slower real melee buildup. Asset checks cover all4 trees and9 unchanged collision positions. Browser checks confirm the new trees in ordinary play, trunk blocking and walking behind the canopy, four still inspector cards, and real weaver shots adding20% before the10s second-tier countdown and HP-preserving timeout. Physical-device touch remains untested; no touch/input layout was changed. Browser proof files are under`output/trees-v15-*.png` and`output/webbed-v15-*.png`.

### Owner update: spider nest spawn sprite / hidden point labels (v16)

- The four spider spawn points now render one static generated silk nest in the existing ground layer instead of the procedural ellipse. Removed the per-point `NEST` and `POINT` labels/counts from spider and Slime spawn points. Slime pads, arena headings/signs, population HUD, positions, collision, spawn timing/caps and AI remain unchanged.
- Built-in Image Generation source: `dist/assets/spider-nest-v16-generated.png`. Runtime: `spider-nest-v16-atlas.png`; individual frame: `spider-nest-v16-frames/nest-0.png`; metadata: `spider-nest-v16-atlas.json`. One transparent96x64 frame, anchor48,40, nearest-neighbour scaling. Prompt: `docs/art-prompts/spider-nest-v16.txt`; reproduce only this asset with `tools/prepare_spider_nest_v16.py`. Current production selection389 frames. The entry script cache version is16.
- Validation:46 relevant spider/Slime/scenery checks and all129 Node tests pass; JavaScript syntax, transparent sprite bounds and individual-frame/atlas equality verified. Browser automation did not provide a usable game view, so in-browser appearance and physical-device touch were not verified for this change.

### Owner tuning: one live slash wave / short spin rays (v17)

- Normal sword waves retain300px travel but cannot emit while any sword wave remains alive. A suppressed slash is consumed immediately and never queues a wave; a fresh slash can emit after the previous projectile hits scenery/target or expires. Charged spin retains its eight rays/ring; rays now travel80px instead of300px. Each wave carries its own range for collision expiry and visual fading. Full-heart gating, speed, damage and shared per-attack hit history remain unchanged.
- Validation scoped as requested by owner:88 relevant fire/combat/bomb/Slime/spider/Nitro tests pass, including rapid slashes, no delayed emission, collision unlocking, short spin range and preserved normal range. No full-suite or browser/device checks performed for this change.

## Art workflow

1. Use existing `*-generated.png` sheets as identity/style/pose references with Image Generation.
2. Request consistent pixel scale, complete bodies/effects, transparent gutters, fixed grid, frame order and feet; allow enough canvas for the whole blade.
3. Inspect the generated sheet before slicing; generation does not guarantee exact cells.
4. Segment, trim unrelated subjects, align at the correct origin, resize with nearest-neighbour. Match body height and head width, not total image bounds including sword/glow.
5. Export both atlas and individual RGBA PNG frames; record metadata and timing.
6. Update the relevant loader/renderer/inspector and validate bounds, visual continuity and tests.

Image-generation access depends on the destination Codex client's tools and account settings. Ask it to use the available image-generation capability/skill; attaching the same source PNGs preserves visual context. If unavailable there, generate sheets in ChatGPT and copy the resulting PNGs into the project for Codex to slice and integrate. Do not assume the old chat attachments, credentials or tool configuration moved with the ZIP.

Do not run the entire historical asset pipeline on startup. Tools overwrite atlases and rebuild ZIPs; use the specific tool needed for a planned asset edit. Prompt history is retained in `docs/DEVELOPMENT-HISTORY.md`.

## Validation and known limits

The exported baseline is 45 passing Node tests. The handoff also checks local HTTP asset delivery, current metadata paths and archive integrity. These checks do not establish Windows GUI/browser behavior or real-device touch quality.

Before a gameplay change, reproduce the issue. After changes, run the relevant suite and the full existing tests. Use the sprite inspector's pause/frame-step to compare left/right slashes, charge-walk size, shooter/projectile frames, collapse/rest arm continuity, and all three Nitro phases. Test HP/full-heart gating, delayed healing, one-hit-per-target behavior, and the keyboard/touch controls when their paths change.

The map is drawn in `game.mjs` and collision shapes are in `core.mjs`; an editor/Tiled import has not been implemented. There is no save/load persistence. Slime and spider AI belong to their respective practice arenas.

## Export provenance

All 485 tracked files from the source commit were retained byte-for-byte. Two were relocated: the original README is now `docs/DEVELOPMENT-HISTORY.md`; `.openai/hosting.json` is now `docs/original-site-hosting.json`, inactive reference data. No `.git` history or login credentials are included. `docs/SOURCE-MANIFEST.json` records per-file SHA-256.

The root README, Codex instructions, optional Python requirements, Windows launcher, Node package/scripts and handoff documents were added for portability. Burnice White / Zenless Zone Zero belongs to HoYoverse; this is an unofficial fan prototype.
