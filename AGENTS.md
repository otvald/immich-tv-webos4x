# AGENTS.md: Intent and Guardrails

## Core Project Intent
The non-negotiable mission is to support webOS 4.x (LG C9) within the main `immich-tv-webos` project. We do not fork. We do not duplicate screens. We build a shared core with a target-specific edge.

## Hard Guardrails
1. **Do not fork**: Any suggestion to create a separate app or directory for legacy code is a violation. All legacy logic resides in the `legacy-edge` or is handled via target detection.
2. **Shared core, target-specific edge**: Isolation of legacy logic must happen at the edges (API wrappers, CSS polyfills), not inside main components. Business logic remains unified.
3. **Target-detection allowlist**: Use the `TargetProvider` and `useTarget` hook. No manual `navigator.userAgent` checks outside the provider.
4. **TDD & CI Gates**: New legacy support must include automated tests. `npm run test` and `npm run audit:legacy` must pass.
5. **Real C9 Release Gate**: Deployment to production requires successful testing on a real LG C9 device. This is the final verification step.
6. **Diagnostics-first**: Always verify the issue on the target (or a simulated environment with documented evidence) before writing code.
7. **No-regression rule**: Modern targets (webOS 5.x+) must not be negatively impacted by legacy compatibility changes.

## Architecture Constraints
- **Polyfill Isolation**: Polyfills must be loaded conditionally or in a way that doesn't conflict with modern native APIs.
- **Syntax Guards**: The `tools/audit-bundle.mjs` tool is the source of truth for syntax compatibility.
- **Metadata Separation**: App IDs and titles are driven by `WEBOS_TARGET` to prevent accidental overwrites during side-by-side testing.

## Legacy Build Strategy
Before changing build, compatibility, polyfill, diagnostics, or C9-specific behavior, read `LEGACY_BUILD_STRATEGY.md`. It defines the supported legacy-build approach: one shared app core, target-specific compatibility edges, separate package metadata, Chrome 53 syntax auditing, diagnostics-first debugging, and real C9 validation as the final release gate.

## Intent-Change Protocol
Changing fundamental project intent (e.g., deciding to fork, dropping legacy support) is strictly forbidden without following this protocol:

1. **Evidence-Based**: You must provide diagnostic or test evidence proving the current intent is impossible to maintain.
2. **Documentation**: Updates must be made to both `progress.md` and `AGENTS.md`.
3. **Justification**: A clear rationale for the change must be provided.

### Intent Change Log
| Date | Change | Rationale | Evidence Link |
|------|--------|-----------|---------------|
| 2026-06-06 | Initial Intent | Established baseline legacy support strategy | N/A |
