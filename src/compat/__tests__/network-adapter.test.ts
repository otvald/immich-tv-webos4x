import {APIError, API_ERROR_CODES} from '../../api/client';
import {
	classifyError,
	classifyFetchError,
	probeFetch,
	probeBlob,
	createNetworkAdapter,
	type FetchProbeResult,
	type BlobProbeResult,
} from '../network-adapter';

describe('NetworkAdapter', () => {
	let originalFetch: typeof global.fetch;

	beforeEach(() => {
		originalFetch = global.fetch;
		global.fetch = jest.fn() as any;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	describe('probeFetch', () => {
		it('returns available when fetch is defined', () => {
			const result = probeFetch();
			expect(result.available).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it('returns unavailable when fetch is undefined', () => {
			Object.defineProperty(global, 'fetch', {
				value: undefined,
				writable: true,
				configurable: true,
			});

			const result = probeFetch();
			expect(result.available).toBe(false);
			expect(result.reason).toBe('fetch API not available');
		});

		it('returns unavailable when fetch is null', () => {
			Object.defineProperty(global, 'fetch', {
				value: null,
				writable: true,
				configurable: true,
			});

			const result = probeFetch();
			expect(result.available).toBe(false);
			expect(result.reason).toBe('fetch API not available');
		});
	});

	describe('probeBlob', () => {
		it('returns available when Blob is defined', () => {
			const result = probeBlob();
			expect(result.available).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it('returns unavailable when Blob is undefined', () => {
			const originalBlob = global.Blob;
			Object.defineProperty(global, 'Blob', {
				value: undefined,
				writable: true,
				configurable: true,
			});

			const result = probeBlob();
			expect(result.available).toBe(false);
			expect(result.reason).toBe('Blob API not available');

			Object.defineProperty(global, 'Blob', {
				value: originalBlob,
				writable: true,
				configurable: true,
			});
		});
	});

	describe('classifyError', () => {
		it('classifies 401 as authentication error', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Unauthorized', status: 401});
			expect(classifyError(error)).toBe('authentication');
		});

		it('classifies 403 as authentication error', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Forbidden', status: 403});
			expect(classifyError(error)).toBe('authentication');
		});

		it('classifies 400 as client error', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Bad Request', status: 400});
			expect(classifyError(error)).toBe('client');
		});

		it('classifies 404 as client error', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Not Found', status: 404});
			expect(classifyError(error)).toBe('client');
		});

		it('classifies 422 as client error', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Unprocessable Entity', status: 422});
			expect(classifyError(error)).toBe('client');
		});

		it('classifies 500 as server error', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Internal Server Error', status: 500});
			expect(classifyError(error)).toBe('server');
		});

		it('classifies 502 as server error', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Bad Gateway', status: 502});
			expect(classifyError(error)).toBe('server');
		});

		it('classifies 503 as server error', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Service Unavailable', status: 503});
			expect(classifyError(error)).toBe('server');
		});

		it('classifies TypeError as transport error', () => {
			const error = new TypeError('Failed to fetch');
			expect(classifyError(error)).toBe('transport');
		});

		it('classifies CORS error as transport', () => {
			const error = new TypeError('CORS policy: No Access-Control-Allow-Origin header');
			expect(classifyError(error)).toBe('transport');
		});

		it('classifies network timeout as transport', () => {
			const error = new Error('Network timeout');
			expect(classifyError(error)).toBe('transport');
		});

		it('classifies fetch abort as transport', () => {
			const error = new Error('The operation was aborted');
			expect(classifyError(error)).toBe('transport');
		});

		it('classifies unknown error as unknown', () => {
			const error = new Error('Some random error');
			expect(classifyError(error)).toBe('unknown');
		});

		it('classifies APIError without status as transport when message indicates network', () => {
			const error = new APIError({code: API_ERROR_CODES.NETWORK_ERROR, message: 'Network error'});
			expect(classifyError(error)).toBe('transport');
		});
	});

	describe('classifyFetchError', () => {
		it('detects CORS errors', () => {
			const error = new TypeError('Failed to fetch');
			const classification = classifyFetchError(error);
			expect(classification.type).toBe('transport');
			expect(classification.isCORS).toBe(false);
		});

		it('detects explicit CORS policy messages', () => {
			const error = new TypeError('CORS policy blocked');
			const classification = classifyFetchError(error);
			expect(classification.type).toBe('transport');
			expect(classification.isCORS).toBe(true);
		});

		it('detects TLS/SSL errors', () => {
			const error = new TypeError('SSL certificate invalid');
			const classification = classifyFetchError(error);
			expect(classification.type).toBe('transport');
			expect(classification.isTLS).toBe(true);
		});

		it('detects network timeout', () => {
			const error = new Error('Network timeout exceeded');
			const classification = classifyFetchError(error);
			expect(classification.type).toBe('transport');
			expect(classification.isTimeout).toBe(true);
		});

		it('detects AbortError', () => {
			const error = new DOMException('The operation was aborted', 'AbortError');
			const classification = classifyFetchError(error);
			expect(classification.type).toBe('transport');
			expect(classification.isAborted).toBe(true);
		});

		it('provides human-readable description for CORS', () => {
			const error = new TypeError('CORS policy blocked');
			const classification = classifyFetchError(error);
			expect(classification.description).toContain('CORS');
		});

		it('provides human-readable description for TLS', () => {
			const error = new TypeError('SSL certificate invalid');
			const classification = classifyFetchError(error);
			expect(classification.description).toContain('TLS');
		});

		it('provides human-readable description for network timeout', () => {
			const error = new Error('timeout');
			const classification = classifyFetchError(error);
			expect(classification.description).toContain('Network timeout');
		});

		it('provides human-readable description for 401', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Unauthorized', status: 401});
			const classification = classifyFetchError(error);
			expect(classification.description).toContain('Authentication');
		});

		it('provides human-readable description for 500', () => {
			const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Internal Server Error', status: 500});
			const classification = classifyFetchError(error);
			expect(classification.description).toContain('Server error');
		});

		it('preserves original error', () => {
			const error = new Error('test error');
			const classification = classifyFetchError(error);
			expect(classification.originalError).toBe(error);
		});
	});

	describe('NetworkAdapter', () => {
		describe('canFetch', () => {
			it('returns true when fetch is available', () => {
				const adapter = createNetworkAdapter({available: true}, {available: true});
				expect(adapter.canFetch()).toBe(true);
			});

			it('returns false when fetch probe failed', () => {
				const adapter = createNetworkAdapter(
					{available: false, reason: 'fetch not available'},
					{available: true}
				);
				expect(adapter.canFetch()).toBe(false);
			});
		});

		describe('canUseBlob', () => {
			it('returns true when Blob is available', () => {
				const adapter = createNetworkAdapter({available: true}, {available: true});
				expect(adapter.canUseBlob()).toBe(true);
			});

			it('returns false when Blob probe failed', () => {
				const adapter = createNetworkAdapter(
					{available: true},
					{available: false, reason: 'Blob not available'}
				);
				expect(adapter.canUseBlob()).toBe(false);
			});
		});

		describe('classifyError', () => {
			it('classifies errors using adapter', () => {
				const adapter = createNetworkAdapter({available: true}, {available: true});
				const error = new APIError({code: API_ERROR_CODES.HTTP_ERROR, message: 'Unauthorized', status: 401});
				const classification = adapter.classifyError(error);
				expect(classification.type).toBe('authentication');
				expect(classification.description).toBeDefined();
			});

			it('classifies transport errors', () => {
				const adapter = createNetworkAdapter({available: true}, {available: true});
				const error = new TypeError('Failed to fetch');
				const classification = adapter.classifyError(error);
				expect(classification.type).toBe('transport');
			});
		});

		describe('getFetchUnavailableReason', () => {
			it('returns undefined when fetch is available', () => {
				const adapter = createNetworkAdapter({available: true}, {available: true});
				expect(adapter.getFetchUnavailableReason()).toBeUndefined();
			});

			it('returns reason when fetch is unavailable', () => {
				const adapter = createNetworkAdapter(
					{available: false, reason: 'fetch not supported'},
					{available: true}
				);
				expect(adapter.getFetchUnavailableReason()).toBe('fetch not supported');
			});
		});

		describe('getBlobUnavailableReason', () => {
			it('returns undefined when Blob is available', () => {
				const adapter = createNetworkAdapter({available: true}, {available: true});
				expect(adapter.getBlobUnavailableReason()).toBeUndefined();
			});

			it('returns reason when Blob is unavailable', () => {
				const adapter = createNetworkAdapter(
					{available: true},
					{available: false, reason: 'Blob not supported'}
				);
				expect(adapter.getBlobUnavailableReason()).toBe('Blob not supported');
			});
		});

		describe('getProbeResults', () => {
			it('returns both probe results', () => {
				const fetchProbe: FetchProbeResult = {available: true};
				const blobProbe: BlobProbeResult = {available: true};
				const adapter = createNetworkAdapter(fetchProbe, blobProbe);
				const results = adapter.getProbeResults();
				expect(results.fetch).toEqual(fetchProbe);
				expect(results.blob).toEqual(blobProbe);
			});
		});
	});
});
