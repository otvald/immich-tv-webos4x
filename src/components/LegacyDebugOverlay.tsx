import React, {useEffect, useState} from 'react';

import {getLatestApiError} from '../api/errorStore';
import {areDebugOverlaysEnabled, subscribeDebugOverlayChanges} from '../debug/debugSettings';
import {usePlatformFacade} from '../platform';
import appInfo from '../../webos-meta/appinfo.json';

export interface DebugLine {
	label: string;
	value: string | number | boolean | null | undefined;
}

interface LegacyDebugOverlayProps {
	title: string;
	lines: DebugLine[];
	slot?: number;
}

function formatValue(value: DebugLine['value']): string {
	if (value === undefined) return 'undefined';
	if (value === null) return 'null';
	return String(value);
}

export const LegacyDebugOverlay: React.FC<LegacyDebugOverlayProps> = ({title, lines, slot = 0}) => {
	const platform = usePlatformFacade();
	const [latestApiError, setLatestApiError] = useState(getLatestApiError());
	const [debugEnabled, setDebugEnabled] = useState(areDebugOverlaysEnabled);
	const shouldShow = platform.target === 'legacy' || appInfo.id.includes('legacy');

	useEffect(() => subscribeDebugOverlayChanges(() => {
		setDebugEnabled(areDebugOverlaysEnabled());
	}), []);

	useEffect(() => {
		if (!shouldShow) return undefined;

		const interval = window.setInterval(() => {
			setLatestApiError(getLatestApiError());
		}, 1000);

		return () => window.clearInterval(interval);
	}, [shouldShow]);

	if (!shouldShow || !debugEnabled) return null;

	const errorLines: DebugLine[] = latestApiError
		? [
			{label: 'api.code', value: latestApiError.code},
			{label: 'api.status', value: latestApiError.status ?? 'none'},
			{label: 'api.endpoint', value: latestApiError.endpoint ?? 'none'},
		]
		: [{label: 'api.latest', value: 'none'}];

	return (
		<div style={createOverlayStyle(slot)} aria-label={`${title} overlay`}>
			<div style={titleStyle}>{title}</div>
			<div>target: {platform.target}</div>
			<div>appId: {appInfo.id}</div>
			{lines.concat(errorLines).map((line) => (
				<div key={`${line.label}:${formatValue(line.value)}`}>
					{line.label}: {formatValue(line.value)}
				</div>
			))}
		</div>
	);
};

function createOverlayStyle(slot: number): React.CSSProperties {
	return {
		position: 'fixed',
		left: 12,
		top: 12 + slot * 210,
		zIndex: 2147483646 - slot,
		width: 760,
		maxHeight: 196,
		overflow: 'hidden',
		padding: '10px 14px',
		background: 'rgba(0, 0, 0, 0.82)',
		color: '#7dff7d',
		fontFamily: 'monospace',
		fontSize: 16,
		lineHeight: 1.28,
		whiteSpace: 'pre-wrap',
		pointerEvents: 'none',
		border: '2px solid rgba(125, 255, 125, 0.7)',
	};
}

const titleStyle: React.CSSProperties = {
	fontWeight: 700,
	marginBottom: 4,
};

LegacyDebugOverlay.displayName = 'LegacyDebugOverlay';
