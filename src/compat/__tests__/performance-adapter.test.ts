import {
	createPerformanceAdapter,
} from '../performance-adapter';
import {type PlatformCapabilities, modernPlatformCapabilities, legacyPlatformCapabilities} from '../../platform/capabilities';

describe('PerformanceAdapter', () => {
	describe('Image variant selection', () => {
		it('prefers preview for legacy profile with unsupported originalPhoto', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			expect(adapter.shouldUseOriginal()).toBe(false);
			expect(adapter.getPreferredImageVariant()).toBe('preview');
		});

		it('allows original for modern profile with supported originalPhoto', () => {
			const adapter = createPerformanceAdapter(modernPlatformCapabilities);
			expect(adapter.shouldUseOriginal()).toBe(true);
			expect(adapter.getPreferredImageVariant()).toBe('original');
		});

		it('falls back to thumbnail when preview is not available', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			const variant = adapter.getImageVariantFallback('preview');
			expect(variant).toBe('thumbnail');
		});

		it('provides fallback chain: original -> preview -> thumbnail', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			expect(adapter.getImageVariantFallback('original')).toBe('preview');
			expect(adapter.getImageVariantFallback('preview')).toBe('thumbnail');
			expect(adapter.getImageVariantFallback('thumbnail')).toBe('thumbnail');
		});
	});

	describe('Prefetch behavior', () => {
		it('uses aggressive prefetch for modern profile', () => {
			const adapter = createPerformanceAdapter(modernPlatformCapabilities);
			expect(adapter.getPrefetchStrategy()).toBe('aggressive');
		});

		it('uses conservative prefetch for legacy profile', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			expect(adapter.getPrefetchStrategy()).toBe('conservative');
		});

		it('returns correct prefetch count for aggressive strategy', () => {
			const adapter = createPerformanceAdapter(modernPlatformCapabilities);
			expect(adapter.getPrefetchCount()).toBeGreaterThanOrEqual(5);
		});

		it('returns reduced prefetch count for conservative strategy', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			expect(adapter.getPrefetchCount()).toBeLessThanOrEqual(3);
		});
	});

	describe('Animation aggressiveness', () => {
		it('enables full animations for modern profile', () => {
			const adapter = createPerformanceAdapter(modernPlatformCapabilities);
			expect(adapter.getAnimationLevel()).toBe('full');
		});

		it('reduces animations for legacy profile', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			expect(adapter.getAnimationLevel()).toBe('reduced');
		});

		it('provides animation duration multiplier for legacy', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			const baseMs = 300;
			const adjusted = adapter.getAnimationDuration(baseMs);
			expect(adjusted).toBeLessThan(baseMs);
		});

		it('preserves animation duration for modern', () => {
			const adapter = createPerformanceAdapter(modernPlatformCapabilities);
			const baseMs = 300;
			const adjusted = adapter.getAnimationDuration(baseMs);
			expect(adjusted).toBe(baseMs);
		});
	});

	describe('Memory-sensitive viewer choices', () => {
		it('enables caching for modern profile', () => {
			const adapter = createPerformanceAdapter(modernPlatformCapabilities);
			expect(adapter.shouldCacheImages()).toBe(true);
		});

		it('disables aggressive caching for legacy profile', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			expect(adapter.shouldCacheImages()).toBe(false);
		});

		it('returns appropriate viewer pool size for modern', () => {
			const adapter = createPerformanceAdapter(modernPlatformCapabilities);
			expect(adapter.getViewerPoolSize()).toBeGreaterThanOrEqual(10);
		});

		it('returns reduced viewer pool size for legacy', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			expect(adapter.getViewerPoolSize()).toBeLessThanOrEqual(5);
		});

		it('enables progressive loading for legacy profile', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			expect(adapter.shouldUseProgressiveLoading()).toBe(true);
		});
	});

	describe('Performance profile extraction', () => {
		it('returns complete performance profile for legacy', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			const profile = adapter.getProfile();

			expect(profile.imageVariant).toBe('preview');
			expect(profile.prefetchStrategy).toBe('conservative');
			expect(profile.animationLevel).toBe('reduced');
			expect(profile.memoryConscious).toBe(true);
		});

		it('returns complete performance profile for modern', () => {
			const adapter = createPerformanceAdapter(modernPlatformCapabilities);
			const profile = adapter.getProfile();

			expect(profile.imageVariant).toBe('original');
			expect(profile.prefetchStrategy).toBe('aggressive');
			expect(profile.animationLevel).toBe('full');
			expect(profile.memoryConscious).toBe(false);
		});
	});

	describe('Edge cases', () => {
		it('handles missing originalPhoto capability gracefully', () => {
			const customCapabilities: PlatformCapabilities = {
				...modernPlatformCapabilities,
				originalPhoto: {
					...modernPlatformCapabilities.originalPhoto,
					supported: false,
					status: 'disabled',
				},
			};

			const adapter = createPerformanceAdapter(customCapabilities);
			expect(adapter.shouldUseOriginal()).toBe(false);
			expect(adapter.getPreferredImageVariant()).toBe('preview');
		});

		it('respects server-proxy-required status for image variants', () => {
			const adapter = createPerformanceAdapter(legacyPlatformCapabilities);
			const usesServerProxy = legacyPlatformCapabilities.originalPhoto.serverProxyRequired;
			expect(usesServerProxy).toBe(true);
			expect(adapter.shouldUseOriginal()).toBe(false);
		});
	});
});
