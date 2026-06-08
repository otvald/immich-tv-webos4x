import type {FeatureGate} from '../platform/capabilities';

export interface MediaAdapter {
	canPlayVideo(): boolean;
	shouldShowVideo(): boolean;
	getVideoUnsupportedReason(): string | undefined;
}

const DEFAULT_UNSUPPORTED_REASON = 'Video playback not supported on this device';

export function createMediaAdapter(videoCapability: FeatureGate): MediaAdapter {
	const canPlay = videoCapability.status === 'supported';
	const reason = canPlay ? undefined : (videoCapability.reason || DEFAULT_UNSUPPORTED_REASON);

	return {
		canPlayVideo(): boolean {
			return canPlay;
		},

		shouldShowVideo(): boolean {
			return canPlay;
		},

		getVideoUnsupportedReason(): string | undefined {
			return reason;
		},
	};
}
