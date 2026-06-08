// Runtime polyfills for webOS 5.x (Chrome 68). Each polyfill is a feature-check
// guard so this file is a no-op on modern Chromium. Hand-rolled (no core-js) to
// keep the bundle small.
//
// Split Strategy:
// ----------------
// This file contains polyfills for Chrome 68 gaps (webOS 5.x floor):
//   - Array.prototype.flat            (Chrome 69) — used in ImmichRepository
//   - Array.prototype.flatMap         (Chrome 69) — used in TimelineGrid, MainPanel
//   - Object.fromEntries              (Chrome 73) — used in NavigationRail
//   - globalThis                      (Chrome 71) — used by @tanstack/query-core
//
// Additional polyfills for Chrome 53 gaps (webOS 4.x floor) are in:
//   src/compat/polyfills-legacy.ts (loaded only when WEBOS_TARGET=legacy):
//   - Promise.prototype.finally       (Chrome 63)
//   - Promise.allSettled              (Chrome 76)
//   - String.prototype.matchAll       (Chrome 73)
//   - Object.hasOwn                   (Chrome 93)
//
// All assignments use `as any` casts because the TypeScript lib already declares
// these on the prototypes, and reassigning them in TS code requires the cast.

import appInfo from '../webos-meta/appinfo.json';
import {applyLegacyPolyfills} from './compat/polyfills-legacy';

// Array.prototype.flat (Chrome 69+)
// Used in repository flattening helpers
if (!Array.prototype.flat) {
	(Array.prototype as any).flat = function flat(depth = 1) {
		const flatten = (arr: any[], d: number): any[] =>
			d > 0
				? arr.reduce((acc: any[], val: any) => acc.concat(Array.isArray(val) ? flatten(val, d - 1) : val), [])
				: arr.slice();
		return flatten(this as any[], depth);
	};
}

// Array.prototype.flatMap (Chrome 69+)
// Used in view-model composition (TimelineGrid, MainPanel)
if (!Array.prototype.flatMap) {
	(Array.prototype as any).flatMap = function flatMap(callback: (value: any, index: number, array: any[]) => any, thisArg?: any) {
		return (this as any[]).map(callback, thisArg).reduce((acc: any[], val: any) => acc.concat(val), []);
	};
}

// Object.fromEntries (Chrome 73+)
// Used in NavigationRail state shaping
if (!Object.fromEntries) {
	(Object as any).fromEntries = function fromEntries(entries: Iterable<readonly [PropertyKey, any]>) {
		const obj: Record<PropertyKey, any> = {};
		for (const [key, value] of entries as any) {
			obj[key] = value;
		}
		return obj;
	};
}

// globalThis (Chrome 71+)
// Used by webpack/runtime and @tanstack/query-core
if (typeof globalThis === 'undefined') {
	// In a browser, `window` is the global. In a worker, `self` is.
	(function () {
		if (typeof window !== 'undefined') (window as any).globalThis = window;
		else if (typeof self !== 'undefined') (self as any).globalThis = self;
	})();
}

// Conditional loading of additional legacy polyfills for webOS 4.x (Chrome 53).
// The packaged TV runtime does not reliably expose WEBOS_TARGET, so legacy
// app IDs also activate this path.
const runtimeProcess = (globalThis as typeof globalThis & {
	process?: {
		env?: Record<string, string | undefined>;
	};
}).process;

const palmSystem = (globalThis as typeof globalThis & {
	PalmSystem?: {appid?: string};
}).PalmSystem;

if (
	runtimeProcess?.env?.WEBOS_TARGET === 'legacy' ||
	appInfo.id.includes('legacy') ||
	palmSystem?.appid?.includes('legacy')
) {
	applyLegacyPolyfills();
}
