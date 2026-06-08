import {
	runRuntimeDiagnostics,
	formatDiagnosticsReport,
	exportDiagnosticsAsJSON,
	logDiagnostics,
	createDiagnosticsSnapshot,
	runFetchTlsProbe,
	type RuntimeDiagnostics,
} from '../diagnostics';
import {recordApiError, clearLatestApiError} from '../../api/errorStore';
import {API_ERROR_CODES} from '../../api/client';

describe('RuntimeDiagnostics', () => {
	describe('runRuntimeDiagnostics', () => {
		it('returns diagnostics with storage and network probes', () => {
			const diagnostics = runRuntimeDiagnostics();

			expect(diagnostics.storage.localStorage).toBeDefined();
			expect(diagnostics.storage.sessionStorage).toBeDefined();
			expect(diagnostics.network.fetch).toBeDefined();
			expect(diagnostics.network.blob).toBeDefined();
			expect(diagnostics.boot).toBeDefined();
			expect(diagnostics.memory).toBeDefined();
			expect(diagnostics.timestamp).toBeDefined();
		});

		it('includes availability status for localStorage', () => {
			const diagnostics = runRuntimeDiagnostics();
			expect(typeof diagnostics.storage.localStorage.available).toBe('boolean');
		});

		it('includes availability status for fetch', () => {
			const diagnostics = runRuntimeDiagnostics();
			expect(typeof diagnostics.network.fetch.available).toBe('boolean');
		});

		it('includes boot timing information', () => {
			const diagnostics = runRuntimeDiagnostics();
			expect(diagnostics.boot.startTime).toBeDefined();
			expect(typeof diagnostics.boot.startTime).toBe('number');
		});

		it('includes memory information', () => {
			const diagnostics = runRuntimeDiagnostics();
			expect(diagnostics.memory.available).toBeDefined();
			expect(typeof diagnostics.memory.available).toBe('boolean');
			expect(diagnostics.memory.notes).toBeDefined();
		});

		it('includes timestamp in ISO format', () => {
			const diagnostics = runRuntimeDiagnostics();
			expect(diagnostics.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});
	});

	describe('formatDiagnosticsReport', () => {
		it('formats diagnostics as human-readable text', () => {
			const diagnostics: RuntimeDiagnostics = {
				storage: {
					localStorage: {available: true},
					sessionStorage: {available: true},
				},
				network: {
					fetch: {available: true},
					blob: {available: true},
				},
				boot: {
					startTime: 1234.56,
					diagRunTime: 12.34,
					totalBootTime: 5678.90,
				},
				memory: {
					available: true,
					notes: 'Test memory info',
				},
				timestamp: '2025-01-01T00:00:00.000Z',
			};

			const report = formatDiagnosticsReport(diagnostics);

			expect(report).toContain('Runtime Diagnostics Report');
			expect(report).toContain('Generated: 2025-01-01T00:00:00.000Z');
			expect(report).toContain('Boot Timing:');
			expect(report).toContain('Start Time:');
			expect(report).toContain('Memory:');
			expect(report).toContain('localStorage: ✓ Available');
			expect(report).toContain('fetch: ✓ Available');
		});

		it('includes unavailable status', () => {
			const diagnostics: RuntimeDiagnostics = {
				storage: {
					localStorage: {available: false, reason: 'localStorage not available'},
					sessionStorage: {available: true},
				},
				network: {
					fetch: {available: false, reason: 'fetch API not available'},
					blob: {available: true},
				},
				boot: {
					startTime: 1234.56,
				},
				memory: {
					available: false,
					notes: 'Memory API not available',
				},
				timestamp: '2025-01-01T00:00:00.000Z',
			};

			const report = formatDiagnosticsReport(diagnostics);

			expect(report).toContain('localStorage: ✗ Unavailable');
			expect(report).toContain('Reason: localStorage not available');
			expect(report).toContain('fetch: ✗ Unavailable');
			expect(report).toContain('Reason: fetch API not available');
		});
	});

	describe('exportDiagnosticsAsJSON', () => {
		it('exports diagnostics as JSON string', () => {
			const diagnostics: RuntimeDiagnostics = {
				storage: {
					localStorage: {available: true},
					sessionStorage: {available: true},
				},
				network: {
					fetch: {available: true},
					blob: {available: true},
				},
				boot: {
					startTime: 1234.56,
				},
				memory: {
					available: true,
					notes: 'Test memory',
				},
				timestamp: '2025-01-01T00:00:00.000Z',
			};

			const json = exportDiagnosticsAsJSON(diagnostics);
			const parsed = JSON.parse(json);

			expect(parsed.storage.localStorage.available).toBe(true);
			expect(parsed.network.fetch.available).toBe(true);
			expect(parsed.timestamp).toBe('2025-01-01T00:00:00.000Z');
		});

		it('includes reasons in JSON export', () => {
			const diagnostics: RuntimeDiagnostics = {
				storage: {
					localStorage: {available: false, reason: 'Security restrictions'},
					sessionStorage: {available: true},
				},
				network: {
					fetch: {available: true},
					blob: {available: false, reason: 'Blob not supported'},
				},
				boot: {
					startTime: 1234.56,
				},
				memory: {
					available: false,
					notes: 'Memory not available',
				},
				timestamp: '2025-01-01T00:00:00.000Z',
			};

			const json = exportDiagnosticsAsJSON(diagnostics);
			const parsed = JSON.parse(json);

			expect(parsed.storage.localStorage.reason).toBe('Security restrictions');
			expect(parsed.network.blob.reason).toBe('Blob not supported');
		});
	});

		describe('extended diagnostics snapshot', () => {
			beforeEach(() => {
				clearLatestApiError();
			});

			it('includes required export fields and handles missing webOS APIs', async () => {
			const snapshot = await createDiagnosticsSnapshot({target: 'legacy', keyEventSamples: []});

			expect(snapshot.target).toBe('legacy');
			expect(snapshot.userAgent).toBeDefined();
			expect(snapshot.appId).toBeDefined();
			expect(snapshot.webOSApis.PalmSystem).toBe(false);
			expect(snapshot.jsApis.localStorage.available).toBeDefined();
			expect(snapshot.cssMediaImageProbes.css).toBeDefined();
			expect(snapshot.fetchTlsProbe.status).toBeDefined();
				expect(Array.isArray(snapshot.keyEventSamples)).toBe(true);
			});

			it('includes null latestApiError when no API error has occurred', async () => {
				const snapshot = await createDiagnosticsSnapshot({target: 'legacy', keyEventSamples: []});
				expect(snapshot.latestApiError).toBeNull();
			});

			it('includes latest API error in diagnostics snapshot', async () => {
				recordApiError({
					code: API_ERROR_CODES.HTML_RESPONSE,
					message: 'Server returned HTML instead of JSON',
					status: 200,
					endpoint: '/api/assets',
					contentType: 'text/html',
					responsePreview: '<!DOCTYPE html><html>',
				});

				const snapshot = await createDiagnosticsSnapshot({target: 'legacy', keyEventSamples: []});
				expect(snapshot.latestApiError).not.toBeNull();
				expect(snapshot.latestApiError?.code).toBe(API_ERROR_CODES.HTML_RESPONSE);
				expect(snapshot.latestApiError?.endpoint).toBe('/api/assets');
				expect(snapshot.latestApiError?.contentType).toBe('text/html');
				expect(snapshot.latestApiError?.responsePreview).toBe('<!DOCTYPE html><html>');
			});

			it('includes latest API error with network error code', async () => {
				recordApiError({
					code: API_ERROR_CODES.NETWORK_ERROR,
					message: 'Network error: Failed to fetch',
					endpoint: '/api/server-info',
				});

				const snapshot = await createDiagnosticsSnapshot({target: 'modern', keyEventSamples: []});
				expect(snapshot.latestApiError).not.toBeNull();
				expect(snapshot.latestApiError?.code).toBe(API_ERROR_CODES.NETWORK_ERROR);
				expect(snapshot.latestApiError?.endpoint).toBe('/api/server-info');
				expect(snapshot.latestApiError?.status).toBeUndefined();
			});

			it('exports diagnostics with API error as JSON', async () => {
				recordApiError({
					code: API_ERROR_CODES.JSON_PARSE_ERROR,
					message: 'Failed to parse JSON response',
					status: 200,
					endpoint: '/api/assets',
					contentType: 'application/json',
					responsePreview: '{invalid json',
				});

				const snapshot = await createDiagnosticsSnapshot({target: 'legacy', keyEventSamples: []});
				const json = exportDiagnosticsAsJSON(snapshot);
				const parsed = JSON.parse(json);

				expect(parsed.latestApiError).toBeDefined();
				expect(parsed.latestApiError.code).toBe(API_ERROR_CODES.JSON_PARSE_ERROR);
				expect(parsed.latestApiError.responsePreview).toBe('{invalid json');
			});

			it('reports failed TLS probe when fetch rejects', async () => {
				const originalFetch = global.fetch;
				global.fetch = jest.fn().mockRejectedValue(new TypeError('TLS handshake failed')) as unknown as typeof fetch;

				const result = await runFetchTlsProbe('http://localhost/health');

				expect(result.status).toBe('failed');
				expect(result.reason).toContain('TLS');

				global.fetch = originalFetch;
			});
		});

	describe('logDiagnostics', () => {
		it('logs diagnostics to console', () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			const diagnostics: RuntimeDiagnostics = {
				storage: {
					localStorage: {available: true},
					sessionStorage: {available: true},
				},
				network: {
					fetch: {available: true},
					blob: {available: true},
				},
				boot: {
					startTime: 1234.56,
				},
				memory: {
					available: true,
					notes: 'Test memory',
				},
				timestamp: '2025-01-01T00:00:00.000Z',
			};

			logDiagnostics(diagnostics);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Runtime Diagnostics Report')
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('localStorage: ✓ Available')
			);

			consoleSpy.mockRestore();
		});

		it('runs diagnostics when none provided', () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			logDiagnostics();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Runtime Diagnostics Report')
			);

			consoleSpy.mockRestore();
		});
	});
});
