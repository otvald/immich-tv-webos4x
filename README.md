# Immich TV Enhanced (LG webOS)

**Immich TV Enhanced** is a read-only client for [Immich](https://immich.app/) designed for LG webOS TVs. Built with the **Enact** framework and **Sandstone** UI library.

This is a fork of [Seeky91/immich-tv-webos](https://github.com/Seeky91/immich-tv-webos). The fork is not intended to be a forever fork; the goal is to validate and maintain the webOS 4.x/C9 support, diagnostics, settings, random slideshow, and related improvements with the hope that suitable changes can be merged back into the original Immich TV project.

---

## 🚀 Key Features

* **Timeline View**: Infinite-scrolling photo/video timeline grouped by date.
* **Albums**: Browse your Immich albums and explore each one with a date-grouped timeline.
* **Search**: Smart text search powered by Immich's ML backend, plus face/person search via a People ribbon.
* **Justified Grid**: Layout that respects original aspect ratios while maintaining aligned rows.
* **Virtualized List**: DOM node recycling via `VirtualList` for smooth performance on large libraries.
* **Timeline Height Calculation**: Uses Immich API metadata to pre-calculate total content height for a stable scrollbar.
* **NavigationRail**: Collapsible left sidebar (expands on D-pad focus) for switching between Photos, Albums, and Search.
* **Settings**: Configure random-play timing, photo tile size, album card size, and optional bundled music playback from the TV UI.
* **Random Play**: Press **PLAY** to start a timed random slideshow in the current Photos, Album, or Search context; press **STOP** to stop it.
* **Native Focus Management**: Integration with the webOS Spotlight (D-pad) navigation system.
* **Authentication**: Supports API Key and login credentials.
* **Video Playback**: Support for video files using Sandstone media components.
* **Diagnostics**: Export runtime diagnostics, capture remote key samples, clear stored error logs, and toggle legacy debug overlays from the app.

---

## 🛠️ Technical Stack

| Technology | Usage |
| :--- | :--- |
| **Enact Framework** | LG's React-based framework optimized for webOS |
| **Sandstone UI** | Native TV component library for premium look & feel |
| **TypeScript** | Strict typing for codebase robustness and reliability |
| **TanStack Query (v5)** | Server state management, caching, and infinite scroll logic |
| **Immich API** | Direct integration with the Immich "Internal" API endpoints |

---

## 📦 Installation & Development

### Compatibility
- **Modern**: webOS 5.0+ (LG TVs from 2018 onward, including OLED CX 2020).
- **Legacy (Beta)**: webOS 4.x (LG C9 2019-class TVs). The legacy target uses extra transpilation, feature-checked polyfills, and compatibility shims from the same codebase. It remains beta until each release candidate is validated on real webOS 4.x hardware. Legacy is intended for direct Immich API access with an API key; it does not require a separate CORS proxy when installed as the packaged webOS app.

### Multi-Target Builds
The app supports dual targeting from a single codebase:

| Target | Command | App ID | Notes |
| :--- | :--- | :--- | :--- |
| **Modern** | `npm run pack:modern` | `dk.otvald.immichtv` | Native ES2020+ |
| **Legacy** | `npm run pack:legacy` | `dk.otvald.immichtv.legacy` | Transpiled/Polyfilled |

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

### Legacy webOS 4.x build and verification

Legacy uses the Immich API directly and is tested around API-key access. You should not need to configure CORS for the packaged legacy app; the webOS package metadata enables the TV runtime cross-domain path. If you test in a desktop browser with `npm run serve`, browser CORS rules still apply because that is not the packaged TV runtime.

Before installing or sharing a legacy IPK, run:

```bash
npm run typecheck
npm run test
npm run pack:legacy
npm run audit:legacy
```

`npm run pack:legacy` generates the legacy metadata, builds the production bundle, and runs the Chrome 53 transpile/parse validation step. `npm run audit:legacy` checks the final `dist/main.js` bundle for legacy syntax compatibility.

For device testing:

```bash
make install-legacy
make launch-legacy
```

Then smoke-test login, timeline browsing, album browsing, search, media opening, and Diagnostics JSON export on the TV. Do not treat `npm run serve`, a desktop browser, or a successful package build as proof of LG C9/webOS 4.x compatibility. Real-device diagnostics are required before calling the legacy target production-ready.

#### Installation
1. Ensure your TV is in **Developer Mode**.
2. Install the desired target:
```bash
# Modern
npx ares-install ./webos-build/dk.otvald.immichtv_*.ipk --device <device-name>

# Legacy
npx ares-install ./webos-build/dk.otvald.immichtv.legacy_*.ipk --device <device-name>
```

### Known Limitations (Legacy)
- **Status**: Beta until verified on a real LG C9/webOS 4.x device for the specific IPK being released.
- **Access mode**: Legacy is intended for Immich API/API-key access only.
- **CORS**: No extra CORS proxy should be needed for the installed legacy webOS app. Desktop development via `npm run serve` is different and may still hit browser CORS.
- **Performance**: High-resolution animations and large libraries may be slower on webOS 4.x hardware.
- **Diagnostics**: Prefer the in-app Diagnostics panel and stored error log. `ares-inspect`, `ares-log`, and `ares-shell` may be unreliable or unavailable on some retail TV profiles.
- **Validation**: Desktop browsers and `npm run serve` are development aids only; they do not emulate Chrome 53/webOS 4.x.

---

### TV remote shortcuts and settings

| Action | Remote key |
| :--- | :--- |
| Start random slideshow in current context | **PLAY** (`415`) |
| Stop random slideshow | **STOP** (`19`) |
| Toggle legacy debug overlays | **BLUE** (`406`) |
| Dismiss boot error overlay | **BACK**, **YELLOW**, or **Escape** |
| Exit app attempt | **Backspace** (`8`) outside text fields |

The **Settings** tab is available from the left rail. Settings are saved immediately to `localStorage` when changed and are loaded on app start.

Configurable settings:

* Random slideshow time per view: default `5s`.
* Photos/timeline tile scale: default original `1×`.
* Album overview card scale: default `2×`.
* Optional bundled MP3 music shuffle: disabled by default. The app displays all bundled music license text below the music setting.

Music files are packaged from `mp3/`. Every `mp3/<name>.mp3` must have a matching nonempty `mp3/<name>.license`; otherwise `npm run music:manifest` and package builds fail.

To add music to the app package:

1. Add the MP3 file to `mp3/`, for example `mp3/My Song.mp3`.
2. Add a matching license file with the exact same base name, for example `mp3/My Song.license`.
3. Put the required attribution/license text in the `.license` file. It must not be empty.
4. Run `npm run music:manifest` to regenerate the in-app music manifest.
5. Build normally with `npm run pack:modern`, `npm run pack:legacy`, `make pack-modern`, or `make pack-legacy`.

The generated app shuffles all valid licensed MP3 files when music is enabled in Settings. Invalid pairs are rejected during manifest generation/build instead of being silently packaged.

---

## 🏗️ Project Architecture
The project follows a **"Shared Core, Target-Specific Edge"** architecture. 
- **Shared Core**: All business logic and UI components are unified.
- **Target-Specific Edge**: Platform-specific adaptations (polyfills, API shims) are isolated at the application boundaries.
- **No Fork Rule**: Maintaining separate branches or directories for legacy code is strictly forbidden to ensure maintainability.

### Maintainer Guidance
- **Additions**: New features must be tested against both targets.
- **Guards**: Use `npm run audit:legacy` to ensure no ES2016+ syntax leaks into the legacy bundle.
- **Target Detection**: Use the `useTarget` hook for platform-conditional logic.

---

### Cross-origin requests (CORS)
The app loads from `file://` and fetches the Immich API cross-origin. Immich does not ship CORS headers by default, so without help every browser blocks the response.

The `appinfo.json` ships `trustLevel: "netcast"` + `vendorExtension.allowCrossDomain: true`. These are LG-WAM-specific flags (undocumented by LG, well-known in the webosbrew community — same combo used by `youtube-webos`) that disable CORS validation for installed retail apps. They are silently ignored on webOS OSE / non-retail builds, and recent retail webOS (10.x+) doesn't need them, so adding them is safe across the board.

If the bypass still doesn't apply for your firmware (you'll see "Couldn't reach the server. Verify the URL and that your Immich server allows requests from this app (CORS)" in the login panel), configure CORS server-side: add `Access-Control-Allow-Origin: *` to every Immich API response and answer `OPTIONS` with `204` (typically via the Caddy/Nginx/Traefik proxy in front of Immich).

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or v20 recommended)
* [Enact CLI](https://enactjs.com/docs/developer-tools/cli/): ``` npm install -g @enact/cli ```
* [webOS CLI (Ares)](https://webostv.developer.lge.com/develop/tools/cli-installation/): ``` npm install -g @webos-tools/cli ```

### Project Setup
```bash
git clone https://github.com/Seeky91/immich-tv-webos.git
cd immich-tv-webos
npm install
```

### Development (PC)
To bypass CORS issues during local development, use the configured proxy or launch your browser with security disabled.
```bash
npm run serve
```

### Deployment to TV
1. Ensure your TV is in **Developer Mode** and on the same network.
2. Call your device "lg-tv" (or modify the name in the Makefile), then:
```bash
make install   # builds and deploys the .ipk to the TV
make launch    # launches the app
```

---

## 🏗️ Project Architecture

* `src/api/` — HTTP client, auth header injection, Immich API calls, and strict type definitions.
* `src/hooks/` — All data and UI logic:
  * Auth: `useAuth`
  * Asset data: `useInfiniteGroupedAssets`, `useAllAssets`, `useBuckets`
  * Albums: `useAlbums`, `useAlbumDetails`
  * Search: `useImmichSearchResults`, `useImmichPeople`
  * Performance: `useHeightMap`, `useScrollPagination`
  * webOS: `useWebOSKeys` (D-pad remote key handling)
* `src/views/` — Primary screens: `LoginPanel`, `AppLayout`, `MainPanel` (timeline), `AlbumsPanel`, `AlbumView`, `SearchPanel`.
* `src/components/` — Atomic UI units: `AssetCard`, `AlbumCard`, `NavigationRail`, `GroupedTimeline`, `MediaViewer`, `PeopleRibbon`, `DateHeader`.
* `src/utils/` — Justified layout engine, height map calculation, date/duration formatting, localStorage helpers.

---

## ⚖️ Disclaimer

This is an unofficial third-party client. It is not affiliated with the official Immich development team. The application is provided "as is," optimized for personal use on LG Smart TVs.

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

Per-track license text is stored next to each MP3 in `mp3/*.license` and displayed in the app Settings. See [`NOTICE`](./NOTICE) for the bundled asset attribution notice.

---

## 💸 Support

If this app is useful to you and you'd like to drop a tip, you can send Bitcoin to:

```
bc1qvxczfmurlglff6zmkgysnxy2yglvwspalcd373
```

Totally optional — the project is and will remain free and open-source.

---


**Built with ❤️ for the Immich community.**
