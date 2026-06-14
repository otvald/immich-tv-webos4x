# Immich TV Enhanced (LG webOS)

**Immich TV Enhanced** is a read-only client for [Immich](https://immich.app/) designed for LG webOS TVs. It is built with [Enact](https://enactjs.com/) and Sandstone, and is navigated with the TV remote.

This repository is a fork of [Seeky91/immich-tv-webos](https://github.com/Seeky91/immich-tv-webos). The fork is not intended to be a forever fork; the goal is to validate and maintain webOS 4.x/C9 support, diagnostics, settings, random slideshow, and related improvements with the hope that suitable changes can be merged back into the original Immich TV project.

---

## ✨ Features

* **Timeline View**: Infinite-scrolling photo/video timeline grouped by date.
* **Albums**: Browse Immich albums and explore each album with a date-grouped timeline.
* **Search**: Smart text search powered by Immich's ML backend, plus face/person search through a People ribbon.
* **Multiple accounts**: Add multiple Immich servers or accounts and switch between them.
* **Justified Grid**: Layout that respects original aspect ratios while maintaining aligned rows.
* **Virtualized List**: DOM node recycling via `VirtualList` for smoother performance on large libraries.
* **NavigationRail**: Collapsible left sidebar for switching between Photos, Albums, Search, and Settings.
* **Settings**: Configure random-play timing, tile sizes, remote key mappings, and optional bundled music playback from the TV UI.
* **Random Play**: Press **PLAY** to start a timed random slideshow in the current Photos, Album, or Search context; press **STOP** to stop it.
* **Remote-first controls**: D-pad and media-key integration through webOS Spotlight focus management.
* **Authentication**: Supports API key and login credentials.
* **Video Playback**: Video support through Sandstone media components.
* **Diagnostics**: Export runtime diagnostics, capture remote key samples, clear stored error logs, and toggle legacy debug overlays from the app.

---

## 🧩 Compatibility

The app supports dual targeting from a single codebase:

| Target | Command | App ID | Notes |
| :--- | :--- | :--- | :--- |
| **Modern** | `npm run pack:modern` | `dk.otvald.immichtv` | webOS 5.0+ / modern Chromium target |
| **Legacy (Beta)** | `npm run pack:legacy` | `dk.otvald.immichtv.legacy` | webOS 4.x / LG C9-class target with extra transpilation, polyfills, and compatibility shims |

Legacy remains beta until each release candidate is validated on real webOS 4.x hardware. Do not treat `npm run serve`, a desktop browser, emulator behavior, or a successful package build as proof of LG C9/webOS 4.x compatibility.

---

## 📥 Installation

### Homebrew Channel for upstream builds

The original Immich TV app is published in the [webOS Homebrew Channel](https://www.webosbrew.org/) as `com.seeky91.immichtv`.

1. Install the Homebrew Channel on your TV — see the [webosbrew install guide](https://www.webosbrew.org/pages/install.html).
2. Open it, find [Immich TV](https://repo.webosbrew.org/apps/com.seeky91.immichtv), and install.
3. Launch it from your TV's app launcher.

### Fork releases and manual sideload

Fork release assets use the Otvald app IDs so modern and legacy builds can be installed side-by-side:

```bash
# Modern
npx ares-install ./webos-build/dk.otvald.immichtv_*.ipk --device <device-name>

# Legacy
npx ares-install ./webos-build/dk.otvald.immichtv.legacy_*.ipk --device <device-name>
```

Makefile wrappers are also available:

```bash
make pack-modern
make pack-legacy
make install-modern
make install-legacy
make launch-modern
make launch-legacy
```

`make install` defaults to the modern package. Use `make install-legacy` for webOS 4.x.

---

## 🌐 Immich server setup (CORS)

The app runs from a `file://` origin and calls the Immich API cross-origin. Immich ships no `Access-Control-Allow-Origin` headers by default, so whether it works out of the box depends on TV firmware and package metadata.

The packaged legacy fork is intended for direct Immich API/API-key access and should not need a separate CORS proxy; `appinfo.json` enables the webOS runtime cross-domain path. Desktop development via `npm run serve` is different and may still hit browser CORS because it is not the packaged TV runtime.

If a firmware still enforces browser-like CORS, Immich may log the request as `200 OK` while the TV blocks the response and the login screen shows:

> Couldn't reach the server. Verify the URL and that your Immich server allows requests from this app (CORS).

If you hit that error, allow this app's requests server-side. With nginx in front of Immich:

```nginx
add_header Access-Control-Allow-Origin  "*" always;
add_header Access-Control-Allow-Headers "Authorization, x-api-key, Content-Type" always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;

if ($request_method = OPTIONS) {
    return 204;
}
```

The equivalent directives work for Caddy, Traefik, or any reverse proxy. The app authenticates with `Authorization` / `x-api-key` headers and uses no cookies, so a wildcard origin is safe here.

---

## 🛠️ Building from source

### Prerequisites

* [Node.js](https://nodejs.org/) 20+
* [Enact CLI](https://enactjs.com/docs/developer-tools/cli/) — `npm install -g @enact/cli`
* [webOS CLI (ares)](https://webostv.developer.lge.com/develop/tools/cli-installation/) — `npm install -g @webos-tools/cli@3.2.3`

Pin `@webos-tools/cli` to `3.2.3`: version `3.2.4` ships a rimraf 6 regression that breaks `ares-package`.

### Setup

```bash
git clone https://github.com/otvald/immich-tv-webos4x.git
cd immich-tv-webos
npm install
```

### Develop

```bash
npm run serve
```

The dev server runs from `http://localhost`, so normal browser cross-origin rules apply.

### Quality gates

```bash
npm run lint
npm run typecheck
npm run test
node tools/architecture-guard.js
npm run audit:legacy
```

Before installing or sharing a legacy IPK, run:

```bash
npm run typecheck
npm run test
npm run pack:legacy
npm run audit:legacy
```

`npm run pack:legacy` generates the legacy metadata, builds the production bundle, and runs the Chrome 53 transpile/parse validation step. `npm run audit:legacy` checks the final `dist/main.js` bundle for legacy syntax compatibility.

---

## 📺 TV remote shortcuts and settings

| Action | Default remote key |
| :--- | :--- |
| Start random slideshow in current context | **PLAY** (`415`) |
| Stop random slideshow | **STOP** (`19`) |
| Previous / next photo in media viewer | **Arrow Left** (`37`) / **Arrow Right** (`39`) |
| Toggle legacy debug overlays | **BLUE** (`406`) |
| Back / close current panel | **BACK** (`461`) plus built-in fallback variants |
| Exit app attempt | **Backspace** (`8`) outside text fields |

The **Settings** tab is available from the left rail. Settings are saved immediately to `localStorage` and loaded on app start.

Configurable settings:

* Random slideshow time per view: default `5s`.
* Photos/timeline tile scale: default original `1×`.
* Album overview card scale: default `2×`.
* Remote key mappings for Back, Previous, Next, random play, random stop, diagnostics toggle, and exit app.
* Optional bundled MP3 music shuffle: disabled by default. The app displays bundled music license text below the music setting.

To find a key code for remapping, open Diagnostics and press the remote button you want to assign.

---

## 🎵 Bundled music assets

Music files are packaged from `mp3/`. Every `mp3/<name>.mp3` must have a matching nonempty `mp3/<name>.license`; otherwise `npm run music:manifest` and package builds fail.

To add music to the app package:

1. Add the MP3 file to `mp3/`, for example `mp3/My Song.mp3`.
2. Add a matching license file with the exact same base name, for example `mp3/My Song.license`.
3. Put the required attribution/license text in the `.license` file. It must not be empty.
4. Run `npm run music:manifest` to regenerate the in-app music manifest.
5. Build normally with `npm run pack:modern`, `npm run pack:legacy`, `make pack-modern`, or `make pack-legacy`.

The generated app shuffles all valid licensed MP3 files when music is enabled in Settings. Invalid pairs are rejected during manifest generation/build instead of being silently packaged.

---

## 🏗️ Architecture

The project follows a **shared core, target-specific edge** architecture.

* **Shared Core**: Business logic and UI components are unified.
* **Target-Specific Edge**: Platform-specific adaptations, polyfills, API shims, syntax auditing, and metadata are isolated at the application boundaries.
* **No Fork Rule**: Legacy support should not duplicate screens or app cores; changes should remain suitable for eventual upstreaming where possible.

Key areas:

* `src/domain/` — `PhotoRepository` interface and `RepositoryContext` provider.
* `src/api/` — concrete Immich repository, HTTP client, and Immich response types.
* `src/hooks/` — TanStack Query wrappers plus webOS UI hooks.
* `src/views/` and `src/components/` — TV UI built on Enact + Sandstone.
* `tools/transpile-legacy.mjs` and `tools/audit-bundle.mjs` — legacy Chromium 53 build and audit path.

---

## ⚠️ Known limitations (legacy)

* **Status**: Beta until verified on a real LG C9/webOS 4.x device for the specific IPK being released.
* **Access mode**: Legacy is intended for Immich API/API-key access.
* **CORS**: No extra CORS proxy should be needed for the installed legacy webOS app. Desktop development via `npm run serve` is different and may still hit browser CORS.
* **Performance**: High-resolution animations and large libraries may be slower on webOS 4.x hardware.
* **Diagnostics**: Prefer the in-app Diagnostics panel and stored error log. `ares-inspect`, `ares-log`, and `ares-shell` may be unreliable or unavailable on some retail TV profiles.
* **Validation**: Desktop browsers and `npm run serve` are development aids only; they do not emulate Chrome 53/webOS 4.x.

---

## ⚖️ Disclaimer

Immich TV is an unofficial, third-party client. It is not affiliated with or endorsed by the Immich project. Provided as-is for personal use on LG Smart TVs.

---

## 📄 License

This repository is mixed-license:

| Material | License |
| :--- | :--- |
| Source code and tooling | MIT License |
| Bundled MP3 music assets | Creative Commons Attribution 4.0 International (CC BY 4.0) |

Source code and tooling are licensed under the MIT License. See [`LICENSE`](./LICENSE).

The included music files are **not** MIT licensed:

* "Inner Light" by Kevin MacLeod (incompetech.com)  
  Source: <https://incompetech.com/>  
  Licensed under Creative Commons Attribution 4.0 International  
  <https://creativecommons.org/licenses/by/4.0/>  
  No changes were made.

* "Perspectives" by Kevin MacLeod (incompetech.com)  
  Source: <https://incompetech.com/>  
  Licensed under Creative Commons Attribution 4.0 International  
  <https://creativecommons.org/licenses/by/4.0/>  
  No changes were made.

Per-track license text is stored next to each MP3 in `mp3/*.license` and displayed in app Settings. See [`NOTICE`](./NOTICE) for bundled asset attribution.

---

## 💸 Support

If Immich TV is useful to you, you can leave a tip in Bitcoin — entirely optional, the project is and will remain free and open-source.

```text
bc1qvxczfmurlglff6zmkgysnxy2yglvwspalcd373
```
