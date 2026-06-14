import {matchesRemoteKeyAction} from '../utils/remoteKeySettings';

const DEBUG_OVERLAY_KEY = 'immich-tv-debug-overlays-enabled';
const DEBUG_OVERLAY_EVENT = 'immich-tv-debug-overlays-changed';

function defaultEnabled(): boolean {
	return false;
}

export function isDebugOverlayToggleKey(event: KeyboardEvent): boolean {
	return matchesRemoteKeyAction(event, 'toggleDebug');
}

export function areDebugOverlaysEnabled(): boolean {
	try {
		const stored = window.localStorage.getItem(DEBUG_OVERLAY_KEY);
		if (stored === 'true') return true;
		if (stored === 'false') return false;
	} catch {
		return defaultEnabled();
	}

	return defaultEnabled();
}

export function setDebugOverlaysEnabled(enabled: boolean): void {
	try {
		window.localStorage.setItem(DEBUG_OVERLAY_KEY, enabled ? 'true' : 'false');
	} catch {
		// Ignore storage failures; the current session event still updates mounted overlays.
	}

	window.dispatchEvent(new CustomEvent(DEBUG_OVERLAY_EVENT, {detail: {enabled}}));
}

export function toggleDebugOverlaysEnabled(): boolean {
	const next = !areDebugOverlaysEnabled();
	setDebugOverlaysEnabled(next);
	return next;
}

export function subscribeDebugOverlayChanges(listener: () => void): () => void {
	window.addEventListener(DEBUG_OVERLAY_EVENT, listener);
	window.addEventListener('storage', listener);

	return () => {
		window.removeEventListener(DEBUG_OVERLAY_EVENT, listener);
		window.removeEventListener('storage', listener);
	};
}
