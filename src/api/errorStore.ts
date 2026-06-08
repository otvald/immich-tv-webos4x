import type {ApiErrorDetails} from './client';

let latestApiError: ApiErrorDetails | null = null;

export function recordApiError(error: ApiErrorDetails): void {
	latestApiError = error;
}

export function getLatestApiError(): ApiErrorDetails | null {
	return latestApiError;
}

export function clearLatestApiError(): void {
	latestApiError = null;
}
