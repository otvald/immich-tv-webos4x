import React, {useCallback, useEffect, useState} from 'react';
import {createSpotlightContainer} from '../utils/spotlight';
import {
	getDefaultTimePerViewSeconds,
	getDefaultAlbumTileScale,
	getDefaultTileScale,
	getAlbumTileScale,
	getGalleryTileScale,
	getTileScaleBounds,
	getTimePerViewBounds,
	getTimePerViewSeconds,
	isMusicEnabled,
	setAlbumTileScale,
	setMusicEnabled,
	setGalleryTileScale,
	setTimePerViewSeconds,
	subscribeSlideshowSettingsChanges,
} from '../utils/slideshowSettings';
import {musicTracks} from '../generated/musicManifest';
import css from './SettingsPanel.module.less';

const SettingsContainer = createSpotlightContainer({enterTo: 'last-focused'});
const {min: MIN_SECONDS, max: MAX_SECONDS} = getTimePerViewBounds();
const {min: MIN_TILE_SCALE, max: MAX_TILE_SCALE} = getTileScaleBounds();

const SettingsPanel: React.FC = () => {
	const [timePerView, setTimePerView] = useState(getTimePerViewSeconds);
	const [tileScale, setTileScale] = useState(getGalleryTileScale);
	const [albumTileScale, setAlbumTileScaleState] = useState(getAlbumTileScale);
	const [musicEnabled, setMusicEnabledState] = useState(isMusicEnabled);

	useEffect(() => subscribeSlideshowSettingsChanges(() => {
		setTimePerView(getTimePerViewSeconds());
		setTileScale(getGalleryTileScale());
		setAlbumTileScaleState(getAlbumTileScale());
		setMusicEnabledState(isMusicEnabled());
	}), []);

	const persistTimePerView = useCallback((seconds: number) => {
		setTimePerView(setTimePerViewSeconds(seconds));
	}, []);

	const decrease = useCallback(() => persistTimePerView(timePerView - 1), [persistTimePerView, timePerView]);
	const increase = useCallback(() => persistTimePerView(timePerView + 1), [persistTimePerView, timePerView]);
	const reset = useCallback(() => persistTimePerView(getDefaultTimePerViewSeconds()), [persistTimePerView]);

	const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		persistTimePerView(Number(event.currentTarget.value));
	}, [persistTimePerView]);

	const persistTileScale = useCallback((scale: number) => {
		setTileScale(setGalleryTileScale(scale));
	}, []);

	const decreaseTileScale = useCallback(() => persistTileScale(tileScale - 1), [persistTileScale, tileScale]);
	const increaseTileScale = useCallback(() => persistTileScale(tileScale + 1), [persistTileScale, tileScale]);
	const resetTileScale = useCallback(() => persistTileScale(getDefaultTileScale()), [persistTileScale]);
	const handleTileScaleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		persistTileScale(Number(event.currentTarget.value));
	}, [persistTileScale]);

	const persistAlbumTileScale = useCallback((scale: number) => {
		setAlbumTileScaleState(setAlbumTileScale(scale));
	}, []);

	const decreaseAlbumTileScale = useCallback(() => persistAlbumTileScale(albumTileScale - 1), [albumTileScale, persistAlbumTileScale]);
	const increaseAlbumTileScale = useCallback(() => persistAlbumTileScale(albumTileScale + 1), [albumTileScale, persistAlbumTileScale]);
	const resetAlbumTileScale = useCallback(() => persistAlbumTileScale(getDefaultAlbumTileScale()), [persistAlbumTileScale]);
	const handleAlbumTileScaleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		persistAlbumTileScale(Number(event.currentTarget.value));
	}, [persistAlbumTileScale]);

	const handleMusicToggle = useCallback(() => {
		setMusicEnabledState((current) => {
			const next = !current;
			setMusicEnabled(next);
			return next;
		});
	}, []);

	const licenseText = musicTracks.length > 0
		? musicTracks.map((track) => [`${track.title} (${track.licenseFileName})`, track.licenseText].join('\n')).join('\n\n---\n\n')
		: 'No licensed MP3 files found. Add mp3/<name>.mp3 with matching nonempty mp3/<name>.license, then run npm run music:manifest.';

	return (
		<SettingsContainer className={css.panel} spotlightId="settings-panel">
			<div className={css.header}>
				<h1>Settings</h1>
				<p>Configure TV playback behavior. Settings are loaded on app start and saved immediately when changed.</p>
			</div>

			<section className={css.card} aria-label="Random play settings">
				<div>
					<h2>Random play time per view</h2>
					<p>PLAY starts random play in the current Photos, Albums, or Search context. STOP stops it.</p>
				</div>

				<div className={css.settingRow}>
					<button type="button" className={css.button} onClick={decrease} disabled={timePerView <= MIN_SECONDS}>−</button>
					<label className={css.valueLabel}>
						<span>Seconds</span>
						<input className={css.numberInput} type="number" min={MIN_SECONDS} max={MAX_SECONDS} step={1} value={timePerView} onChange={handleInputChange} />
					</label>
					<button type="button" className={css.button} onClick={increase} disabled={timePerView >= MAX_SECONDS}>+</button>
					<button type="button" className={css.button} onClick={reset}>Reset to 5s</button>
				</div>

				<p className={css.hint}>Allowed range: {MIN_SECONDS}–{MAX_SECONDS} seconds. Current value: {timePerView}s.</p>
			</section>

			<section className={css.card} aria-label="Photo tile settings">
				<div>
					<h2>Photo tile size</h2>
					<p>Controls the Photos/timeline row height. Default is the original 1× size.</p>
				</div>

				<div className={css.settingRow}>
					<button type="button" className={css.button} onClick={decreaseTileScale} disabled={tileScale <= MIN_TILE_SCALE}>−</button>
					<label className={css.valueLabel}>
						<span>Scale</span>
						<input className={css.numberInput} type="number" min={MIN_TILE_SCALE} max={MAX_TILE_SCALE} step={1} value={tileScale} onChange={handleTileScaleChange} />
					</label>
					<button type="button" className={css.button} onClick={increaseTileScale} disabled={tileScale >= MAX_TILE_SCALE}>+</button>
					<button type="button" className={css.button} onClick={resetTileScale}>Reset to 1×</button>
				</div>

				<p className={css.hint}>Allowed range: {MIN_TILE_SCALE}×–{MAX_TILE_SCALE}×. Current value: {tileScale}×.</p>
			</section>

			<section className={css.card} aria-label="Album tile settings">
				<div>
					<h2>Album tile size</h2>
					<p>Controls the album overview cards. Default is 2× the current card size.</p>
				</div>

				<div className={css.settingRow}>
					<button type="button" className={css.button} onClick={decreaseAlbumTileScale} disabled={albumTileScale <= MIN_TILE_SCALE}>−</button>
					<label className={css.valueLabel}>
						<span>Scale</span>
						<input className={css.numberInput} type="number" min={MIN_TILE_SCALE} max={MAX_TILE_SCALE} step={1} value={albumTileScale} onChange={handleAlbumTileScaleChange} />
					</label>
					<button type="button" className={css.button} onClick={increaseAlbumTileScale} disabled={albumTileScale >= MAX_TILE_SCALE}>+</button>
					<button type="button" className={css.button} onClick={resetAlbumTileScale}>Reset to 2×</button>
				</div>

				<p className={css.hint}>Allowed range: {MIN_TILE_SCALE}×–{MAX_TILE_SCALE}×. Current value: {albumTileScale}×.</p>
			</section>

			<section className={css.card} aria-label="Music settings">
				<div>
					<h2>Music</h2>
					<p>Shuffle bundled MP3 files from the app package. Each MP3 is included only when it has a matching nonempty <code>.license</code> file.</p>
				</div>

				<button type="button" className={css.button} onClick={handleMusicToggle} disabled={musicTracks.length === 0}>
					{musicEnabled ? 'Disable music' : 'Enable music'}
				</button>

				<p className={css.hint}>Licensed tracks available: {musicTracks.length}. Playback may start after the first user interaction if the TV blocks autoplay.</p>
				<pre className={css.licenseWindow} aria-label="Bundled music licenses">{licenseText}</pre>
			</section>
		</SettingsContainer>
	);
};

export default SettingsPanel;
