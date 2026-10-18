# Burnice Pixel Walk — project instructions

Read `CODEX_HANDOFF.md` before changing gameplay or assets. Reply to the owner in Thai.

## Start and validate

- This is a buildless HTML/CSS/Canvas/ES-module game. Preserve the existing architecture unless the owner requests a migration.
- Node.js 20+ is enough. `npm start` serves `dist/` at http://127.0.0.1:4173. `npm test` runs the existing suite without package installation. On Windows PowerShell, `npm.cmd` avoids npm.ps1 execution-policy issues.
- `start-game.cmd` is the Windows launcher. The server accepts a port argument: `npm start -- 4174`.
- Run the existing relevant tests after gameplay/asset changes, then the complete suite before handing off. The export baseline is 45 passing tests. Report any browser or device checks that could not be performed.
- The exported `dist/` bytes match source commit `2a5f3db146dda14d2c680d1c0f85ad32a725b25c`. Added launchers/documentation are migration helpers, not gameplay changes.

## Preserve the owner's decisions

- Eight-direction movement uses four sprite facings and equal diagonal speed. Keep feet anchored, pixel smoothing off, and character body/head size consistent across animations.
- Character, dummy, item and projectile art comes from Image Generation, then transparent frame slicing/alignment. Use supplied/generated art as references. Do not replace these sprites with procedurally drawn characters.
- Current combined metadata is `dist/assets/corrected-v8-atlas.json`. Movement metadata is `dist/assets/burnice-atlas.json`. Runtime loads several retained atlases from earlier versions; see the handoff list. Never select an older asset merely because its name looks simpler.
- Nitro-Fuel is the gold rectangular metal can with integrated gold spout, X side ribs and dark face/flame emblem. The old red/white cup is obsolete; use v8 item and held-item art.
- Preserve 48-frame / 4.6-second Nitro use, healing only after the cheer finishes, +2 hearts capped at max, one placed sample and 5% rare-drop hook.
- Preserve full sword/effect padding for horizontal slashes, calibrated charge-walking size, and sword aura pulsing after charge reaches full.
- Preserve collapse/rest arm continuity, spiral eyes and three orbiting stars. Preserve full-heart fire waves and one hit per target per attack.
- Shooter/projectile slicing must select complete source subjects by their full bounding-box centre in the intended cell. Largest-fragment or fixed-cell cropping reintroduces the previous-row dummy-foot bug.
- Map editing was deliberately deferred. No next feature has been selected in this handoff; follow the owner's next request.

## Assets and hosting

- Keep generated originals, individual frames, metadata and useful source scripts. Historical ZIP packs are included for complete reproduction; they are not the current production selection.
- Python art tools require the optional `requirements-art.txt`. Do not run all preparation scripts merely to launch the game: they overwrite generated atlases and rebuild historical packs.
- `docs/DEVELOPMENT-HISTORY.md` is the original README/history. Its absolute `/workspace/...` paths describe the old environment; use this checkout's relative paths.
- `docs/original-site-hosting.json` records the former Site binding for reference. This export intentionally has no active `.openai/hosting.json`.
- Local edits do not publish to the original Site. Publish or alter hosting only when requested by the owner. Do not add account credentials to the project.

## Hosting preference

The owner has explicitly reauthorized public GitHub Pages game hosting and automatic publishing after pushes to master. The playable website is public. Keep repository visibility private where the GitHub plan supports Pages from private repositories; do not change source visibility to public without the owner's explicit agreement. Codespaces preview configuration has been removed at the owner's request.
