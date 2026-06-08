const TIME_PER_VIEW_KEY = 'immich-tv-slideshow-time-per-view-seconds';
const SLIDESHOW_SETTINGS_EVENT = 'immich-tv-slideshow-settings-changed';
const DEFAULT_TIME_PER_VIEW_SECONDS = 5;
const MIN_TIME_PER_VIEW_SECONDS = 2;
const MAX_TIME_PER_VIEW_SECONDS = 120;
const TILE_SCALE_KEY = 'immich-tv-gallery-tile-scale';
const ALBUM_TILE_SCALE_KEY = 'immich-tv-album-tile-scale';
const MUSIC_ENABLED_KEY = 'immich-tv-music-enabled';
const DEFAULT_TILE_SCALE = 1;
const DEFAULT_ALBUM_TILE_SCALE = 2;
const MIN_TILE_SCALE = 1;
const MAX_TILE_SCALE = 6;

function clampTimePerView(seconds: number): number {
	if (!Number.isFinite(seconds)) return DEFAULT_TIME_PER_VIEW_SECONDS;
	return Math.min(MAX_TIME_PER_VIEW_SECONDS, Math.max(MIN_TIME_PER_VIEW_SECONDS, Math.round(seconds)));
}

function clampTileScale(scale: number): number {
	if (!Number.isFinite(scale)) return DEFAULT_TILE_SCALE;
	return Math.min(MAX_TILE_SCALE, Math.max(MIN_TILE_SCALE, Math.round(scale)));
}

export function getDefaultTimePerViewSeconds(): number {
	return DEFAULT_TIME_PER_VIEW_SECONDS;
}

export function getTimePerViewBounds(): {min: number; max: number} {
	return {min: MIN_TIME_PER_VIEW_SECONDS, max: MAX_TIME_PER_VIEW_SECONDS};
}

export function getDefaultTileScale(): number {
	return DEFAULT_TILE_SCALE;
}

export function getDefaultAlbumTileScale(): number {
	return DEFAULT_ALBUM_TILE_SCALE;
}

export function getTileScaleBounds(): {min: number; max: number} {
	return {min: MIN_TILE_SCALE, max: MAX_TILE_SCALE};
}

export function getTimePerViewSeconds(): number {
	try {
		const stored = window.localStorage.getItem(TIME_PER_VIEW_KEY);
		if (!stored) return DEFAULT_TIME_PER_VIEW_SECONDS;
		return clampTimePerView(Number(stored));
	} catch {
		return DEFAULT_TIME_PER_VIEW_SECONDS;
	}
}

export function setTimePerViewSeconds(seconds: number): number {
	const next = clampTimePerView(seconds);

	try {
		window.localStorage.setItem(TIME_PER_VIEW_KEY, String(next));
	} catch {
		// Keep the current session setting usable even when localStorage is unavailable.
	}

	window.dispatchEvent(new CustomEvent(SLIDESHOW_SETTINGS_EVENT, {detail: {seconds: next}}));
	return next;
}

export function getGalleryTileScale(): number {
	try {
		const stored = window.localStorage.getItem(TILE_SCALE_KEY);
		if (!stored) return DEFAULT_TILE_SCALE;
		return clampTileScale(Number(stored));
	} catch {
		return DEFAULT_TILE_SCALE;
	}
}

export function isMusicEnabled(): boolean {
	try {
		return window.localStorage.getItem(MUSIC_ENABLED_KEY) === 'true';
	} catch {
		return false;
	}
}

export function setMusicEnabled(enabled: boolean): void {
	try {
		window.localStorage.setItem(MUSIC_ENABLED_KEY, enabled ? 'true' : 'false');
	} catch {
		// Keep the current session setting usable even when localStorage is unavailable.
	}

	window.dispatchEvent(new CustomEvent(SLIDESHOW_SETTINGS_EVENT, {detail: {musicEnabled: enabled}}));
}

export function setGalleryTileScale(scale: number): number {
	const next = clampTileScale(scale);

	try {
		window.localStorage.setItem(TILE_SCALE_KEY, String(next));
	} catch {
		// Keep the current session setting usable even when localStorage is unavailable.
	}

	window.dispatchEvent(new CustomEvent(SLIDESHOW_SETTINGS_EVENT, {detail: {tileScale: next}}));
	return next;
}

export function getAlbumTileScale(): number {
	try {
		const stored = window.localStorage.getItem(ALBUM_TILE_SCALE_KEY);
		if (!stored) return DEFAULT_ALBUM_TILE_SCALE;
		return clampTileScale(Number(stored));
	} catch {
		return DEFAULT_ALBUM_TILE_SCALE;
	}
}

export function setAlbumTileScale(scale: number): number {
	const next = clampTileScale(scale);

	try {
		window.localStorage.setItem(ALBUM_TILE_SCALE_KEY, String(next));
	} catch {
		// Keep the current session setting usable even when localStorage is unavailable.
	}

	window.dispatchEvent(new CustomEvent(SLIDESHOW_SETTINGS_EVENT, {detail: {albumTileScale: next}}));
	return next;
}

export function subscribeSlideshowSettingsChanges(listener: () => void): () => void {
	window.addEventListener(SLIDESHOW_SETTINGS_EVENT, listener);
	window.addEventListener('storage', listener);

	return () => {
		window.removeEventListener(SLIDESHOW_SETTINGS_EVENT, listener);
		window.removeEventListener('storage', listener);
	};
}
