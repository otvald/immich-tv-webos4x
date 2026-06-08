import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {
	createDiagnosticsSnapshot,
	exportDiagnosticsAsJSON,
	type DiagnosticsSnapshot,
	type KeyEventSample,
} from '../../platform/diagnostics';
import {usePlatformFacade} from '../../platform';
import {areDebugOverlaysEnabled, setDebugOverlaysEnabled} from '../../debug/debugSettings';
import {clearErrorLogEntries, type ErrorLogEntry} from '../../App/attachErrorHandler';

import css from './DiagnosticsPanel.module.less';

const MAX_KEY_EVENT_SAMPLES = 10;

function formatErrorEntry(entry: ErrorLogEntry): string {
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

function formatCapabilityLabel(label: string): string {
	return label.replace(/([A-Z])/g, ' $1');
}

export const DiagnosticsPanel: React.FC = () => {
	const platform = usePlatformFacade();
	const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot | null>(null);
	const [exportJson, setExportJson] = useState('');
	const [copyStatus, setCopyStatus] = useState('');
	const [keyEventSamples, setKeyEventSamples] = useState<KeyEventSample[]>([]);
	const [debugOverlaysEnabled, setDebugOverlaysEnabledState] = useState(areDebugOverlaysEnabled);
	const exportTextareaRef = useRef<HTMLTextAreaElement | null>(null);

	const refreshDiagnostics = useCallback(async (samples: KeyEventSample[]) => {
		const nextSnapshot = await createDiagnosticsSnapshot({
			target: platform.target,
			keyEventSamples: samples,
		});
		setSnapshot(nextSnapshot);
		setExportJson(exportDiagnosticsAsJSON(nextSnapshot));
	}, [platform.target]);

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			const nextSnapshot = await createDiagnosticsSnapshot({
				target: platform.target,
				keyEventSamples,
			});

			if (cancelled) {
				return;
			}

			setSnapshot(nextSnapshot);
			setExportJson(exportDiagnosticsAsJSON(nextSnapshot));
		})();

		return () => {
			cancelled = true;
		};
	}, [keyEventSamples, platform.target]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			setKeyEventSamples((current) => {
				const next = current.concat({
					timestamp: new Date().toISOString(),
					key: event.key,
					code: event.code,
					keyCode: event.keyCode,
					targetTagName: event.target instanceof HTMLElement ? event.target.tagName : undefined,
				});

				return next.slice(-MAX_KEY_EVENT_SAMPLES);
			});
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	const handleCopy = useCallback(async () => {
		if (!exportJson) {
			setCopyStatus('Diagnostics JSON is still loading. Press Refresh or try Copy JSON again.');
			return;
		}

		const clipboard = navigator.clipboard;
		if (clipboard && typeof clipboard.writeText === 'function') {
			try {
				await clipboard.writeText(exportJson);
				setCopyStatus('Diagnostics JSON copied to clipboard. If you cannot paste it, use the selected text box below.');
				return;
			} catch {
				// webOS may expose navigator.clipboard but reject writeText() in packaged apps.
			}
		}

		exportTextareaRef.current?.focus();
		exportTextareaRef.current?.select();
		setCopyStatus('Clipboard unavailable on this TV. The JSON text box below is selected; use a photo/manual copy if TV copy still fails.');
	}, [exportJson]);

	const handleRefreshClick = useCallback(() => {
		void refreshDiagnostics(keyEventSamples);
	}, [keyEventSamples, refreshDiagnostics]);

	const handleCopyClick = useCallback(() => {
		void handleCopy();
	}, [handleCopy]);

	const handleDebugOverlayToggle = useCallback(() => {
		setDebugOverlaysEnabledState((current) => {
			const next = !current;
			setDebugOverlaysEnabled(next);
			return next;
		});
	}, []);

	const handleClearErrorLogClick = useCallback(() => {
		clearErrorLogEntries();
		void refreshDiagnostics(keyEventSamples);
		setCopyStatus('Stored error log cleared.');
	}, [keyEventSamples, refreshDiagnostics]);

	const capabilitySummary = useMemo(
		() => Object.entries(platform.capabilities).map(([name, gate]) => `${formatCapabilityLabel(name)}: ${gate.status}${gate.reason ? ` (${gate.reason})` : ''}`),
		[platform.capabilities]
	);

	const latestKeyEvent = snapshot && snapshot.keyEventSamples.length > 0
		? snapshot.keyEventSamples[snapshot.keyEventSamples.length - 1]
		: undefined;
	const recentErrors = snapshot?.errorLogSummary.recentErrors ?? [];
	const latestError = snapshot?.errorLogSummary.lastError;

	return (
		<section className={css.panel} aria-label="Diagnostics panel">
			<div className={css.header}>
				<div className={css.titleBlock}>
					<h1>Diagnostics</h1>
					<p>Export a copyable runtime snapshot for modern and legacy webOS profiles.</p>
				</div>
				<div className={css.actions}>
					<button type="button" className={css.button} onClick={handleClearErrorLogClick}>
						Clear Errors
					</button>
					<button type="button" className={css.button} onClick={handleRefreshClick}>
						Refresh
					</button>
					<button type="button" className={css.button} onClick={handleCopyClick}>
						Copy JSON
					</button>
				</div>
			</div>


			<div className={copyStatus ? css.statusCard : css.status} role="status" aria-live="polite">
				{copyStatus || 'Includes app ID, API probes, boot timing, error summary, and key samples.'}
			</div>

			<div className={css.card}>
				<h2>Legacy debug overlays</h2>
				<p>Show App/View/Timeline debug panels on top of the TV UI.</p>
				<button type="button" className={css.button} onClick={handleDebugOverlayToggle}>
					{debugOverlaysEnabled ? 'Disable debug overlays' : 'Enable debug overlays'}
				</button>
			</div>

			<div className={css.card}>
				<h2>Stored error log</h2>
				<p>Persisted in localStorage so errors survive a crash/relaunch and appear in the JSON export. The top Clear Errors button also hides the on-screen boot error overlay.</p>
				<ul className={css.list}>
					<li>Error count: {snapshot?.errorLogSummary.count ?? 0}</li>
					<li>Latest error: {latestError?.message ?? 'none'}</li>
				</ul>
				<button type="button" className={css.button} onClick={handleClearErrorLogClick}>
					Clear stored errors
				</button>
				{recentErrors.length > 0 ? (
					<pre className={css.errorLog} aria-label="Stored error log">
						{recentErrors.map(formatErrorEntry).join('\n\n---\n\n')}
					</pre>
				) : (
					<p className={css.emptyState}>No stored errors.</p>
				)}
			</div>

			<div className={css.grid}>
				<div className={css.card}>
					<h2>Summary</h2>
					<ul className={css.list}>
						<li>Target: {snapshot?.target ?? platform.target}</li>
						<li>App ID: {snapshot?.appId ?? 'Loading…'}</li>
						<li>User Agent: {snapshot?.userAgent ?? 'Loading…'}</li>
						<li>Boot timing captured: {snapshot ? 'yes' : 'pending'}</li>
					</ul>
				</div>
				<div className={css.card}>
					<h2>Capability gates</h2>
					<ul className={css.list}>
						{capabilitySummary.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
				</div>
				<div className={css.card}>
					<h2>webOS + JS probes</h2>
					<ul className={css.list}>
						<li>PalmSystem: {snapshot?.webOSApis.PalmSystem ? 'available' : 'missing'}</li>
						<li>webOSSystem: {snapshot?.webOSApis.webOSSystem ? 'available' : 'missing'}</li>
						<li>localStorage: {snapshot?.jsApis.localStorage.available ? 'available' : snapshot?.jsApis.localStorage.reason ?? 'missing'}</li>
						<li>fetch/TLS probe: {snapshot?.fetchTlsProbe.status ?? 'pending'}</li>
					</ul>
				</div>
				<div className={css.card}>
					<h2>Error + key samples</h2>
					<ul className={css.list}>
						<li>Error count: {snapshot?.errorLogSummary.count ?? 0}</li>
						<li>Stored key events: {snapshot?.keyEventSamples.length ?? 0}</li>
						<li>Latest key: {latestKeyEvent?.key ?? 'none yet'}</li>
					</ul>
				</div>
			</div>

			<label>
				<span style={{display: 'block', marginBottom: '0.5rem'}}>Copyable diagnostics JSON</span>
				<textarea ref={exportTextareaRef} className={css.export} value={exportJson} readOnly aria-label="Diagnostics JSON export" />
			</label>
		</section>
	);
};

export default DiagnosticsPanel;
