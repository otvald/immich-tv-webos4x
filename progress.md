# Project Progress: webOS 4.x Legacy Support

## Objective
Enable full support for webOS 4.x (specifically target LG C9) without splitting the application codebase. For the Otvald distribution fork, publish under `dk.otvald.immichtv` / `dk.otvald.immichtv.legacy` while keeping a "shared core, target-specific edge" architecture.

## Current Decisions
- **Shared Core**: All business logic, state management, and base components remain unified.
- **Target-Specific Edge**: Platform differences (API polyfills, layout adjustments) are isolated at the application boundaries.
- **No Fork Policy**: Zero code duplication for screens or main features.
- **Real C9 Release Gate**: Final verification must occur on a real LG C9 device before release.
- **Diagnostics First**: No implementation proceeds without a corresponding diagnostic or test confirming the need and the fix.

## Build System

### Target-Specific Builds
The project supports explicit modern/legacy build flows via `WEBOS_TARGET` environment variable:

#### Modern Build (webOS 5.0+, Chrome 79+)
```bash
# NPM script
npm run pack:modern

# Makefile
make pack-modern
make install-modern
make launch-modern

# Details
- App ID: dk.otvald.immichtv (modern)
- Title: "Immich TV Enhanced"
- Transpilation: None (native ES2020+)
- Target: Chrome >= 79
```

#### Legacy Build (webOS 4.x, Chrome 53/68-class)
```bash
# NPM script
npm run pack:legacy

# Makefile
make pack-legacy
make install-legacy
make launch-legacy

# Details
- App ID: dk.otvald.immichtv.legacy (legacy beta)
- Title: "Immich TV Enhanced Legacy"
- Transpilation: chrome68 via esbuild (tools/transpile-legacy.mjs)
- Polyfills: globalThis injected inline, runtime polyfills in src/polyfills.ts
- Target: webOS 4.x (LG C9 2019, etc.)
```

### Side-by-Side Installation
The legacy build uses a separate app ID (`dk.otvald.immichtv.legacy`) to enable:
- Testing both versions on the same device
- Beta testing webOS 4.x support without disrupting production users
- Clear visual distinction in the webOS launcher

### Metadata Generation
App metadata (app ID, title, version) is generated via `tools/generate-appinfo.mjs` from template `webos-meta/appinfo.json.template` based on `WEBOS_TARGET` environment variable.

### Dependency Audit Tooling
Bundle syntax auditing is provided via `tools/audit-bundle.mjs` to detect ES2016+ syntax incompatible with Chromium 53 (webOS 4.x floor).

#### Audit Tool Features
- Detects unsupported syntax patterns:
  - ES2020: Optional chaining (?.), nullish coalescing (??)
  - ES2018: Object spread/rest (...obj)
  - ES2017: Async/await
  - ES2022: Private fields (#field)
  - ES2021: Logical assignment (&&=, ||=, ??=)
- Identifies source package when possible
- Provides code context for each violation

#### Running Audits
```bash
# Audit the legacy bundle after building
npm run pack:legacy
npm run audit:legacy

# Or audit any bundle directly
node tools/audit-bundle.mjs dist/main.js
```

#### Dependency Status
The following runtime dependencies are bundled and must be compatible with ES2015:
- ✅ `@enact/*` packages: Pre-transpiled by Enact CLI (needs verification)
- ⚠️ `@tanstack/react-query`: Ships modern syntax, requires transpilation
- ⚠️ `react`, `react-dom`: May contain ES2016+ features
- 🔄 Status will be updated after first legacy build audit

**Note:** Enact CLI's webpack config excludes most `node_modules` from babel-loader, so dependencies must either ship ES2015-compatible code OR be explicitly transpiled via `tools/transpile-legacy.mjs`.

## Progress
- Wave 0: 4/4 complete
- Wave 1: 4/5 complete (Task 7 blocked by C9 hardware)
- Wave 2: 5/5 complete
- Wave 3: 2/4 complete (Task 16 blocked by C9 hardware)

Total Implementation: 15/18 tasks complete.

### Completed Milestones
- [x] Shared core / target-specific edge architecture established.
- [x] Transpilation pipeline for Chrome 53/68 targets (Task 9).
- [x] Target-detection allowlist enforced via `TargetProvider`.
- [x] Restoration of webOS 5.x polyfills for modern compatibility.
- [x] CI Gates: Test (217 passing), Lint, Typecheck, Guard (no-fork/audit).
- [x] Modern regression audit complete.

### Remaining Blockers
- **Task 7**: Performance profile optimization for C9. Requires real device for profiling.
- **Task 16**: Final smoke test on LG C9. Blocked pending hardware access.

## Final Target Decisions
- **Modern**: webOS 5.x+ (Chromium 79+). Optimized for latest features.
- **Legacy**: webOS 4.x (Chromium 53/68). Transpiled and polyfilled for compatibility.
- **Unified Codebase**: Single source of truth for all business logic and UI components.

## Diagnostics
- Device status: LG C9 currently unavailable for live testing.
- Test Suite: 217 tests passing (unit/integration).
- CI Status: All automated gates passing.
- Requirements are documented in `LEGACY_BUILD_STRATEGY.md` and the diagnostics panel tests.

## Risks
- Unexpected Chromium regressions in older webOS versions.
- Performance bottlenecks on legacy hardware without GPU acceleration.

## Intent Changes
*Any change to the fundamental architecture or project intent must be recorded here with evidence.*

---
*Created: 2026-06-06*
*Updated: 2026-06-06 - Added dependency audit tooling (Task 9)*
