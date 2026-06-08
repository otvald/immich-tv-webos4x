import {createMediaAdapter} from '../media-adapter';
import {createFeatureGate} from '../../platform/capabilities';

describe('MediaAdapter', () => {
	describe('canPlayVideo', () => {
		it('returns true when video is supported', () => {
			const videoGate = createFeatureGate('supported');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.canPlayVideo()).toBe(true);
		});

		it('returns false when video is degraded', () => {
			const videoGate = createFeatureGate('degraded', 'Video codecs unavailable');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.canPlayVideo()).toBe(false);
		});

		it('returns false when video is disabled', () => {
			const videoGate = createFeatureGate('disabled', 'Video playback disabled');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.canPlayVideo()).toBe(false);
		});

		it('returns false when video requires server proxy', () => {
			const videoGate = createFeatureGate('server-proxy-required', 'Video must be transcoded');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.canPlayVideo()).toBe(false);
		});
	});

	describe('getVideoUnsupportedReason', () => {
		it('returns undefined when video is supported', () => {
			const videoGate = createFeatureGate('supported');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.getVideoUnsupportedReason()).toBeUndefined();
		});

		it('returns reason when video is degraded', () => {
			const videoGate = createFeatureGate('degraded', 'Video codecs unavailable on webOS 4.x');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.getVideoUnsupportedReason()).toBe('Video codecs unavailable on webOS 4.x');
		});

		it('returns reason when video is disabled', () => {
			const videoGate = createFeatureGate('disabled', 'Video playback disabled');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.getVideoUnsupportedReason()).toBe('Video playback disabled');
		});

		it('returns reason when video requires server proxy', () => {
			const videoGate = createFeatureGate('server-proxy-required', 'Video must be transcoded');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.getVideoUnsupportedReason()).toBe('Video must be transcoded');
		});

		it('returns default reason when video is degraded without explicit reason', () => {
			const videoGate = createFeatureGate('degraded');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.getVideoUnsupportedReason()).toBe('Video playback not supported on this device');
		});
	});

	describe('shouldShowVideo', () => {
		it('returns true when video is supported', () => {
			const videoGate = createFeatureGate('supported');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.shouldShowVideo()).toBe(true);
		});

		it('returns false when video is degraded', () => {
			const videoGate = createFeatureGate('degraded', 'Video codecs unavailable');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.shouldShowVideo()).toBe(false);
		});

		it('returns false when video is disabled', () => {
			const videoGate = createFeatureGate('disabled');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.shouldShowVideo()).toBe(false);
		});
	});

	describe('adapter consistency', () => {
		it('maintains consistent state for supported video', () => {
			const videoGate = createFeatureGate('supported');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.canPlayVideo()).toBe(true);
			expect(adapter.shouldShowVideo()).toBe(true);
			expect(adapter.getVideoUnsupportedReason()).toBeUndefined();
		});

		it('maintains consistent state for unsupported video', () => {
			const videoGate = createFeatureGate('degraded', 'Unsupported codecs');
			const adapter = createMediaAdapter(videoGate);
			expect(adapter.canPlayVideo()).toBe(false);
			expect(adapter.shouldShowVideo()).toBe(false);
			expect(adapter.getVideoUnsupportedReason()).toBe('Unsupported codecs');
		});
	});
});
