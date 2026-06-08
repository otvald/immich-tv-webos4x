import {error} from '@enact/webos/pmloglib';

export interface ErrorLogEntry {
	timestamp: string;
	message: string;
	type?: 'error' | 'unhandledrejection';
	url?: string;
	line?: number;
	column?: number;
	stack?: string | null;
}

const MAX_ERROR_LOG_ENTRIES = 25;
const ERROR_LOG_STORAGE_KEY = 'immich-tv-error-log';
const ERROR_OVERLAY_ID = 'immich-tv-boot-error';
const ERROR_OVERLAY_DISMISS_KEYS = new Set(['Back', 'Escape', 'Yellow']);
const ERROR_OVERLAY_DISMISS_KEY_CODES = new Set([27, 405, 461]);

function canUseLocalStorage(): boolean {
	try {
		return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
	} catch {
		return false;
	}
}

function parseErrorLogEntry(value: unknown): ErrorLogEntry | null {
	if (!value || typeof value !== 'object') return null;

	const candidate = value as Partial<Record<keyof ErrorLogEntry, unknown>>;
	if (typeof candidate.timestamp !== 'string' || typeof candidate.message !== 'string') return null;

	return {
		timestamp: candidate.timestamp,
		message: candidate.message,
		type: candidate.type === 'error' || candidate.type === 'unhandledrejection' ? candidate.type : undefined,
		url: typeof candidate.url === 'string' ? candidate.url : undefined,
		line: typeof candidate.line === 'number' ? candidate.line : undefined,
		column: typeof candidate.column === 'number' ? candidate.column : undefined,
		stack: typeof candidate.stack === 'string' ? candidate.stack : null,
	};
}

function readStoredErrorLogEntries(): ErrorLogEntry[] {
	if (!canUseLocalStorage()) return [];

	try {
		const raw = window.localStorage.getItem(ERROR_LOG_STORAGE_KEY);
		if (!raw) return [];

		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		return parsed
			.map(parseErrorLogEntry)
			.filter((entry): entry is ErrorLogEntry => Boolean(entry))
			.slice(-MAX_ERROR_LOG_ENTRIES);
	} catch {
		return [];
	}
}

function writeStoredErrorLogEntries(entries: ErrorLogEntry[]): void {
	if (!canUseLocalStorage()) return;

	try {
		window.localStorage.setItem(ERROR_LOG_STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ERROR_LOG_ENTRIES)));
	} catch {
		// Keep boot diagnostics alive even if localStorage quota/access fails.
	}
}

const errorLog: ErrorLogEntry[] = readStoredErrorLogEntries();

export function recordErrorLogEntry(entry: ErrorLogEntry): void {
	errorLog.push(entry);

	if (errorLog.length > MAX_ERROR_LOG_ENTRIES) {
		errorLog.splice(0, errorLog.length - MAX_ERROR_LOG_ENTRIES);
	}

	writeStoredErrorLogEntries(errorLog);
}

export function getErrorLogEntries(): ErrorLogEntry[] {
	return errorLog.slice();
}

export function clearErrorLogEntries(): void {
	errorLog.splice(0, errorLog.length);
	hideBootErrorOverlay();

	if (!canUseLocalStorage()) return;

	try {
		window.localStorage.removeItem(ERROR_LOG_STORAGE_KEY);
	} catch {
		// Diagnostics clearing should never crash the app.
	}
}

export function hideBootErrorOverlay(): void {
	if (typeof document === 'undefined') return;
	const overlay = document.getElementById(ERROR_OVERLAY_ID);
	if (overlay) {
		overlay.style.display = 'none';
	}
}

function truncate(value: string | null | undefined, maxLength: number): string | null {
	if (!value) return null;
	return value.length > maxLength ? value.substring(0, maxLength) : value;
}

function reasonToMessage(reason: unknown): string {
	if (reason instanceof Error) return reason.message;
	if (typeof reason === 'string') return reason;

	try {
		return JSON.stringify(reason);
	} catch {
		return String(reason);
	}
}

function reasonToStack(reason: unknown): string | null {
	return reason instanceof Error ? truncate(reason.stack, 512) : null;
}

function formatErrorLogEntry(entry: ErrorLogEntry): string {
	return [
		`[${entry.timestamp}] ${entry.type ?? 'error'}`,
		entry.message,
		entry.url ? `URL: ${entry.url}` : '',
		entry.line !== undefined ? `Line: ${entry.line}:${entry.column ?? 0}` : '',
		entry.stack ? `Stack: ${entry.stack}` : '',
	]
		.filter(Boolean)
		.join('\n');
}

function getDismissInstructions(): string {
	return [
		'Press BACK or YELLOW to hide this overlay and try navigating to Diagnostics.',
		'Stored errors are also persisted in localStorage key: immich-tv-error-log',
	].join('\n');
}

function writePmLog(tag: string, entry: ErrorLogEntry): void {
	try {
		error(tag, entry, '');
	} catch {
		// Keep boot diagnostics alive even if pmloglib is unavailable during early startup.
	}
}

function showBootErrorOverlay(entry: ErrorLogEntry): void {
	if (typeof document === 'undefined') return;

	const renderOverlay = () => {
		if (!document.body) return;

		const existing = document.getElementById(ERROR_OVERLAY_ID);
		const overlay = existing ?? document.createElement('pre');
		const recentErrors = getErrorLogEntries().slice(-5);

		overlay.id = ERROR_OVERLAY_ID;
		overlay.style.position = 'fixed';
		overlay.style.inset = '0';
		overlay.style.zIndex = '2147483647';
		overlay.style.margin = '0';
		overlay.style.padding = '32px';
		overlay.style.boxSizing = 'border-box';
		overlay.style.background = '#111';
		overlay.style.color = '#fff';
		overlay.style.font = '24px monospace';
		overlay.style.whiteSpace = 'pre-wrap';
		overlay.style.overflow = 'auto';
		overlay.tabIndex = 0;
		overlay.textContent = [
			'IMMICH TV ERROR',
			`Code: IMMICH_TV_BOOT_ERROR`,
			`Type: ${entry.type ?? 'error'}`,
			`Message: ${entry.message}`,
			entry.url ? `URL: ${entry.url}` : '',
			entry.line !== undefined ? `Line: ${entry.line}:${entry.column ?? 0}` : '',
			entry.stack ? `Stack: ${entry.stack}` : '',
			'',
			getDismissInstructions(),
			recentErrors.length > 0 ? '\nRecent stored errors:' : '',
			recentErrors.map(formatErrorLogEntry).join('\n\n---\n\n'),
		]
			.filter(Boolean)
			.join('\n');

		if (!existing) {
			document.body.appendChild(overlay);

			const dismissOverlay = () => {
				overlay.style.display = 'none';
			};

			overlay.addEventListener('click', dismissOverlay);
			window.addEventListener('keydown', (event) => {
				if (ERROR_OVERLAY_DISMISS_KEYS.has(event.key) || ERROR_OVERLAY_DISMISS_KEY_CODES.has(event.keyCode)) {
					dismissOverlay();
				}
			});
			overlay.focus();
		}
	};

	if (document.body) {
		renderOverlay();
	} else {
		document.addEventListener('DOMContentLoaded', renderOverlay, {once: true});
	}
}

function recordAndDisplayError(entry: ErrorLogEntry): void {
	recordErrorLogEntry(entry);
	writePmLog(entry.type === 'unhandledrejection' ? 'app.unhandledrejection' : 'app.onerror', entry);
	showBootErrorOverlay(entry);
}

const handleError = (ev: ErrorEvent) => {
	recordAndDisplayError({
		timestamp: new Date().toISOString(),
		message: ev.message,
		type: 'error',
		url: ev.filename,
		line: ev.lineno,
		column: ev.colno,
		stack: ev.error instanceof Error ? truncate(ev.error.stack, 512) : null,
	});

	// Calling preventDefault() will avoid logging the error to the console
	// ev.preventDefault();
};

const handleUnhandledRejection = (ev: PromiseRejectionEvent) => {
	recordAndDisplayError({
		timestamp: new Date().toISOString(),
		message: reasonToMessage(ev.reason),
		type: 'unhandledrejection',
		stack: reasonToStack(ev.reason),
	});
};

if (typeof window !== 'undefined') {
	window.addEventListener('error', handleError);
	window.addEventListener('unhandledrejection', handleUnhandledRejection);
}
