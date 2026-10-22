# Deployment

## GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`.

1. In GitHub, open **Settings > Pages**.
2. Set **Build and deployment > Source** to **GitHub Actions**. This first-time activation must be done once in the browser; the workflow `GITHUB_TOKEN` can deploy but cannot create the Pages site.
3. Push to `main`, or run the workflow manually.
4. The game is published at `https://<user>.github.io/<repository>/`.

The workflow:

- installs dependencies with `npm ci`
- runs the test suite
- builds with the repository name as the Vite base path
- verifies the base-path build
- uploads `client/dist` as the Pages artifact
- deploys the artifact to the `github-pages` environment

Required workflow permissions are declared in the file: `contents: read`, `pages: write`, and `id-token: write`.

## Base paths

Vite uses `VITE_BASE_PATH`, defaulting to `/`.

- Local development: `/`
- Project site: `/<repository>/`
- User or organization site: `/`

The value must start and end with `/`. Runtime assets use `import.meta.env.BASE_URL`, and the PWA manifest uses relative scope and start URLs.

## Manual verification

```powershell
$env:VITE_BASE_PATH="/realm-of-legends/"
npm run build
npm run verify:pages
```

The verifier serves `client/dist` at `http://127.0.0.1:<random>/realm-of-legends/`, confirms that the HTML, bundle, manifest, and service worker are reachable, and checks that root-relative URLs do not escape the base path.

## Cache and updates

The PWA uses `registerType: "autoUpdate"` and cleans outdated caches. After a deployment:

- a new service worker is generated with hashed asset names
- online clients receive the update automatically
- the first load after an update may use the previous cached shell briefly
- a hard refresh or clearing site data forces the newest files

Saves are stored separately in IndexedDB and are not removed by a service-worker update. Clearing site data or using a different origin does remove them.

## Rollback

Revert the deployment commit and push to `main`. The workflow rebuilds and deploys the previous revision. Old service-worker caches are cleaned automatically.

## Local production preview

```bash
npm run build
npm run preview
```

If the build was created with a non-root base path, use the same path when opening the preview URL.

## Storage notes

- IndexedDB is scoped to the exact origin. `https://user.github.io/repo/` and `http://localhost:5173/` do not share saves.
- Export heroes from Settings before moving browsers, devices, or domains.
- Private browsing modes may block IndexedDB or clear it when the session ends.
