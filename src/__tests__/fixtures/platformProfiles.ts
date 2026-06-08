/**
 * Platform profile fixtures for modern and legacy webOS targets.
 * Used by compatibility tests to verify capability differences.
 */

export interface CapabilityState {
	supported: boolean;
	reason?: string;
}

export interface PlatformCapabilities {
	video: CapabilityState;
	originalPhoto: CapabilityState;
	webp: CapabilityState;
	localStorage: CapabilityState;
	fetch: CapabilityState;
	blob: CapabilityState;
}

export interface PlatformProfile {
	target: 'modern' | 'legacy';
	capabilities: PlatformCapabilities;
}

/**
 * Modern profile: all core features supported.
 * Used for Chrome >= 79 and webOS 5.x+.
 */
export const modernProfile: PlatformProfile = {
	target: 'modern',
	capabilities: {
		video: {
			supported: true,
		},
		originalPhoto: {
			supported: true,
		},
		webp: {
			supported: true,
		},
		localStorage: {
			supported: true,
		},
		fetch: {
			supported: true,
		},
		blob: {
			supported: true,
		},
	},
};

/**
 * Legacy profile: degraded capabilities for webOS 4.x (Chromium 53-class).
 * Features marked as unsupported include user-visible reason text.
 */
export const legacyProfile: PlatformProfile = {
	target: 'legacy',
	capabilities: {
		video: {
			supported: false,
			reason: 'Video codecs unavailable on webOS 4.x',
		},
		originalPhoto: {
			supported: false,
			reason: 'High-resolution images may exceed memory limits on webOS 4.x',
		},
		webp: {
			supported: false,
			reason: 'WebP format not supported on webOS 4.x',
		},
		localStorage: {
			supported: true,
		},
		fetch: {
			supported: true,
		},
		blob: {
			supported: false,
			reason: 'Blob API unavailable on webOS 4.x',
		},
	},
};

/**
 * Get profile by target name.
 */
export function getProfileByTarget(target: 'modern' | 'legacy'): PlatformProfile {
	return target === 'modern' ? modernProfile : legacyProfile;
}
