import {
	probeLocalStorage,
	probeSessionStorage,
	type StorageProbeResult,
} from '../compat/storage-adapter';
import {
	probeFetch,
	probeBlob,
	classifyFetchError,
	type FetchProbeResult,
	type BlobProbeResult,
} from '../compat/network-adapter';
import {getErrorLogEntries, type ErrorLogEntry} from '../App/attachErrorHandler';
import type {WebOSTarget} from './capabilities';
import {getLatestApiError} from '../api/errorStore';
import type {ApiErrorDetails} from '../api/client';

import appInfo from '../../webos-meta/appinfo.json';

let bootStartTime = performance.now();

export function markBootStart(): void {
	bootStartTime = performance.now();
}

export function captureBootTiming(): BootTiming {
	const diagRunTime = performance.now() - bootStartTime;
	return {
		startTime: bootStartTime,
		diagRunTime,
		totalBootTime: performance.now(),
	};
}

export interface BootTiming {
	startTime: number;
	diagRunTime?: number;
	totalBootTime?: number;
}

export function probeMemoryInfo(): MemoryInfo {
	const perf = performance as any;

	if (perf.memory) {
		return {
			available: true,
			jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
			totalJSHeapSize: perf.memory.totalJSHeapSize,
			usedJSHeapSize: perf.memory.usedJSHeapSize,
			notes: 'Performance.memory API available',
		};
	}

	return {
		available: false,
		notes: 'Performance.memory API not available on this platform',
	};
}

export interface MemoryInfo {
	available: boolean;
	jsHeapSizeLimit?: number;
	totalJSHeapSize?: number;
	usedJSHeapSize?: number;
	notes: string;
}

export interface RuntimeDiagnostics {
	storage: {
		localStorage: StorageProbeResult;
		sessionStorage: StorageProbeResult;
	};
	network: {
		fetch: FetchProbeResult;
		blob: BlobProbeResult;
	};
	boot: BootTiming;
	memory: MemoryInfo;
	timestamp: string;
}

export interface KeyEventSample {
	timestamp: string;
	key: string;
	code: string;
	keyCode: number;
	targetTagName?: string;
}

export interface DeviceInfoDiagnostics {
	platform: string;
	vendor: string;
	language: string;
	userLanguage?: string;
	hardwareConcurrency?: number;
	deviceMemory?: number;
	screen: {
		width: number;
		height: number;
		pixelRatio: number;
	};
}

export interface WebOSApiDiagnostics {
	PalmSystem: boolean;
	webOSSystem: boolean;
	webOS: boolean;
	webkitMessageHandlers: boolean;
	serviceBridge: boolean;
	serviceRequest: boolean;
	deviceInfo: {
		appId?: string;
		version?: string;
		platformVersion?: string;
		modelName?: string;
	};
	rawValues: {
		PalmSystem?: string;
		webOSSystem?: string;
	};
}

export interface JsApiDiagnostics {
	localStorage: StorageProbeResult;
	sessionStorage: StorageProbeResult;
	fetch: FetchProbeResult;
	Blob: BlobProbeResult;
	Promise: boolean;
	PromiseFinally: boolean;
	URL: boolean;
	TextDecoder: boolean;
	AbortController: boolean;
}

export interface CssMediaImageDiagnostics {
	css: {
		supports: boolean;
		grid: boolean;
		flexGap: boolean;
		objectFit: boolean;
	};
	media: {
		matchMedia: boolean;
		prefersReducedMotion: boolean;
		colorGamutP3: boolean;
		videoCanPlay: {
			h264: string;
			webm: string;
			hls: string;
		};
	};
	images: {
		canvas: boolean;
		png: boolean;
		jpeg: boolean;
		webp: boolean;
		avif: boolean;
	};
}

export interface ErrorLogSummary {
	count: number;
	lastError?: ErrorLogEntry;
	recentErrors: ErrorLogEntry[];
}

export interface FetchTlsProbeSummary {
	attempted: boolean;
	status: 'ok' | 'failed' | 'skipped';
	url?: string;
	protocol?: string;
	reason?: string;
	isTLS?: boolean;
	isCORS?: boolean;
	statusCode?: number;
}

export interface DiagnosticsSnapshot {
	timestamp: string;
	target: WebOSTarget;
	userAgent: string;
	appId: string;
	deviceInfo: DeviceInfoDiagnostics;
	webOSApis: WebOSApiDiagnostics;
	jsApis: JsApiDiagnostics;
	cssMediaImageProbes: CssMediaImageDiagnostics;
	runtime: RuntimeDiagnostics;
	bootTiming: BootTiming;
	errorLogSummary: ErrorLogSummary;
	fetchTlsProbe: FetchTlsProbeSummary;
	keyEventSamples: KeyEventSample[];
	latestApiError: ApiErrorDetails | null;
}

export function runRuntimeDiagnostics(): RuntimeDiagnostics {
	const storageLocal = probeLocalStorage();
	const storageSession = probeSessionStorage();
	const fetchResult = probeFetch();
	const blobResult = probeBlob();

	return {
		storage: {
			localStorage: storageLocal,
			sessionStorage: storageSession,
		},
		network: {
			fetch: fetchResult,
			blob: blobResult,
		},
		boot: captureBootTiming(),
		memory: probeMemoryInfo(),
		timestamp: new Date().toISOString(),
	};
}

function supportsCssFeature(property: string, value: string): boolean {
	return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' ? CSS.supports(property, value) : false;
}

function probeImageFormat(type: string): boolean {
	const canvas = document.createElement('canvas');
	if (typeof canvas.toDataURL !== 'function') {
		return false;
	}

	try {
		return canvas.toDataURL(type).startsWith(`data:${type}`);
	} catch {
		return false;
	}
}

function getPalmSystem(): Record<string, unknown> | undefined {
	const value = globalThis as typeof globalThis & {PalmSystem?: Record<string, unknown>};
	return value.PalmSystem;
}

function getWebOSSystem(): Record<string, unknown> | undefined {
	const value = globalThis as typeof globalThis & {webOSSystem?: Record<string, unknown>};
	return value.webOSSystem;
}

export function summarizeErrorLog(entries: ErrorLogEntry[] = getErrorLogEntries()): ErrorLogSummary {
	return {
		count: entries.length,
		lastError: entries.length > 0 ? entries[entries.length - 1] : undefined,
		recentErrors: entries.slice(-5),
	};
}

export function probeDeviceInfo(): DeviceInfoDiagnostics {
	const nav = navigator as Navigator & {userLanguage?: string; deviceMemory?: number};

	return {
		platform: nav.platform ?? 'unknown',
		vendor: nav.vendor ?? 'unknown',
		language: nav.language ?? 'unknown',
		userLanguage: nav.userLanguage,
		hardwareConcurrency: nav.hardwareConcurrency,
		deviceMemory: nav.deviceMemory,
		screen: {
			width: window.screen.width,
			height: window.screen.height,
			pixelRatio: window.devicePixelRatio || 1,
		},
	};
}

export function probeWebOSApis(): WebOSApiDiagnostics {
	const palmSystem = getPalmSystem();
	const webOSSystem = getWebOSSystem();
	const value = globalThis as typeof globalThis & {
		webOS?: unknown;
		webkit?: {messageHandlers?: unknown};
		ServiceBridge?: unknown;
		serviceRequest?: unknown;
	};

	return {
		PalmSystem: Boolean(palmSystem),
		webOSSystem: Boolean(webOSSystem),
		webOS: typeof value.webOS !== 'undefined',
		webkitMessageHandlers: Boolean(value.webkit?.messageHandlers),
		serviceBridge: typeof value.ServiceBridge !== 'undefined',
		serviceRequest: typeof value.serviceRequest !== 'undefined',
		deviceInfo: {
			appId: typeof palmSystem?.appid === 'string' ? palmSystem.appid : undefined,
			version: typeof palmSystem?.version === 'string' ? palmSystem.version : undefined,
			platformVersion: typeof webOSSystem?.platformVersion === 'string' ? webOSSystem.platformVersion : undefined,
			modelName: typeof webOSSystem?.modelName === 'string' ? webOSSystem.modelName : undefined,
		},
		rawValues: {
			PalmSystem: palmSystem ? Object.keys(palmSystem).join(',') : undefined,
			webOSSystem: webOSSystem ? Object.keys(webOSSystem).join(',') : undefined,
		},
	};
}

export function probeJsApis(runtime: RuntimeDiagnostics = runRuntimeDiagnostics()): JsApiDiagnostics {
	return {
		localStorage: runtime.storage.localStorage,
		sessionStorage: runtime.storage.sessionStorage,
		fetch: runtime.network.fetch,
		Blob: runtime.network.blob,
		Promise: typeof Promise !== 'undefined',
		PromiseFinally: typeof Promise !== 'undefined' && typeof Promise.prototype.finally === 'function',
		URL: typeof URL !== 'undefined',
		TextDecoder: typeof TextDecoder !== 'undefined',
		AbortController: typeof AbortController !== 'undefined',
	};
}

export function probeCssMediaImageSupport(): CssMediaImageDiagnostics {
	const matchMediaAvailable = typeof window.matchMedia === 'function';
	const video = document.createElement('video');
	const canvas = document.createElement('canvas');

	return {
		css: {
			supports: typeof CSS !== 'undefined' && typeof CSS.supports === 'function',
			grid: supportsCssFeature('display', 'grid'),
			flexGap: supportsCssFeature('gap', '1px'),
			objectFit: supportsCssFeature('object-fit', 'cover'),
		},
		media: {
			matchMedia: matchMediaAvailable,
			prefersReducedMotion: matchMediaAvailable ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
			colorGamutP3: matchMediaAvailable ? window.matchMedia('(color-gamut: p3)').matches : false,
			videoCanPlay: {
				h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
				webm: video.canPlayType('video/webm; codecs="vp8, vorbis"'),
				hls: video.canPlayType('application/vnd.apple.mpegURL'),
			},
		},
		images: {
			canvas: typeof canvas.toDataURL === 'function',
			png: probeImageFormat('image/png'),
			jpeg: probeImageFormat('image/jpeg'),
			webp: probeImageFormat('image/webp'),
			avif: probeImageFormat('image/avif'),
		},
	};
}

export async function runFetchTlsProbe(url = window.location.href): Promise<FetchTlsProbeSummary> {
	const fetchResult = probeFetch();
	const protocol = window.location.protocol;

	if (!fetchResult.available) {
		return {
			attempted: false,
			status: 'skipped',
			protocol,
			reason: fetchResult.reason,
		};
	}

	if (protocol !== 'https:' && protocol !== 'http:') {
		return {
			attempted: false,
			status: 'skipped',
			protocol,
			reason: 'TLS probe skipped because origin is not http(s)',
		};
	}

	try {
		const response = await fetch(url, {method: 'GET'});
		return {
			attempted: true,
			status: 'ok',
			url,
			protocol,
			statusCode: response.status,
			isTLS: protocol === 'https:',
		};
	} catch (error) {
		const classified = classifyFetchError(error instanceof Error ? error : new Error('Unknown fetch failure'));
		return {
			attempted: true,
			status: 'failed',
			url,
			protocol,
			reason: classified.description,
			isTLS: classified.isTLS,
			isCORS: classified.isCORS,
			statusCode: classified.statusCode,
		};
	}
}

export async function createDiagnosticsSnapshot(options: {
	target: WebOSTarget;
	keyEventSamples?: KeyEventSample[];
	fetchTlsUrl?: string;
}): Promise<DiagnosticsSnapshot> {
	const runtime = runRuntimeDiagnostics();

	return {
		timestamp: runtime.timestamp,
		target: options.target,
		userAgent: navigator.userAgent,
		appId: appInfo.id,
		deviceInfo: probeDeviceInfo(),
		webOSApis: probeWebOSApis(),
		jsApis: probeJsApis(runtime),
		cssMediaImageProbes: probeCssMediaImageSupport(),
		runtime,
		bootTiming: runtime.boot,
		errorLogSummary: summarizeErrorLog(),
		fetchTlsProbe: await runFetchTlsProbe(options.fetchTlsUrl),
		keyEventSamples: options.keyEventSamples ?? [],
		latestApiError: getLatestApiError(),
	};
}

export function formatDiagnosticsReport(diagnostics: RuntimeDiagnostics): string {
	const lines: string[] = [];

	lines.push('=== Runtime Diagnostics Report ===');
	lines.push(`Generated: ${diagnostics.timestamp}`);
	lines.push('');

	lines.push('Boot Timing:');
	lines.push(`  Start Time: ${diagnostics.boot.startTime.toFixed(2)}ms`);
	if (diagnostics.boot.diagRunTime !== undefined) {
		lines.push(`  Diag Run Time: ${diagnostics.boot.diagRunTime.toFixed(2)}ms`);
	}
	if (diagnostics.boot.totalBootTime !== undefined) {
		lines.push(`  Total Boot Time: ${diagnostics.boot.totalBootTime.toFixed(2)}ms`);
	}
	lines.push('');

	lines.push('Memory:');
	lines.push(`  Available: ${diagnostics.memory.available ? '✓ Yes' : '✗ No'}`);
	if (diagnostics.memory.available && diagnostics.memory.usedJSHeapSize !== undefined) {
		const usedMB = (diagnostics.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
		const totalMB = diagnostics.memory.totalJSHeapSize !== undefined
			? (diagnostics.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2)
			: 'unknown';
		const limitMB = diagnostics.memory.jsHeapSizeLimit !== undefined
			? (diagnostics.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)
			: 'unknown';
		lines.push(`  Used: ${usedMB} MB / ${totalMB} MB (Limit: ${limitMB} MB)`);
	}
	lines.push(`  Notes: ${diagnostics.memory.notes}`);
	lines.push('');

	lines.push('Storage:');
	lines.push(`  localStorage: ${diagnostics.storage.localStorage.available ? '✓ Available' : '✗ Unavailable'}`);
	if (diagnostics.storage.localStorage.reason) {
		lines.push(`    Reason: ${diagnostics.storage.localStorage.reason}`);
	}
	lines.push(`  sessionStorage: ${diagnostics.storage.sessionStorage.available ? '✓ Available' : '✗ Unavailable'}`);
	if (diagnostics.storage.sessionStorage.reason) {
		lines.push(`    Reason: ${diagnostics.storage.sessionStorage.reason}`);
	}
	lines.push('');

	lines.push('Network:');
	lines.push(`  fetch: ${diagnostics.network.fetch.available ? '✓ Available' : '✗ Unavailable'}`);
	if (diagnostics.network.fetch.reason) {
		lines.push(`    Reason: ${diagnostics.network.fetch.reason}`);
	}
	lines.push(`  Blob: ${diagnostics.network.blob.available ? '✓ Available' : '✗ Unavailable'}`);
	if (diagnostics.network.blob.reason) {
		lines.push(`    Reason: ${diagnostics.network.blob.reason}`);
	}

	return lines.join('\n');
}

export function exportDiagnosticsAsJSON(diagnostics: RuntimeDiagnostics | DiagnosticsSnapshot): string {
	return JSON.stringify(diagnostics, null, 2);
}

export function logDiagnostics(diagnostics?: RuntimeDiagnostics): void {
	const diag = diagnostics ?? runRuntimeDiagnostics();
	console.log(formatDiagnosticsReport(diag));
}
