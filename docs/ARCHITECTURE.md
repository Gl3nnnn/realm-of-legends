# Architecture

Realm of Legends is a two-workspace TypeScript project. The simulation has no browser or Phaser dependency, while the client owns rendering, input, persistence, and presentation.

## Runtime flow

1. `client/src/main.ts` creates the Phaser game and the IndexedDB repository.
2. `BootScene` loads generated atlases, tilesets, tilemaps, and the font, then emits `boot-ready`.
3. The UI loads saved characters and shows character select.
4. Playing creates a `GameSession`, attaches it to the `UIManager`, and starts `WorldScene`.
5. `WorldScene.update()` reads input, calls `GameSession.step()`, applies returned events, and synchronizes Phaser sprites.
6. UI actions call `GameSession` methods directly, update the HUD, and schedule persistence.

## Core simulation

`core/src/sim/GameSession.ts` is the gameplay authority. It owns:

- player position, facing, health, resource, stats, cooldowns, and status effects
- monsters, pets, projectiles, loot, traps, and gather nodes
- quest progress, inventory, equipment, gold, and zone state
- the seeded RNG state saved with each character

`step(dt, input)` advances the simulation and returns `SimEvent[]`. Events include hits, deaths, loot, level-ups, quest updates, and zone transitions. Immediate actions such as casting or interacting drain their events through `drainEvents()`.

Data lives in `core/src/data/` and generated zone layouts live in `core/src/generated/world-data.ts`. Save schema validation and migration are in `core/src/save/schema.ts`; `SAVE_VERSION` is bumped whenever the persisted shape changes.

## Client layers

- `client/src/game/BootScene.ts`: asset preload and boot progress.
- `client/src/game/WorldScene.ts`: tilemap, cameras, entity sprites, effects, input, and zone restarts.
- `client/src/ui/UIManager.ts`: character select, HUD, modal panels, keyboard shortcuts, autosave, and event presentation.
- `client/src/ui/screens.ts`: HTML templates for panels and the ability bar.
- `client/src/ui/helpers.ts`: escaping, icons, portraits, and formatting.
- `client/src/persistence/db.ts`: IndexedDB repository, JSON export, and import validation.
- `client/src/audio/sfx.ts`: synthesized Web Audio effects.

All text interpolated into HTML passes through `esc()`. Save imports are schema-validated before reaching the simulation.

## Persistence

Saves are versioned JSON documents stored in IndexedDB. The client keeps at most five characters. Autosave runs every 30 seconds and on meaningful actions. The game persists the RNG state so reloading does not reroll the same encounter.

`GameSession.snapshot()` produces a save; `GameSession.fromSave()` restores one. Export files use the same schema and can be imported from character select or Settings.

## Assets and maps

`tools/generate-assets.mjs` uses `pngjs` to generate:

- class and NPC character atlases
- monster and boss atlases
- item, ability, and UI icons
- tilesets and portraits
- Tiled-format JSON maps
- art manifests and PWA icons

The generator also validates spawn points, portals, and important map coordinates. Generated files are committed so the game builds without rerunning the generator. Use `npm run assets` only when intentionally changing art or maps.

The client prepends `import.meta.env.BASE_URL` to every runtime asset path so project-site deployments work under `/<repo>/`.

## PWA and deployment

`vite-plugin-pwa` generates the service worker and manifest. Production builds register the service worker with automatic updates. Precache patterns include scripts, styles, HTML, maps, atlases, fonts, and icons.

The GitHub Pages workflow builds with `VITE_BASE_PATH=/<repository>/`, runs the test suite, verifies the base-path output, and uploads `client/dist` as the Pages artifact.

## Quality gates

- `npm run typecheck`
- `npm test`
- `npm run build`
- `$env:VITE_BASE_PATH="/<repo>/"; npm run build; npm run verify:pages`

`tools/verify-pages-build.mjs` serves the build under the expected base path and checks that the HTML, scripts, manifest, service worker, and required runtime strings resolve correctly.
