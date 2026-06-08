import {APIClient, APIError, API_ERROR_CODES} from './client';
import {AuthMethod, type ApiKeyConfig} from './types';
import {getLatestApiError, clearLatestApiError} from './errorStore';

const apiKeyConfig: ApiKeyConfig = {
	method: AuthMethod.API_KEY,
	baseUrl: 'https://immich.example.com',
	apiKey: 'test-api-key',
};

describe('APIClient error handling', () => {
	let client: APIClient;

	beforeEach(() => {
		client = new APIClient(apiKeyConfig);
		clearLatestApiError();
		global.fetch = jest.fn();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('HTML response detection', () => {
		it('throws IMMICH_API_HTML_RESPONSE error when server returns HTML', async () => {
			const htmlResponse = '<!DOCTYPE html><html><head><title>Login</title></head></html>';
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Map([['content-type', 'text/html; charset=utf-8']]),
				text: jest.fn().mockResolvedValue(htmlResponse),
			});

			await expect(client.fetch('/server-info')).rejects.toThrow(APIError);

			try {
				await client.fetch('/server-info');
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.HTML_RESPONSE);
					expect(error.message).toContain('HTML instead of JSON');
					expect(error.contentType).toBe('text/html; charset=utf-8');
					expect(error.responsePreview).toContain('<!DOCTYPE html>');
					expect(error.endpoint).toBe('/server-info');
					expect(error.status).toBe(200);
				}
			}

			const latestError = getLatestApiError();
			expect(latestError).not.toBeNull();
			expect(latestError?.code).toBe(API_ERROR_CODES.HTML_RESPONSE);
		});

		it('detects HTML regardless of content-type case', async () => {
			const htmlResponse = '<html><body>Content</body></html>';
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Map([['content-type', 'TEXT/HTML']]),
				text: jest.fn().mockResolvedValue(htmlResponse),
			});

			try {
				await client.fetch('/assets');
			} catch (error) {
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.HTML_RESPONSE);
				}
			}
		});
	});

	describe('Non-JSON response detection', () => {
		it('throws IMMICH_API_NON_JSON_RESPONSE when server returns XML', async () => {
			const xmlResponse = '<?xml version="1.0"?><error>Invalid request</error>';
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Map([['content-type', 'application/xml']]),
				text: jest.fn().mockResolvedValue(xmlResponse),
			});

			try {
				await client.fetch('/assets');
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.NON_JSON_RESPONSE);
					expect(error.message).toContain('non-JSON content type');
					expect(error.contentType).toBe('application/xml');
					expect(error.responsePreview).toContain('<?xml');
				}
			}
		});

		it('throws IMMICH_API_NON_JSON_RESPONSE when server returns plain text', async () => {
			const textResponse = 'Service temporarily unavailable';
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Map([['content-type', 'text/plain']]),
				text: jest.fn().mockResolvedValue(textResponse),
			});

			try {
				await client.fetch('/status');
			} catch (error) {
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.NON_JSON_RESPONSE);
					expect(error.contentType).toBe('text/plain');
				}
			}
		});
	});

	describe('JSON parse error detection', () => {
		it('throws IMMICH_API_JSON_PARSE_ERROR when response is not valid JSON', async () => {
			const invalidJson = '{invalid json here}';
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Map([['content-type', 'application/json']]),
				text: jest.fn().mockResolvedValue(invalidJson),
			});

			try {
				await client.fetch('/assets');
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.JSON_PARSE_ERROR);
					expect(error.message).toContain('Failed to parse JSON');
					expect(error.responsePreview).toBe(invalidJson);
					expect(error.contentType).toBe('application/json');
				}
			}
		});

		it('throws IMMICH_API_JSON_PARSE_ERROR when JSON is truncated', async () => {
			const truncatedJson = '{"assets": [{"id": "123"';
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Map([['content-type', 'application/json']]),
				text: jest.fn().mockResolvedValue(truncatedJson),
			});

			try {
				await client.fetch('/assets');
			} catch (error) {
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.JSON_PARSE_ERROR);
				}
			}
		});
	});

	describe('HTTP error detection', () => {
		it('throws IMMICH_API_HTTP_ERROR for 401 status', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				headers: new Map([['content-type', 'application/json']]),
				text: jest.fn().mockResolvedValue('{"message": "Invalid credentials"}'),
			});

			try {
				await client.fetch('/auth/login');
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.HTTP_ERROR);
					expect(error.status).toBe(401);
					expect(error.message).toContain('Unauthorized');
				}
			}
		});

		it('throws IMMICH_API_HTTP_ERROR for 500 status', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				headers: new Map([['content-type', 'application/json']]),
				text: jest.fn().mockResolvedValue('{"error": "Database connection failed"}'),
			});

			try {
				await client.fetch('/assets');
			} catch (error) {
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.HTTP_ERROR);
					expect(error.status).toBe(500);
				}
			}
		});
	});

	describe('Network error detection', () => {
		it('throws IMMICH_API_NETWORK_ERROR for fetch failures', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

			try {
				await client.fetch('/assets');
			} catch (error) {
				expect(error).toBeInstanceOf(APIError);
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.NETWORK_ERROR);
					expect(error.message).toContain('Network error');
				}
			}
		});

		it('throws IMMICH_API_NETWORK_ERROR for CORS errors', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new TypeError('CORS policy blocked'));

			try {
				await client.fetch('/assets');
			} catch (error) {
				if (error instanceof APIError) {
					expect(error.code).toBe(API_ERROR_CODES.NETWORK_ERROR);
					expect(error.message).toContain('CORS');
				}
			}
		});
	});

	describe('Response preview truncation', () => {
		it('truncates response preview to 200 characters', async () => {
			const longHtml = '<html><head><title>Very Long Page</title></head><body>' + 'X'.repeat(500) + '</body></html>';
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Map([['content-type', 'text/html']]),
				text: jest.fn().mockResolvedValue(longHtml),
			});

			try {
				await client.fetch('/assets');
			} catch (error) {
				if (error instanceof APIError) {
					expect(error.responsePreview).toBeDefined();
					expect(error.responsePreview!.length).toBe(200);
					expect(error.responsePreview).toBe(longHtml.substring(0, 200));
				}
			}
		});
	});

	describe('Valid JSON responses', () => {
		it('parses valid JSON response successfully', async () => {
			const jsonResponse = {assets: [{id: '123', type: 'image'}]};
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Map([['content-type', 'application/json']]),
				text: jest.fn().mockResolvedValue(JSON.stringify(jsonResponse)),
			});

			const result = await client.fetch('/assets');
			expect(result).toEqual(jsonResponse);
		});

		it('returns empty object for empty response body', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Map([['content-type', 'application/json']]),
				text: jest.fn().mockResolvedValue(''),
			});

			const result = await client.fetch('/assets');
			expect(result).toEqual({});
		});
	});
});
