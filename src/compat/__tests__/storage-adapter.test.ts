import {
	createStorageAdapter,
	probeLocalStorage,
	probeSessionStorage,
	type StorageProbeResult,
} from '../storage-adapter';

describe('StorageAdapter', () => {
	let originalLocalStorage: Storage;
	let originalSessionStorage: Storage;

	beforeEach(() => {
		originalLocalStorage = global.localStorage;
		originalSessionStorage = global.sessionStorage;
	});

	afterEach(() => {
		Object.defineProperty(global, 'localStorage', {
			value: originalLocalStorage,
			writable: true,
			configurable: true,
		});
		Object.defineProperty(global, 'sessionStorage', {
			value: originalSessionStorage,
			writable: true,
			configurable: true,
		});
	});

	describe('probeLocalStorage', () => {
		it('returns available when localStorage is functional', () => {
			const result = probeLocalStorage();
			expect(result.available).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it('returns unavailable when localStorage is null', () => {
			Object.defineProperty(global, 'localStorage', {
				value: null,
				writable: true,
				configurable: true,
			});

			const result = probeLocalStorage();
			expect(result.available).toBe(false);
			expect(result.reason).toBe('localStorage not available');
		});

		it('returns unavailable when localStorage is undefined', () => {
			Object.defineProperty(global, 'localStorage', {
				value: undefined,
				writable: true,
				configurable: true,
			});

			const result = probeLocalStorage();
			expect(result.available).toBe(false);
			expect(result.reason).toBe('localStorage not available');
		});

		it('returns unavailable when setItem throws SecurityError', () => {
			const mockStorage = {
				getItem: jest.fn(),
				setItem: jest.fn(() => {
					throw new DOMException('SecurityError', 'SecurityError');
				}),
				removeItem: jest.fn(),
				clear: jest.fn(),
				key: jest.fn(),
				length: 0,
			};

			Object.defineProperty(global, 'localStorage', {
				value: mockStorage,
				writable: true,
				configurable: true,
			});

			const result = probeLocalStorage();
			expect(result.available).toBe(false);
			expect(result.reason).toContain('Security');
		});

		it('returns unavailable when setItem throws QuotaExceededError', () => {
			const mockStorage = {
				getItem: jest.fn(),
				setItem: jest.fn(() => {
					throw new DOMException('QuotaExceededError', 'QuotaExceededError');
				}),
				removeItem: jest.fn(),
				clear: jest.fn(),
				key: jest.fn(),
				length: 0,
			};

			Object.defineProperty(global, 'localStorage', {
				value: mockStorage,
				writable: true,
				configurable: true,
			});

			const result = probeLocalStorage();
			expect(result.available).toBe(false);
			expect(result.reason).toContain('Quota exceeded');
		});
	});

	describe('probeSessionStorage', () => {
		it('returns available when sessionStorage is functional', () => {
			const result = probeSessionStorage();
			expect(result.available).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it('returns unavailable when sessionStorage is null', () => {
			Object.defineProperty(global, 'sessionStorage', {
				value: null,
				writable: true,
				configurable: true,
			});

			const result = probeSessionStorage();
			expect(result.available).toBe(false);
			expect(result.reason).toBe('sessionStorage not available');
		});

		it('returns unavailable when setItem throws error', () => {
			const mockStorage = {
				getItem: jest.fn(),
				setItem: jest.fn(() => {
					throw new Error('Storage error');
				}),
				removeItem: jest.fn(),
				clear: jest.fn(),
				key: jest.fn(),
				length: 0,
			};

			Object.defineProperty(global, 'sessionStorage', {
				value: mockStorage,
				writable: true,
				configurable: true,
			});

			const result = probeSessionStorage();
			expect(result.available).toBe(false);
			expect(result.reason).toContain('error');
		});
	});

	describe('StorageAdapter', () => {
		describe('getItem', () => {
			it('returns value when storage is available', () => {
				global.localStorage.setItem('test-key', 'test-value');
				const adapter = createStorageAdapter(probeLocalStorage());
				expect(adapter.getItem('test-key')).toBe('test-value');
			});

			it('returns null when storage is unavailable', () => {
				const probeResult: StorageProbeResult = {
					available: false,
					reason: 'localStorage not available',
				};
				const adapter = createStorageAdapter(probeResult);
				expect(adapter.getItem('test-key')).toBeNull();
			});

			it('returns null when getItem throws error', () => {
				const mockStorage = {
					getItem: jest.fn(() => {
						throw new Error('getItem error');
					}),
					setItem: jest.fn(),
					removeItem: jest.fn(),
					clear: jest.fn(),
					key: jest.fn(),
					length: 0,
				};

				Object.defineProperty(global, 'localStorage', {
					value: mockStorage,
					writable: true,
					configurable: true,
				});

				const adapter = createStorageAdapter({available: true});
				expect(adapter.getItem('test-key')).toBeNull();
			});

			it('returns raw string for corrupt JSON without throwing', () => {
				global.localStorage.setItem('test-key', '{invalid json}');
				const adapter = createStorageAdapter(probeLocalStorage());
				expect(adapter.getItem('test-key')).toBe('{invalid json}');
			});
		});

		describe('setItem', () => {
			it('stores value when storage is available', () => {
				const adapter = createStorageAdapter(probeLocalStorage());
				const result = adapter.setItem('test-key', 'test-value');
				expect(result).toBe(true);
				expect(global.localStorage.getItem('test-key')).toBe('test-value');
			});

			it('returns false when storage is unavailable', () => {
				const probeResult: StorageProbeResult = {
					available: false,
					reason: 'localStorage not available',
				};
				const adapter = createStorageAdapter(probeResult);
				const result = adapter.setItem('test-key', 'test-value');
				expect(result).toBe(false);
			});

			it('returns false when setItem throws quota error', () => {
				const mockStorage = {
					getItem: jest.fn(),
					setItem: jest.fn(() => {
						throw new DOMException('QuotaExceededError', 'QuotaExceededError');
					}),
					removeItem: jest.fn(),
					clear: jest.fn(),
					key: jest.fn(),
					length: 0,
				};

				Object.defineProperty(global, 'localStorage', {
					value: mockStorage,
					writable: true,
					configurable: true,
				});

				const adapter = createStorageAdapter({available: true});
				const result = adapter.setItem('test-key', 'test-value');
				expect(result).toBe(false);
			});

			it('logs error when setItem fails', () => {
				const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
				const probeResult: StorageProbeResult = {
					available: false,
					reason: 'localStorage not available',
				};
				const adapter = createStorageAdapter(probeResult);
				adapter.setItem('test-key', 'test-value');
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining('[Storage]'),
					expect.anything()
				);
				consoleSpy.mockRestore();
			});
		});

		describe('removeItem', () => {
			it('removes item when storage is available', () => {
				global.localStorage.setItem('test-key', 'test-value');
				const adapter = createStorageAdapter(probeLocalStorage());
				adapter.removeItem('test-key');
				expect(global.localStorage.getItem('test-key')).toBeNull();
			});

			it('does not throw when storage is unavailable', () => {
				const probeResult: StorageProbeResult = {
					available: false,
					reason: 'localStorage not available',
				};
				const adapter = createStorageAdapter(probeResult);
				expect(() => adapter.removeItem('test-key')).not.toThrow();
			});

			it('does not throw when removeItem fails', () => {
				const mockStorage = {
					getItem: jest.fn(),
					setItem: jest.fn(),
					removeItem: jest.fn(() => {
						throw new Error('removeItem error');
					}),
					clear: jest.fn(),
					key: jest.fn(),
					length: 0,
				};

				Object.defineProperty(global, 'localStorage', {
					value: mockStorage,
					writable: true,
					configurable: true,
				});

				const adapter = createStorageAdapter({available: true});
				expect(() => adapter.removeItem('test-key')).not.toThrow();
			});
		});

		describe('isAvailable', () => {
			it('returns true when storage probe succeeded', () => {
				const adapter = createStorageAdapter({available: true});
				expect(adapter.isAvailable()).toBe(true);
			});

			it('returns false when storage probe failed', () => {
				const adapter = createStorageAdapter({
					available: false,
					reason: 'localStorage not available',
				});
				expect(adapter.isAvailable()).toBe(false);
			});
		});

		describe('getUnavailableReason', () => {
			it('returns undefined when storage is available', () => {
				const adapter = createStorageAdapter({available: true});
				expect(adapter.getUnavailableReason()).toBeUndefined();
			});

			it('returns reason when storage is unavailable', () => {
				const adapter = createStorageAdapter({
					available: false,
					reason: 'Security restrictions',
				});
				expect(adapter.getUnavailableReason()).toBe('Security restrictions');
			});
		});

		describe('getProbeResult', () => {
			it('returns probe result', () => {
				const probeResult: StorageProbeResult = {
					available: true,
				};
				const adapter = createStorageAdapter(probeResult);
				expect(adapter.getProbeResult()).toEqual(probeResult);
			});
		});
	});
});
