import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';

import {PlatformFacadeProvider, createPlatformFacade} from '../../platform';
import {DiagnosticsPanel} from './DiagnosticsPanel';

jest.mock('../../platform/diagnostics', () => {
	const actual = jest.requireActual('../../platform/diagnostics');
	const recentErrors = [
		{
			timestamp: '2026-06-06T00:00:01.000Z',
			message: 'Mock legacy crash',
			type: 'error',
			url: 'main.js',
			line: 12,
			column: 34,
			stack: 'Error: Mock legacy crash',
		},
	];

	return {
		...actual,
		createDiagnosticsSnapshot: jest.fn().mockResolvedValue({
			timestamp: '2026-06-06T00:00:00.000Z',
			target: 'legacy',
			userAgent: 'Mock UA',
			appId: 'com.seeky91.immichtv.beta',
			deviceInfo: {
				platform: 'webOS',
				vendor: 'LG',
				language: 'en-US',
				screen: {width: 1920, height: 1080, pixelRatio: 1},
			},
			webOSApis: {
				PalmSystem: false,
				webOSSystem: false,
				webOS: false,
				webkitMessageHandlers: false,
				serviceBridge: false,
				serviceRequest: false,
				deviceInfo: {},
				rawValues: {},
			},
			jsApis: {
				localStorage: {available: true},
				sessionStorage: {available: true},
				fetch: {available: true},
				Blob: {available: true},
				Promise: true,
				PromiseFinally: true,
				URL: true,
				TextDecoder: true,
				AbortController: true,
			},
			cssMediaImageProbes: {
				css: {supports: true, grid: true, flexGap: true, objectFit: true},
				media: {
					matchMedia: true,
					prefersReducedMotion: false,
					colorGamutP3: false,
					videoCanPlay: {h264: 'probably', webm: '', hls: 'maybe'},
				},
				images: {canvas: true, png: true, jpeg: true, webp: false, avif: false},
			},
			runtime: {
				storage: {localStorage: {available: true}, sessionStorage: {available: true}},
				network: {fetch: {available: true}, blob: {available: true}},
				boot: {startTime: 1, diagRunTime: 2, totalBootTime: 3},
				memory: {available: false, notes: 'n/a'},
				timestamp: '2026-06-06T00:00:00.000Z',
			},
			bootTiming: {startTime: 1, diagRunTime: 2, totalBootTime: 3},
			errorLogSummary: {count: 1, lastError: recentErrors[0], recentErrors},
			fetchTlsProbe: {attempted: false, status: 'skipped', reason: 'not https'},
			keyEventSamples: [],
		}),
	};
});

jest.mock('../../App/attachErrorHandler', () => ({
	clearErrorLogEntries: jest.fn(),
}));

describe('DiagnosticsPanel', () => {
	beforeEach(() => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {writeText: jest.fn().mockResolvedValue(undefined)},
		});
	});

	test('renders diagnostics summary and export JSON', async () => {
		render(
			<PlatformFacadeProvider value={createPlatformFacade({target: 'legacy'})}>
				<DiagnosticsPanel />
			</PlatformFacadeProvider>,
		);

		expect(await screen.findByText('Diagnostics')).toBeTruthy();
		expect(screen.getByText(/Target: legacy/i)).toBeTruthy();
		expect(screen.getByLabelText('Stored error log').textContent).toContain('Mock legacy crash');
		const exportField = screen.getByLabelText('Diagnostics JSON export') as HTMLTextAreaElement;
		expect(exportField.value).toContain('com.seeky91.immichtv.beta');
		expect(exportField.value).toContain('Mock legacy crash');
	});

	test('copies JSON to clipboard and records key samples', async () => {
		render(
			<PlatformFacadeProvider value={createPlatformFacade({target: 'modern'})}>
				<DiagnosticsPanel />
			</PlatformFacadeProvider>,
		);

		fireEvent.keyDown(window, {key: 'Back', code: 'BrowserBack', keyCode: 461});
		fireEvent.click(await screen.findByRole('button', {name: /Copy JSON/i}));

		await waitFor(() => {
			expect(navigator.clipboard.writeText).toHaveBeenCalled();
		});
		expect(screen.getByText(/copied to clipboard/i)).toBeTruthy();
	});
});
