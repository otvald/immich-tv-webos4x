import React from 'react';
import {render, screen} from '@testing-library/react';
import {
	PlatformFacadeProvider,
	createPlatformFacade,
	createPlatformFacadeFromDiagnostics,
	createSupportedFeatureGate,
	modernPlatformCapabilities,
	usePlatformFacade,
} from '../index';

import {legacyProfile, modernProfile} from '../../__tests__/fixtures/platformProfiles';

describe('platform capabilities registry', () => {
	test('modern defaults mark all capabilities as supported', () => {
		const facade = createPlatformFacade({target: 'modern'});

		expect(facade.target).toBe('modern');
		expect(facade.capabilities).toEqual(modernPlatformCapabilities);

		Object.entries(facade.capabilities).forEach(([feature, capability]) => {
			expect(capability.status).toBe('supported');
			expect(capability.reason).toBeUndefined();
			expect(capability.supported).toBe(true);
			expect(modernProfile.capabilities[feature as keyof typeof modernProfile.capabilities].supported).toBe(true);
		});
	});

	test('legacy defaults are seeded from diagnostics-oriented profile reasons', () => {
		const facade = createPlatformFacade({target: 'legacy'});

		expect(facade.target).toBe('legacy');
		expect(facade.capabilities.video).toMatchObject({
			status: 'degraded',
			reason: legacyProfile.capabilities.video.reason,
			supported: true,
		});
		expect(facade.capabilities.originalPhoto).toMatchObject({
			status: 'server-proxy-required',
			reason: legacyProfile.capabilities.originalPhoto.reason,
			supported: true,
		});
		expect(facade.capabilities.webp).toMatchObject({
			status: 'disabled',
			reason: legacyProfile.capabilities.webp.reason,
			supported: false,
		});
		expect(facade.capabilities.blob).toMatchObject({
			status: 'disabled',
			reason: legacyProfile.capabilities.blob.reason,
			supported: false,
		});
		expect(facade.capabilities.localStorage).toEqual(createSupportedFeatureGate());
		expect(facade.capabilities.fetch).toEqual(createSupportedFeatureGate());
	});

	test('diagnostics can override resolved target and capability statuses', () => {
		const facade = createPlatformFacadeFromDiagnostics({
			target: 'modern',
			diagnostics: {
				target: 'legacy',
				capabilities: {
					video: {
						status: 'supported',
					},
					blob: {
						status: 'degraded',
						reason: 'Partial Blob support detected during diagnostics',
					},
				},
			},
		});

		expect(facade.target).toBe('legacy');
		expect(facade.getCapability('video')).toMatchObject({status: 'supported', supported: true});
		expect(facade.getCapability('blob')).toMatchObject({
			status: 'degraded',
			reason: 'Partial Blob support detected during diagnostics',
			supported: true,
		});
		expect(facade.supports('blob')).toBe(true);
		expect(facade.requiresServerProxy('originalPhoto')).toBe(true);
	});

	test('provider injection exposes the facade as the single source of truth', () => {
		const facade = createPlatformFacade({target: 'legacy'});

		const Consumer = () => {
			const platform = usePlatformFacade();
			return React.createElement(
				React.Fragment,
				null,
				React.createElement('div', {"data-testid": 'target'}, platform.target),
				React.createElement('div', {"data-testid": 'video-status'}, platform.getCapability('video').status),
				React.createElement(
					'div',
					{"data-testid": 'original-photo-status'},
					platform.getCapability('originalPhoto').status,
				),
			);
		};

		render(
			React.createElement(
				PlatformFacadeProvider,
				{value: facade},
				React.createElement(Consumer),
			),
		);

		expect(screen.getByTestId('target').textContent).toBe('legacy');
		expect(screen.getByTestId('video-status').textContent).toBe('degraded');
		expect(screen.getByTestId('original-photo-status').textContent).toBe('server-proxy-required');
	});
});
