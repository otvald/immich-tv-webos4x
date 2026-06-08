/**
 * Platform profile fixture tests.
 * Proves that modern and legacy capability fixtures are distinguishable.
 */

import {modernProfile, legacyProfile, getProfileByTarget} from './fixtures/platformProfiles';

describe('Platform Profile Fixtures', () => {
	describe('Modern Profile', () => {
		test('marks core features as supported', () => {
			expect(modernProfile.target).toBe('modern');
			expect(modernProfile.capabilities.video.supported).toBe(true);
			expect(modernProfile.capabilities.originalPhoto.supported).toBe(true);
			expect(modernProfile.capabilities.webp.supported).toBe(true);
			expect(modernProfile.capabilities.localStorage.supported).toBe(true);
			expect(modernProfile.capabilities.fetch.supported).toBe(true);
			expect(modernProfile.capabilities.blob.supported).toBe(true);
		});

		test('modern profile has no degradation reasons', () => {
			Object.values(modernProfile.capabilities).forEach(capability => {
				if (capability.supported) {
					expect(capability.reason).toBeUndefined();
				}
			});
		});
	});

	describe('Legacy Profile', () => {
		test('marks video as degraded with reason text', () => {
			expect(legacyProfile.capabilities.video.supported).toBe(false);
			expect(legacyProfile.capabilities.video.reason).toBeDefined();
			expect(legacyProfile.capabilities.video.reason).toContain('webOS 4.x');
		});

		test('marks originalPhoto as degraded with reason text', () => {
			expect(legacyProfile.capabilities.originalPhoto.supported).toBe(false);
			expect(legacyProfile.capabilities.originalPhoto.reason).toBeDefined();
			expect(legacyProfile.capabilities.originalPhoto.reason).toContain('memory');
		});

		test('marks webp as degraded with reason text', () => {
			expect(legacyProfile.capabilities.webp.supported).toBe(false);
			expect(legacyProfile.capabilities.webp.reason).toBeDefined();
			expect(legacyProfile.capabilities.webp.reason).toContain('webOS 4.x');
		});

		test('marks blob as degraded with reason text', () => {
			expect(legacyProfile.capabilities.blob.supported).toBe(false);
			expect(legacyProfile.capabilities.blob.reason).toBeDefined();
			expect(legacyProfile.capabilities.blob.reason).toContain('webOS 4.x');
		});

		test('keeps localStorage and fetch supported', () => {
			expect(legacyProfile.capabilities.localStorage.supported).toBe(true);
			expect(legacyProfile.capabilities.fetch.supported).toBe(true);
		});
	});

	describe('Profile Differentiation', () => {
		test('modern and legacy profiles are distinguishable', () => {
			expect(modernProfile.target).not.toBe(legacyProfile.target);
			expect(modernProfile.capabilities.video.supported).not.toBe(
				legacyProfile.capabilities.video.supported,
			);
			expect(modernProfile.capabilities.originalPhoto.supported).not.toBe(
				legacyProfile.capabilities.originalPhoto.supported,
			);
		});

		test('getProfileByTarget returns correct profile', () => {
			expect(getProfileByTarget('modern')).toEqual(modernProfile);
			expect(getProfileByTarget('legacy')).toEqual(legacyProfile);
		});

		test('legacy profile includes user-visible reason for each disabled feature', () => {
			const disabledFeatures = Object.entries(legacyProfile.capabilities).filter(
				([, cap]) => !cap.supported,
			);
			expect(disabledFeatures.length).toBeGreaterThan(0);
			disabledFeatures.forEach(([, capability]) => {
				expect(capability.reason).toBeDefined();
				expect(capability.reason?.length).toBeGreaterThan(0);
			});
		});
	});
});
