export interface StorageProbeResult {
	available: boolean;
	reason?: string;
}

export interface StorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): boolean;
	removeItem(key: string): void;
	isAvailable(): boolean;
	getUnavailableReason(): string | undefined;
	getProbeResult(): StorageProbeResult;
}

const TEST_KEY = '__storage_test__';

export function probeLocalStorage(): StorageProbeResult {
	if (typeof localStorage === 'undefined' || localStorage === null) {
		return {
			available: false,
			reason: 'localStorage not available',
		};
	}

	try {
		localStorage.setItem(TEST_KEY, 'test');
		localStorage.removeItem(TEST_KEY);
		return {available: true};
	} catch (error) {
		if (error instanceof DOMException) {
			if (error.name === 'SecurityError') {
				return {
					available: false,
					reason: 'Security restrictions prevent localStorage access',
				};
			}
			if (error.name === 'QuotaExceededError') {
				return {
					available: false,
					reason: 'Quota exceeded: localStorage is full',
				};
			}
		}
		return {
			available: false,
			reason: `localStorage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

export function probeSessionStorage(): StorageProbeResult {
	if (typeof sessionStorage === 'undefined' || sessionStorage === null) {
		return {
			available: false,
			reason: 'sessionStorage not available',
		};
	}

	try {
		sessionStorage.setItem(TEST_KEY, 'test');
		sessionStorage.removeItem(TEST_KEY);
		return {available: true};
	} catch (error) {
		return {
			available: false,
			reason: `sessionStorage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

export function createStorageAdapter(probeResult: StorageProbeResult): StorageAdapter {
	return {
		getItem(key: string): string | null {
			if (!probeResult.available) {
				return null;
			}

			try {
				return localStorage.getItem(key);
			} catch (error) {
				console.warn('[Storage] getItem failed:', error);
				return null;
			}
		},

		setItem(key: string, value: string): boolean {
			if (!probeResult.available) {
				console.warn('[Storage] setItem failed: storage unavailable', probeResult.reason);
				return false;
			}

			try {
				localStorage.setItem(key, value);
				return true;
			} catch (error) {
				console.warn('[Storage] setItem failed:', error);
				return false;
			}
		},

		removeItem(key: string): void {
			if (!probeResult.available) {
				return;
			}

			try {
				localStorage.removeItem(key);
			} catch (error) {
				console.warn('[Storage] removeItem failed:', error);
			}
		},

		isAvailable(): boolean {
			return probeResult.available;
		},

		getUnavailableReason(): string | undefined {
			return probeResult.reason;
		},

		getProbeResult(): StorageProbeResult {
			return probeResult;
		},
	};
}
