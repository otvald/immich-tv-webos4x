# Legacy Build Strategy

This project supports webOS 4.x / LG C9 inside the main `immich-tv-webos` codebase. The legacy build is not a fork and must not become one.

## Goals

- Keep one shared application core.
- Isolate webOS 4.x differences at target-specific edges.
- Allow modern and legacy packages to be installed side-by-side.
- Keep Chrome 53 compatibility verifiable with automated tooling.
- Require real LG C9 validation before claiming production readiness.

## Non-goals

- Do not create a separate legacy app directory.
- Do not duplicate screens for legacy.
- Do not patch or fork Enact/Sandstone unless the browser API cannot be safely polyfilled.
- Do not use desktop browsers, `npm run serve`, or emulator behavior as proof that C9 works.

## Build targets

The build target is selected with `WEBOS_TARGET`:

```bash
WEBOS_TARGET=modern npm run pack:modern
WEBOS_TARGET=legacy npm run pack:legacy
```

The Makefile wraps these commands and creates installable IPKs:

```bash
make pack-modern
make pack-legacy
make install-modern
make install-legacy
```

Legacy artifact:

```text
webos-build/dk.otvald.immichtv.legacy_1.2.2_all.ipk
```

Modern artifact:

```text
webos-build/dk.otvald.immichtv_1.2.2_all.ipk
```

## Metadata separation

`tools/generate-appinfo.mjs` generates `webos-meta/appinfo.json` for the selected target.

The legacy package uses a different app ID and title:

```text
dk.otvald.immichtv.legacy
Immich TV Enhanced Legacy
```

This prevents a legacy test install from overwriting the modern app on the same TV.

## Compatibility layers

Legacy support belongs at the edges:

- `src/platform/*`: target detection and capability gates.
- `src/compat/*`: browser API, storage, network, media, and performance adapters.
- `src/polyfills.ts`: always-loaded feature-checked polyfills needed by the modern floor.
- `src/compat/polyfills-legacy.ts`: webOS 4.x-only feature-checked polyfills.
- View-level legacy loaders only when modern data hooks are known to fail on Chrome 53.

Business logic and screen structure should stay shared.

## Polyfill strategy

There are two polyfill tiers.

### Always-loaded polyfills

`src/polyfills.ts` contains feature-checked polyfills required below the modern webOS floor, such as Chrome 68 gaps. These must be safe no-ops when the browser already supports the API.

### Legacy-only polyfills

`src/compat/polyfills-legacy.ts` contains Chrome 53 / webOS 4.x gaps. It is applied only when the runtime is legacy.

Legacy activation must support more than build-time environment variables because packaged TV runtime metadata can differ from local build assumptions. Current activation checks:

- `WEBOS_TARGET=legacy`
- packaged app ID includes `legacy`
- runtime `PalmSystem.appid` includes `legacy`

Examples of legacy-only browser gaps handled here:

- `Promise.prototype.finally`
- `Promise.allSettled`
- `String.prototype.matchAll`
- `Object.hasOwn`
- `Element.prototype.scrollTo`
- `Element.prototype.scrollBy`

When Enact/Sandstone uses a browser API missing on Chrome 53, prefer adding a feature-checked polyfill here instead of changing Enact.

## Syntax strategy

The legacy bundle must parse as Chrome 53.

Build flow:

1. `npm run pack:legacy` builds the production bundle.
2. `tools/transpile-legacy.mjs` transpiles and parse-validates the bundle for Chrome 53.
3. `npm run audit:legacy` runs `tools/audit-bundle.mjs` against `dist/main.js`.

`audit:legacy` is the source of truth for syntax compatibility. It can report advisory heuristic hits after parse validation; those are not blockers by themselves.

## Diagnostics-first workflow

On C9, `ares-inspect`, `ares-log`, and `ares-shell` can be unavailable or unreliable. The app therefore includes target-visible diagnostics:

- Diagnostics panel JSON export.
- Stored error log in `localStorage` key `immich-tv-error-log`.
- Full-screen runtime error overlay with recent stored errors.
- Debug overlays toggled by the blue key.

When fixing C9 issues, capture target evidence first, then patch the smallest edge-compatible gap.

## Build verification checklist

Before saying the legacy build is ready to install, run automated checks against the current tree:

```bash
npm run typecheck
npm run test
make pack-legacy
npm run audit:legacy
```

For a narrower compatibility-only patch, the focused Diagnostics test can be useful during iteration, but it is not a replacement for the full test suite before release-candidate packaging:

```bash
npx jest src/views/DiagnosticsPanel/DiagnosticsPanel.test.tsx
```

`make pack-legacy` must produce an installable IPK under `webos-build/`, and `npm run audit:legacy` must not report blocking Chrome 53 parse or compatibility failures. Advisory heuristic hits after parse validation should be reviewed, but they are not blockers by themselves.

## Testing strategy

Testing has three levels. Passing a lower level does not prove the higher level.

### 1. Static and automated tests

Required for any legacy release candidate:

1. TypeScript check: `npm run typecheck`
2. Jest suite: `npm run test`
3. Legacy package build: `make pack-legacy` or `npm run pack:legacy` plus `ares-package`
4. Legacy syntax audit: `npm run audit:legacy`

These checks prove the source compiles, tests pass, the bundle can be generated, and the final bundle is intended to parse on Chrome 53. They do not prove real TV behavior.

### 2. Local development smoke checks

`npm run serve` is useful for fast UI iteration, but it runs in a desktop browser and does not emulate webOS 4.x, LG WAM, Chrome 53, retail app permissions, TV memory pressure, remote-key behavior, or codec support.

Use local smoke checks only to catch obvious regressions before packaging. Never use them as evidence that C9 works.

### 3. Real-device webOS 4.x validation

Before saying the legacy build is production-ready, validate the exact IPK on a real LG C9 / webOS 4.x device.

Minimum smoke checklist:

1. Install and launch the exact legacy IPK being evaluated.
2. Confirm the login screen renders.
3. Log in with a known-good Immich account or API key.
4. Open Photos and scroll through a realistic timeline sample.
5. Open Albums, select an album, and open several assets.
6. Open Search, run a text/person search, and open several results.
7. Use the PLAY-key random play behavior in Photos, Albums, and Search when those contexts are available, then STOP to stop it.
8. Open Diagnostics, export/capture the JSON, and verify the stored error log is readable.
9. Watch for WAM reloads, fatal overlays, hangs, broken focus, or repeated network/API failures during at least a few minutes of active use.

Device validation evidence should record:

- IPK filename and app ID.
- Device model and webOS firmware version.
- Immich server version when relevant.
- Date/time of the test.
- Smoke checklist pass/fail notes.
- Diagnostics JSON or photos of on-TV diagnostics/error overlays.

Do not write release notes such as "validated on LG C9", "production-ready on webOS 4.x", or "supports C9" unless that evidence exists for the tested IPK.

## Device testing commands

Install and relaunch the legacy package:

```bash
ares-install --device lg-tv webos-build/dk.otvald.immichtv.legacy_1.2.2_all.ipk
ares-launch --device lg-tv --close dk.otvald.immichtv.legacy
ares-launch --device lg-tv dk.otvald.immichtv.legacy
```

Do not treat a desktop browser, `npm run serve`, or a successful package build as a substitute for real C9 validation.

## Decision rule

If a webOS 4.x issue appears:

1. Confirm with diagnostics or target evidence.
2. Prefer a feature-checked compat/polyfill fix at the edge.
3. Keep shared screens and business logic unchanged when possible.
4. Rebuild and audit the legacy IPK.
5. Retest on the real TV.
