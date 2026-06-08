import React from 'react';
import {VideoPlayer as SandstoneVideoPlayer} from '@enact/sandstone/VideoPlayer';
import {usePlatformFacade} from '../../platform/facade';
import {createMediaAdapter} from '../../compat/media-adapter';
import css from './MediaViewer.module.less';

interface VideoPlayerProps {
	src: string;
}

// Sandstone exposes VideoPlayer with a Slottable-only typing — `autoCloseTimeout`,
// `jumpBy`, `noAutoPlay`, `spotlightDisabled` and friends live on VideoPlayerBaseProps
// and are forwarded at runtime through Sandstone's HOC chain. Spread with an `as any`
// cast is the established pattern in this project (see SearchPanel onComplete).
//
// HIDDEN_BACK_LABEL acts as a stable CSS hook: Sandstone renders its own back button
// at top-left when controls are visible (duplicate of our MediaControls close X).
// We set a sentinel aria-label and hide via [aria-label="..."] in the LESS module —
// targeting the CSS-Modules hash directly would break on every Sandstone rebuild.
const HIDDEN_BACK_LABEL = 'immich-tv-internal-back-hidden';

const PLAYER_PROPS = {
	autoCloseTimeout: 5000,
	jumpBy: 10,
	noAutoPlay: false,
	spotlightDisabled: false,
	backButtonAriaLabel: HIDDEN_BACK_LABEL,
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({src}) => {
	const platform = usePlatformFacade();
	const adapter = createMediaAdapter(platform.getCapability('video'));

	if (!adapter.shouldShowVideo()) {
		const reason = adapter.getVideoUnsupportedReason();
		return (
			<div className={css.viewerMedia} data-testid="video-unsupported">
				<div className={css.unsupportedMessage}>
					<div className={css.unsupportedIcon}>⚠️</div>
					<div className={css.unsupportedText}>Video playback unavailable</div>
					{reason && <div className={css.unsupportedReason}>{reason}</div>}
				</div>
			</div>
		);
	}

	return (
		<SandstoneVideoPlayer {...(PLAYER_PROPS as any)} className={css.viewerMedia}>
			<source src={src} type="video/mp4" />
		</SandstoneVideoPlayer>
	);
};

VideoPlayer.displayName = 'VideoPlayer';
