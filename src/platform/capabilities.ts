export type WebOSTarget = 'modern' | 'legacy';

export type FeatureStatus = 'supported' | 'degraded' | 'disabled' | 'server-proxy-required';

export interface FeatureGate {
	status: FeatureStatus;
	supported: boolean;
	degraded: boolean;
	disabled: boolean;
	serverProxyRequired: boolean;
	reason?: string;
}

export interface PlatformCapabilities {
	video: FeatureGate;
	originalPhoto: FeatureGate;
	webp: FeatureGate;
	localStorage: FeatureGate;
	fetch: FeatureGate;
	blob: FeatureGate;
}

export type CapabilityKey = keyof PlatformCapabilities;

export interface FeatureGateOverride {
	status: FeatureStatus;
	reason?: string;
}

export type CapabilityOverrides = Partial<Record<CapabilityKey, FeatureGateOverride>>;

const LEGACY_DEFAULT_REASONS = {
	video: 'Video codecs unavailable on webOS 4.x',
	originalPhoto: 'High-resolution images may exceed memory limits on webOS 4.x',
	webp: 'WebP format not supported on webOS 4.x',
	blob: 'Blob API unavailable on webOS 4.x',
} as const;

export function createFeatureGate(status: FeatureStatus, reason?: string): FeatureGate {
	return {
		status,
		supported: status !== 'disabled',
		degraded: status === 'degraded',
		disabled: status === 'disabled',
		serverProxyRequired: status === 'server-proxy-required',
		reason,
	};
}

export function createSupportedFeatureGate(): FeatureGate {
	return createFeatureGate('supported');
}

export const modernPlatformCapabilities: PlatformCapabilities = {
	video: createSupportedFeatureGate(),
	originalPhoto: createSupportedFeatureGate(),
	webp: createSupportedFeatureGate(),
	localStorage: createSupportedFeatureGate(),
	fetch: createSupportedFeatureGate(),
	blob: createSupportedFeatureGate(),
};

export const legacyPlatformCapabilities: PlatformCapabilities = {
	video: createFeatureGate('degraded', LEGACY_DEFAULT_REASONS.video),
	originalPhoto: createFeatureGate('server-proxy-required', LEGACY_DEFAULT_REASONS.originalPhoto),
	webp: createFeatureGate('disabled', LEGACY_DEFAULT_REASONS.webp),
	localStorage: createSupportedFeatureGate(),
	fetch: createSupportedFeatureGate(),
	blob: createFeatureGate('disabled', LEGACY_DEFAULT_REASONS.blob),
};

function cloneCapabilities(capabilities: PlatformCapabilities): PlatformCapabilities {
	return {
		video: {...capabilities.video},
		originalPhoto: {...capabilities.originalPhoto},
		webp: {...capabilities.webp},
		localStorage: {...capabilities.localStorage},
		fetch: {...capabilities.fetch},
		blob: {...capabilities.blob},
	};
}

export function getDefaultPlatformCapabilities(target: WebOSTarget): PlatformCapabilities {
	return cloneCapabilities(target === 'legacy' ? legacyPlatformCapabilities : modernPlatformCapabilities);
}

export function resolvePlatformCapabilities(target: WebOSTarget, overrides: CapabilityOverrides = {}): PlatformCapabilities {
	const resolved = getDefaultPlatformCapabilities(target);

	for (const [capabilityName, override] of Object.entries(overrides) as Array<[CapabilityKey, FeatureGateOverride]>) {
		resolved[capabilityName] = createFeatureGate(override.status, override.reason);
	}

	return resolved;
}
