# Export validation — 2026-10-18

- Source commit: `2a5f3db146dda14d2c680d1c0f85ad32a725b25c`.
- All 485 tracked source files retained byte-for-byte; checked against SHA-256 manifest.
- Original README and Site binding relocated as documented; original game files unchanged.
- Exported package: `npm test` passed all 45 tests, zero failures/skips.
- Dependency-free dev server started using Node.js v24.19.0 on Linux, including from a different current directory.
- HTTP checks passed for index, CSS, game module, current metadata and all 19 runtime texture files (23 resources).
- All 200 combined combat/item/effect metadata frame files and atlas paths exist; movement pack retained separately.
- All relative ES-module imports resolve.
- JS/CSS/PNG/JSON/ZIP MIME types, HEAD behavior, missing-file, invalid URL, traversal and unsupported-method responses checked.
- Windows launcher and Windows instructions are provided, but the GUI/launcher was not executed on a Windows computer during export.
- Browser rendering, real touch devices and newly generated art were not re-tested for this source-only handoff.

Archive integrity is checked separately after creation. Source checksums are in `SOURCE-MANIFEST.json`.
