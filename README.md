# Realm of Legends

An offline-first, pixel-art action RPG set in Eldoria. Choose from 15 classes, fight through six handcrafted zones, complete quests, and keep every hero in your browser.

No account, backend, or network connection is required after the first load.

## Features

- 15 playable classes with distinct resources, basic attacks, passives, and five unlockable abilities each
- Talent trees with five tiers and two choices per tier, plus respec at the trainer
- Real-time combat with projectiles, telegraphs, traps, status effects, dodge i-frames, and four bosses
- Elite monsters with Swift, Armored, Venomous, and Volatile affixes
- Three difficulty levels, New Game+ scaling, and multi-phase boss encounters
- Six zones: Eldoria Village, Whispering Forest, Sunken Barrow, Mirefen Marsh, Frostpeak Pass, and the Hollow Throne
- Item instances with affixes, upgrades, gear sets, crafting, and blacksmith services
- Quest chains, shops, a healer, training, loot, gathering, chests, and zone transitions
- IndexedDB saves with five character slots, autosave, JSON export/import, and schema migration
- Installable PWA with offline precaching and automatic service-worker updates
- Keyboard, mouse, gamepad, and touch controls with remappable keybinds
- Procedural zone ambience, boss music, responsive HUD, minimap, combat log, and accessibility labels
- Original procedurally generated pixel art and synthesized Web Audio music and effects

## Play locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173/`.

## Controls

| Input | Action |
| --- | --- |
| `WASD` / arrow keys | Move |
| Left click / `Space` | Basic attack, aimed at the cursor |
| `1`-`5` | Class abilities |
| `Shift` | Dodge in the movement direction |
| `Z` / `X` | Use quick-slot potions |
| `E` | Interact with NPCs, portals, chests, and gathering nodes |
| `I` | Inventory |
| `Q` | Quest journal |
| `T` | Talents |
| `Esc` | Close a panel or open Settings |
| Mouse | Aim skills and attacks |

All action keys can be rebound in Settings. Gamepads use the left stick/D-pad to move, the right stick to aim, A/RB to attack, B to dodge, X to interact, Y/LB and RB/LT for quick slots, and Start for Settings. Touch controls can be enabled in Settings or appear automatically on touch-capable devices.

## Production build

```bash
npm run build
npm run preview
```

The build includes type checking, bundles the game into `client/dist`, and generates the PWA service worker.

### GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` deploys on every push to `main`. On a new repository, open **Settings > Pages** once and set **Build and deployment > Source** to **GitHub Actions**. The workflow token can deploy to Pages but cannot create the Pages site itself.

For a manual project-site build, set the base path to the repository name:

```powershell
$env:VITE_BASE_PATH="/realm-of-legends/"
npm run build
npm run verify:pages
```

```bash
VITE_BASE_PATH=/realm-of-legends/ npm run build
npm run verify:pages
```

`VITE_BASE_PATH` must start and end with `/`. Use `/` for local development and user/organization sites.

## Saves and offline play

- Characters are stored in this browser's IndexedDB. Nothing is uploaded.
- The game autosaves every 30 seconds, on zone changes, and after important actions.
- Export a hero or all heroes from Settings before clearing site data or switching devices.
- Import accepts validated Realm of Legends JSON save files.
- The service worker caches the game for offline use after the first production visit.
- Clearing site data removes local saves. Exported JSON files can be imported again.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run typecheck` | Type-check core and client |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run the Playwright browser smoke tests |
| `npm run build` | Type-check and create the production build |
| `npm run preview` | Preview the production build |
| `npm run verify:pages` | Serve and verify a GitHub Pages base-path build |
| `npm run assets` | Regenerate maps, sprites, icons, and manifests |

## Project layout

```text
core/                 Headless simulation, data, progression, and save schema
  src/data/           Classes, items, monsters, NPCs, quests
  src/generated/      Generated zone data and art manifests
  src/sim/            GameSession simulation
  test/               Registry, progression, save, and session tests
client/               Phaser rendering, input, DOM UI, IndexedDB, audio
  src/game/           Boot and world scenes
  src/ui/             HUD, panels, helpers
  src/persistence/    IndexedDB repository and file import/export
  public/assets/      Generated pixel art, tilesets, maps, and icons
tools/                Procedural asset generator and Pages verifier
docs/                 Architecture and deployment notes
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## Testing

```bash
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

The Vitest suite covers class/item/quest registries, zone reachability, level progression, save validation and migration, difficulty and New Game+ scaling, boss phases, elite affixes, and the main `GameSession` flows: movement, combat, abilities, loot, quests, shops, and death. Playwright creates a hero, opens the core panels, rebinds keys, changes difficulty, and verifies touch controls in a real browser.

For a Pages deployment check:

```powershell
$env:VITE_BASE_PATH="/realm-of-legends/"
npm run build
npm run verify:pages
```

## Assets

All visual assets and sound effects are generated by this repository's tools or synthesized at runtime. No third-party art, sprites, or music is included. Phaser, Vite, and other dependencies remain under their respective licenses.

## Limitations

- Single-player only; there is no multiplayer, chat, party, trading, or cloud sync.
- Browser storage is local to one origin and one browser profile.
- Save data is validated for shape and version, but offline games cannot provide server-side anti-cheat.
- Touch controls and gamepad support are provided for accessibility and mobile play, but the interface is designed desktop-first.
