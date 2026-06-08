import {APIError} from '../api/client';

export type ErrorClassification = 'authentication' | 'transport' | 'client' | 'server' | 'unknown';

export interface FetchProbeResult {
	available: boolean;
	reason?: string;
}

export interface BlobProbeResult {
	available: boolean;
	reason?: string;
}

export interface ErrorClassificationResult {
	type: ErrorClassification;
	description: string;
	originalError: Error;
	isCORS?: boolean;
	isTLS?: boolean;
	isTimeout?: boolean;
	isAborted?: boolean;
	statusCode?: number;
}

export interface NetworkAdapter {
	canFetch(): boolean;
	canUseBlob(): boolean;
	classifyError(error: Error): ErrorClassificationResult;
	getFetchUnavailableReason(): string | undefined;
	getBlobUnavailableReason(): string | undefined;
	getProbeResults(): {fetch: FetchProbeResult; blob: BlobProbeResult};
}

export function probeFetch(): FetchProbeResult {
	if (typeof fetch === 'undefined' || fetch === null) {
		return {
			available: false,
			reason: 'fetch API not available',
		};
	}

	return {available: true};
}

export function probeBlob(): BlobProbeResult {
	if (typeof Blob === 'undefined' || Blob === null) {
		return {
			available: false,
			reason: 'Blob API not available',
		};
	}

	return {available: true};
}

export function classifyError(error: Error): ErrorClassification {
	if (error instanceof APIError && error.status) {
		if (error.status === 401 || error.status === 403) {
			return 'authentication';
		}
		if (error.status >= 400 && error.status < 500) {
			return 'client';
		}
		if (error.status >= 500) {
			return 'server';
		}
	}

	if (error instanceof TypeError) {
		return 'transport';
	}

	const message = error.message.toLowerCase();
	if (
		message.includes('network') ||
		message.includes('timeout') ||
		message.includes('aborted') ||
		message.includes('cors') ||
		message.includes('ssl') ||
		message.includes('tls')
	) {
		return 'transport';
	}

	return 'unknown';
}

export function classifyFetchError(error: Error): ErrorClassificationResult {
	const type = classifyError(error);
	const message = error.message.toLowerCase();

	const isCORS = message.includes('cors');
	const isTLS = message.includes('ssl') || message.includes('tls') || message.includes('certificate');
	const isTimeout = message.includes('timeout');
	const isAborted = error instanceof DOMException && error.name === 'AbortError';

	let description = 'Unknown error';
	let statusCode: number | undefined;

	if (error instanceof APIError && error.status) {
		statusCode = error.status;
		if (error.status === 401) {
			description = 'Authentication required: Invalid or expired credentials';
		} else if (error.status === 403) {
			description = 'Authentication error: Access forbidden';
		} else if (error.status >= 400 && error.status < 500) {
			description = `Client error: ${error.message}`;
		} else if (error.status >= 500) {
			description = `Server error: ${error.message}`;
		}
	} else if (isCORS) {
		description = 'CORS policy blocked the request';
	} else if (isTLS) {
		description = 'TLS/SSL certificate error';
	} else if (isTimeout) {
		description = 'Network timeout exceeded';
	} else if (isAborted) {
		description = 'Request was aborted';
	} else if (error instanceof TypeError) {
		description = 'Network connection failed';
	} else {
		description = error.message;
	}

	return {
		type,
		description,
		originalError: error,
		isCORS,
		isTLS,
		isTimeout,
		isAborted,
		statusCode,
	};
}

export function createNetworkAdapter(fetchProbe: FetchProbeResult, blobProbe: BlobProbeResult): NetworkAdapter {
	return {
		canFetch(): boolean {
			return fetchProbe.available;
		},

		canUseBlob(): boolean {
			return blobProbe.available;
		},

		classifyError(error: Error): ErrorClassificationResult {
			return classifyFetchError(error);
		},

		getFetchUnavailableReason(): string | undefined {
			return fetchProbe.reason;
		},

		getBlobUnavailableReason(): string | undefined {
			return blobProbe.reason;
		},

		getProbeResults() {
			return {
				fetch: fetchProbe,
				blob: blobProbe,
			};
		},
	};
}
