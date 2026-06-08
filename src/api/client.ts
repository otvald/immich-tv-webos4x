import {AuthMethod, type AuthConfig} from './types';
import {recordApiError} from './errorStore';

export const API_ERROR_CODES = {
	NETWORK_ERROR: 'IMMICH_API_NETWORK_ERROR',
	HTTP_ERROR: 'IMMICH_API_HTTP_ERROR',
	JSON_PARSE_ERROR: 'IMMICH_API_JSON_PARSE_ERROR',
	NON_JSON_RESPONSE: 'IMMICH_API_NON_JSON_RESPONSE',
	HTML_RESPONSE: 'IMMICH_API_HTML_RESPONSE',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface ApiErrorDetails {
	code: ApiErrorCode;
	message: string;
	status?: number;
	endpoint?: string;
	contentType?: string;
	responsePreview?: string;
}

export class APIError extends Error {
	public status?: number;
	public code: ApiErrorCode;
	public endpoint?: string;
	public contentType?: string;
	public responsePreview?: string;

	constructor(details: ApiErrorDetails) {
		super(details.message);
		this.name = 'APIError';
		this.code = details.code;
		this.status = details.status;
		this.endpoint = details.endpoint;
		this.contentType = details.contentType;
		this.responsePreview = details.responsePreview;
	}
}

export class APIClient {
	private baseUrl: string;
	private authConfig: AuthConfig;

	constructor(config: AuthConfig) {
		let normalized = config.baseUrl.trim();
		normalized = normalized.replace(/\/+$/, '');
		if (!normalized.endsWith('/api')) {
			normalized = `${normalized}/api`;
		}

		this.baseUrl = normalized;
		this.authConfig = config;
	}

	private getHeaders(): HeadersInit {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		};
		switch (this.authConfig.method) {
			case AuthMethod.USER_CREDENTIALS:
				if (this.authConfig.accessToken) headers.Authorization = `Bearer ${this.authConfig.accessToken}`;
				break;
			case AuthMethod.API_KEY:
				headers['x-api-key'] = this.authConfig.apiKey;
				break;
		}
		return headers;
	}

	private getMediaAuthParam(): {name: string; value: string} {
		return this.authConfig.method === 'USER_CREDENTIALS' ? {name: 'sessionKey', value: this.authConfig.accessToken || ''} : {name: 'apiKey', value: this.authConfig.apiKey};
	}

	public async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const method = options.method || 'GET';

		try {
			const response = await fetch(url, {
				...options,
				headers: {...this.getHeaders(), ...options.headers},
			});

			if (!response.ok) {
				const contentType = response.headers.get('content-type') || '';
				const text = await response.text();
				const preview = text.substring(0, 200);

				const errorDetails: ApiErrorDetails = {
					code: API_ERROR_CODES.HTTP_ERROR,
					message: `API request failed: ${response.statusText}`,
					status: response.status,
					endpoint,
					contentType,
					responsePreview: preview,
				};

				console.error(`[API] ${method} ${url} failed with ${response.status}: ${response.statusText}`);
				recordApiError(errorDetails);
				throw new APIError(errorDetails);
			}

			const contentType = response.headers.get('content-type') || '';
			const text = await response.text();

			if (!text) {
				return {} as T;
			}

			if (contentType.toLowerCase().includes('text/html')) {
				const preview = text.substring(0, 200);
				const errorDetails: ApiErrorDetails = {
					code: API_ERROR_CODES.HTML_RESPONSE,
					message: 'Server returned HTML instead of JSON',
					status: response.status,
					endpoint,
					contentType,
					responsePreview: preview,
				};

				console.error(`[API] ${method} ${url} returned HTML response`);
				recordApiError(errorDetails);
				throw new APIError(errorDetails);
			}

			if (contentType && !contentType.toLowerCase().includes('application/json')) {
				const preview = text.substring(0, 200);
				const errorDetails: ApiErrorDetails = {
					code: API_ERROR_CODES.NON_JSON_RESPONSE,
					message: `Server returned non-JSON content type: ${contentType}`,
					status: response.status,
					endpoint,
					contentType,
					responsePreview: preview,
				};

				console.error(`[API] ${method} ${url} returned non-JSON content type: ${contentType}`);
				recordApiError(errorDetails);
				throw new APIError(errorDetails);
			}

			try {
				return JSON.parse(text);
			} catch (parseError) {
				const preview = text.substring(0, 200);
				const errorDetails: ApiErrorDetails = {
					code: API_ERROR_CODES.JSON_PARSE_ERROR,
					message: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
					status: response.status,
					endpoint,
					contentType,
					responsePreview: preview,
				};

				console.error(`[API] ${method} ${url} JSON parse error:`, parseError);
				recordApiError(errorDetails);
				throw new APIError(errorDetails);
			}
		} catch (error) {
			if (error instanceof APIError) {
				throw error;
			}

			const errorDetails: ApiErrorDetails = {
				code: API_ERROR_CODES.NETWORK_ERROR,
				message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				endpoint,
			};

			console.error(`[API] ${method} ${url} network error:`, error);
			recordApiError(errorDetails);
			throw new APIError(errorDetails);
		}
	}

	public async fetchBlob(endpoint: string): Promise<Blob> {
		const url = `${this.baseUrl}${endpoint}`;
		const {name, value} = this.getMediaAuthParam();
		const urlWithAuth = url.includes('?') ? `${url}&${name}=${value}` : `${url}?${name}=${value}`;

		const response = await fetch(urlWithAuth);
		if (!response.ok) {
			const errorDetails: ApiErrorDetails = {
				code: API_ERROR_CODES.HTTP_ERROR,
				message: `Failed to fetch blob: ${response.statusText}`,
				status: response.status,
				endpoint,
			};
			recordApiError(errorDetails);
			throw new APIError(errorDetails);
		}

		return response.blob();
	}

	public getThumbnailUrl(assetId: string, size: 'preview' | 'thumbnail' = 'thumbnail'): string {
		const {name, value} = this.getMediaAuthParam();
		return `${this.baseUrl}/assets/${assetId}/thumbnail?size=${size}&${name}=${value}`;
	}

	public getFaceThumbnailUrl(personId: string): string {
		const {name, value} = this.getMediaAuthParam();
		return `${this.baseUrl}/people/${personId}/thumbnail?${name}=${value}`;
	}

	public getAssetUrl(assetId: string): string {
		const {name, value} = this.getMediaAuthParam();
		return `${this.baseUrl}/assets/${assetId}/original?${name}=${value}`;
	}

	public getVideoPlaybackUrl(assetId: string): string {
		const {name, value} = this.getMediaAuthParam();
		return `${this.baseUrl}/assets/${assetId}/video/playback?${name}=${value}`;
	}
}
