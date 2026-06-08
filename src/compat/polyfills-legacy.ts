// Runtime polyfills for the conservative webOS 4.x floor (Chromium 53).
//
// Policy:
// - Legacy-only: applied only when WEBOS_TARGET=legacy or the app ID is legacy
//   via src/polyfills.ts
// - Feature-checked: every patch first verifies the API is actually missing
// - Explicit, not blanket core-js: keeps the bundle impact measurable and small
//
// Split Strategy:
// ----------------
// webOS 5.x polyfills (Chrome 68 gaps) are in src/polyfills.ts (always loaded):
//   - Array.prototype.flat, flatMap     (Chrome 69)
//   - globalThis                        (Chrome 71)
//   - Object.fromEntries                (Chrome 73)
//
// This file contains ADDITIONAL polyfills for webOS 4.x (Chrome 53 gaps):
//   - Promise.prototype.finally         (Chrome 63)
//   - Promise.allSettled                (Chrome 76)
//   - String.prototype.matchAll         (Chrome 73)
//   - Object.hasOwn                     (Chrome 93)
//   - Element.prototype.scrollTo/By     (Chrome 61+; missing on webOS 4)
//
// All assignments use `as any` because TypeScript already declares these APIs.

type ElementScrollMethod = (xOrOptions?: number | ScrollToOptions, y?: number) => void;

interface ElementScrollPrototype {
	scrollTo?: ElementScrollMethod;
	scrollBy?: ElementScrollMethod;
}

function getScrollCoordinates(xOrOptions?: number | ScrollToOptions, y?: number): {left?: number; top?: number} {
	if (typeof xOrOptions === 'object' && xOrOptions !== null) {
		return {
			left: typeof xOrOptions.left === 'number' ? xOrOptions.left : undefined,
			top: typeof xOrOptions.top === 'number' ? xOrOptions.top : undefined,
		};
	}

	return {
		left: typeof xOrOptions === 'number' ? xOrOptions : undefined,
		top: typeof y === 'number' ? y : undefined,
	};
}

function applyElementScrollTo(element: Element, xOrOptions?: number | ScrollToOptions, y?: number): void {
	const coordinates = getScrollCoordinates(xOrOptions, y);

	if (coordinates.left !== undefined) {
		element.scrollLeft = coordinates.left;
	}

	if (coordinates.top !== undefined) {
		element.scrollTop = coordinates.top;
	}
}

function applyElementScrollBy(element: Element, xOrOptions?: number | ScrollToOptions, y?: number): void {
	const coordinates = getScrollCoordinates(xOrOptions, y);

	if (coordinates.left !== undefined) {
		element.scrollLeft += coordinates.left;
	}

	if (coordinates.top !== undefined) {
		element.scrollTop += coordinates.top;
	}
}

function applyElementScrollPolyfills(): void {
	if (typeof Element === 'undefined') return;

	const elementPrototype = Element.prototype as unknown as ElementScrollPrototype;

	if (typeof elementPrototype.scrollTo !== 'function') {
		elementPrototype.scrollTo = function scrollToPolyfill(this: Element, xOrOptions?: number | ScrollToOptions, y?: number) {
			applyElementScrollTo(this, xOrOptions, y);
		};
	}

	if (typeof elementPrototype.scrollBy !== 'function') {
		elementPrototype.scrollBy = function scrollByPolyfill(this: Element, xOrOptions?: number | ScrollToOptions, y?: number) {
			applyElementScrollBy(this, xOrOptions, y);
		};
	}
}

export function applyLegacyPolyfills(): void {
	(globalThis as typeof globalThis & {__IMMICH_TV_LEGACY_POLYFILLS__?: boolean}).__IMMICH_TV_LEGACY_POLYFILLS__ = true;
	applyElementScrollPolyfills();

	if (!Promise.prototype.finally) {
		(Promise.prototype as any).finally = function finallyPolyfill(onFinally?: (() => unknown) | null) {
			const handler = typeof onFinally === 'function' ? onFinally : () => onFinally;

			return this.then(
				(value: unknown) => Promise.resolve(handler()).then(() => value),
				(reason: unknown) =>
					Promise.resolve(handler()).then(() => {
						throw reason;
					}),
			);
		};
	}

	if (!Promise.allSettled) {
		(Promise as any).allSettled = function allSettled(promises: Iterable<Promise<unknown>>) {
			return Promise.all(
				Array.from(promises, (promise) =>
					Promise.resolve(promise).then(
						(value) => ({status: 'fulfilled' as const, value}),
						(reason) => ({status: 'rejected' as const, reason}),
					),
				),
			);
		};
	}

	if (!String.prototype.matchAll) {
		(String.prototype as any).matchAll = function matchAll(regexp: RegExp) {
			const source = String(this);
			const flags = regexp.flags.indexOf('g') >= 0 ? regexp.flags : regexp.flags + 'g';
			const iterator = new RegExp(regexp.source, flags);

			return {
				[Symbol.iterator]() {
					return this;
				},
				next() {
					const match = iterator.exec(source);
					return match ? {value: match, done: false} : {value: undefined, done: true};
				},
			};
		};
	}

	if (!(Object as any).hasOwn) {
		(Object as any).hasOwn = function hasOwn(obj: object, prop: PropertyKey) {
			return Object.prototype.hasOwnProperty.call(obj, prop);
		};
	}
}
