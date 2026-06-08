import { type PlatformCapabilities } from '../platform/capabilities';

export type ImageVariant = 'original' | 'preview' | 'thumbnail';
export type PrefetchStrategy = 'aggressive' | 'conservative' | 'disabled';
export type AnimationLevel = 'full' | 'reduced' | 'minimal';

export interface PerformanceProfile {
	imageVariant: ImageVariant;
	prefetchStrategy: PrefetchStrategy;
	animationLevel: AnimationLevel;
	memoryConscious: boolean;
}

export interface PerformanceAdapter {
	shouldUseOriginal(): boolean;
	getPreferredImageVariant(): ImageVariant;
	getImageVariantFallback(variant: ImageVariant): ImageVariant;
	getPrefetchStrategy(): PrefetchStrategy;
	getPrefetchCount(): number;
	getAnimationLevel(): AnimationLevel;
	getAnimationDuration(baseMs: number): number;
	shouldCacheImages(): boolean;
	getViewerPoolSize(): number;
	shouldUseProgressiveLoading(): boolean;
	getProfile(): PerformanceProfile;
}

const LEGACY_PREFETCH_COUNT = 2;
const MODERN_PREFETCH_COUNT = 8;
const LEGACY_VIEWER_POOL_SIZE = 3;
const MODERN_VIEWER_POOL_SIZE = 15;
const LEGACY_ANIMATION_DURATION_MULTIPLIER = 0.5;

class PerformanceAdapterImpl implements PerformanceAdapter {
	private capabilities: PlatformCapabilities;
	private isLegacy: boolean;

	constructor(capabilities: PlatformCapabilities) {
		this.capabilities = capabilities;
		this.isLegacy = !capabilities.originalPhoto.supported ||
		                capabilities.originalPhoto.serverProxyRequired;
	}

	shouldUseOriginal(): boolean {
		return this.capabilities.originalPhoto.supported &&
		       !this.capabilities.originalPhoto.serverProxyRequired;
	}

	getPreferredImageVariant(): ImageVariant {
		if (this.shouldUseOriginal()) {
			return 'original';
		}
		return 'preview';
	}

	getImageVariantFallback(variant: ImageVariant): ImageVariant {
		const fallbackChain: Record<ImageVariant, ImageVariant> = {
			original: 'preview',
			preview: 'thumbnail',
			thumbnail: 'thumbnail',
		};
		return fallbackChain[variant];
	}

	getPrefetchStrategy(): PrefetchStrategy {
		return this.isLegacy ? 'conservative' : 'aggressive';
	}

	getPrefetchCount(): number {
		if (this.isLegacy) {
			return LEGACY_PREFETCH_COUNT;
		}
		return MODERN_PREFETCH_COUNT;
	}

	getAnimationLevel(): AnimationLevel {
		return this.isLegacy ? 'reduced' : 'full';
	}

	getAnimationDuration(baseMs: number): number {
		if (this.isLegacy) {
			return Math.floor(baseMs * LEGACY_ANIMATION_DURATION_MULTIPLIER);
		}
		return baseMs;
	}

	shouldCacheImages(): boolean {
		return !this.isLegacy;
	}

	getViewerPoolSize(): number {
		if (this.isLegacy) {
			return LEGACY_VIEWER_POOL_SIZE;
		}
		return MODERN_VIEWER_POOL_SIZE;
	}

	shouldUseProgressiveLoading(): boolean {
		return this.isLegacy;
	}

	getProfile(): PerformanceProfile {
		return {
			imageVariant: this.getPreferredImageVariant(),
			prefetchStrategy: this.getPrefetchStrategy(),
			animationLevel: this.getAnimationLevel(),
			memoryConscious: this.isLegacy,
		};
	}
}

export function createPerformanceAdapter(capabilities: PlatformCapabilities): PerformanceAdapter {
	return new PerformanceAdapterImpl(capabilities);
}
