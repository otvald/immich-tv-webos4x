import {
	getAlbumTileScale,
	getDefaultAlbumTileScale,
	getDefaultTileScale,
	getDefaultTimePerViewSeconds,
	getGalleryTileScale,
	getTimePerViewSeconds,
	isMusicEnabled,
	setAlbumTileScale,
	setGalleryTileScale,
	setMusicEnabled,
	setTimePerViewSeconds,
	subscribeSlideshowSettingsChanges,
} from './slideshowSettings';

describe('slideshowSettings', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('clamps time per view values when saving and reading', () => {
		expect(setTimePerViewSeconds(1)).toBe(2);
		expect(getTimePerViewSeconds()).toBe(2);

		expect(setTimePerViewSeconds(121)).toBe(120);
		expect(getTimePerViewSeconds()).toBe(120);

		expect(setTimePerViewSeconds(Number.NaN)).toBe(getDefaultTimePerViewSeconds());
		expect(getTimePerViewSeconds()).toBe(getDefaultTimePerViewSeconds());
	});

	test('clamps gallery and album tile scales independently', () => {
		expect(setGalleryTileScale(0)).toBe(1);
		expect(getGalleryTileScale()).toBe(1);

		expect(setGalleryTileScale(9)).toBe(6);
		expect(getGalleryTileScale()).toBe(6);

		expect(setAlbumTileScale(Number.POSITIVE_INFINITY)).toBe(getDefaultTileScale());
		expect(getAlbumTileScale()).toBe(getDefaultTileScale());

		window.localStorage.clear();
		expect(getAlbumTileScale()).toBe(getDefaultAlbumTileScale());
	});

	test('persists music enabled flag and notifies subscribers', () => {
		const listener = jest.fn();
		const unsubscribe = subscribeSlideshowSettingsChanges(listener);

		setMusicEnabled(true);

		expect(isMusicEnabled()).toBe(true);
		expect(listener).toHaveBeenCalledTimes(1);

		unsubscribe();
		setMusicEnabled(false);

		expect(isMusicEnabled()).toBe(false);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	test('falls back to defaults when localStorage throws', () => {
		const getSpy = jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
			throw new DOMException('blocked', 'SecurityError');
		});
		const setSpy = jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
			throw new DOMException('blocked', 'SecurityError');
		});

		expect(getTimePerViewSeconds()).toBe(getDefaultTimePerViewSeconds());
		expect(getGalleryTileScale()).toBe(getDefaultTileScale());
		expect(getAlbumTileScale()).toBe(getDefaultAlbumTileScale());
		expect(isMusicEnabled()).toBe(false);
		expect(() => setTimePerViewSeconds(10)).not.toThrow();
		expect(() => setMusicEnabled(true)).not.toThrow();

		getSpy.mockRestore();
		setSpy.mockRestore();
	});

	test('subscribes to storage events as well as local settings events', () => {
		const listener = jest.fn();
		const unsubscribe = subscribeSlideshowSettingsChanges(listener);

		window.dispatchEvent(new StorageEvent('storage'));

		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();
	});
});
