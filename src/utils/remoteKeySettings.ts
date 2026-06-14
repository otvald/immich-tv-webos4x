export type RemoteKeyAction = 'back' | 'previous' | 'next' | 'randomPlay' | 'randomStop' | 'toggleDebug' | 'exitApp';

export interface RemoteKeyActionDefinition {
	action: RemoteKeyAction;
	label: string;
	description: string;
	defaultKeyCode: number;
	defaultKeyLabel: string;
	defaultAliases?: string[];
	defaultCodes?: string[];
}

const REMOTE_KEY_SETTINGS_KEY = 'immich-tv-remote-key-bindings';
const REMOTE_KEY_SETTINGS_EVENT = 'immich-tv-remote-key-bindings-changed';
const MIN_KEY_CODE = 1;
const MAX_KEY_CODE = 9999;

const ACTIONS: RemoteKeyActionDefinition[] = [
	{action: 'back', label: 'Back / close current panel', description: 'Closes media viewer, account overlays, album detail, or other nested screens. Built-in webOS Back variants still work as a safety fallback.', defaultKeyCode: 461, defaultKeyLabel: 'Back (461)', defaultAliases: ['Back', 'BrowserBack'], defaultCodes: ['BrowserBack']},
	{action: 'previous', label: 'Previous photo', description: 'Moves left in the media viewer when viewing photos.', defaultKeyCode: 37, defaultKeyLabel: 'Arrow Left (37)', defaultAliases: ['ArrowLeft'], defaultCodes: ['ArrowLeft']},
	{action: 'next', label: 'Next photo', description: 'Moves right in the media viewer when viewing photos.', defaultKeyCode: 39, defaultKeyLabel: 'Arrow Right (39)', defaultAliases: ['ArrowRight'], defaultCodes: ['ArrowRight']},
	{action: 'randomPlay', label: 'Start random slideshow', description: 'Starts random play in the current Photos, Albums, or Search context.', defaultKeyCode: 415, defaultKeyLabel: 'PLAY (415)', defaultAliases: ['Play', 'MediaPlay'], defaultCodes: ['MediaPlay']},
	{action: 'randomStop', label: 'Stop random slideshow', description: 'Stops the running random slideshow.', defaultKeyCode: 19, defaultKeyLabel: 'STOP (19)', defaultAliases: ['Stop', 'MediaStop'], defaultCodes: ['MediaStop']},
	{action: 'toggleDebug', label: 'Toggle diagnostics overlays', description: 'Shows or hides the green debug overlays used for legacy TV troubleshooting.', defaultKeyCode: 406, defaultKeyLabel: 'Blue (406)', defaultAliases: ['Blue'], defaultCodes: ['ColorF3Blue']},
	{action: 'exitApp', label: 'Exit app', description: 'Attempts window.close() outside editable text fields.', defaultKeyCode: 8, defaultKeyLabel: 'Backspace (8)', defaultAliases: ['Backspace']},
];

type RemoteKeyBindings = Partial<Record<RemoteKeyAction, number>>;

function isRemoteKeyAction(value: string): value is RemoteKeyAction {
	return ACTIONS.some((definition) => definition.action === value);
}

function clampKeyCode(keyCode: number, fallback: number): number {
	if (!Number.isFinite(keyCode)) return fallback;
	return Math.min(MAX_KEY_CODE, Math.max(MIN_KEY_CODE, Math.round(keyCode)));
}

function readStoredBindings(): RemoteKeyBindings {
	try {
		const raw = window.localStorage.getItem(REMOTE_KEY_SETTINGS_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const bindings: RemoteKeyBindings = {};

		Object.entries(parsed).forEach(([action, value]) => {
			if (!isRemoteKeyAction(action) || typeof value !== 'number') return;
			bindings[action] = clampKeyCode(value, getRemoteKeyActionDefinition(action).defaultKeyCode);
		});

		return bindings;
	} catch {
		return {};
	}
}

function writeStoredBindings(bindings: RemoteKeyBindings): void {
	try {
		window.localStorage.setItem(REMOTE_KEY_SETTINGS_KEY, JSON.stringify(bindings));
	} catch {
		// Keep the session usable when localStorage is unavailable.
	}

	window.dispatchEvent(new CustomEvent(REMOTE_KEY_SETTINGS_EVENT, {detail: {bindings}}));
}

export function getRemoteKeyActionDefinitions(): RemoteKeyActionDefinition[] {
	return ACTIONS.slice();
}

export function getRemoteKeyActionDefinition(action: RemoteKeyAction): RemoteKeyActionDefinition {
	const definition = ACTIONS.find((item) => item.action === action);
	if (!definition) throw new Error(`Unknown remote key action: ${action}`);
	return definition;
}

export function getRemoteKeyBinding(action: RemoteKeyAction): number {
	const definition = getRemoteKeyActionDefinition(action);
	return readStoredBindings()[action] ?? definition.defaultKeyCode;
}

export function getRemoteKeyBindings(): Record<RemoteKeyAction, number> {
	return ACTIONS.reduce<Record<RemoteKeyAction, number>>((bindings, definition) => {
		bindings[definition.action] = getRemoteKeyBinding(definition.action);
		return bindings;
	}, {} as Record<RemoteKeyAction, number>);
}

export function setRemoteKeyBinding(action: RemoteKeyAction, keyCode: number): number {
	const definition = getRemoteKeyActionDefinition(action);
	const next = clampKeyCode(keyCode, definition.defaultKeyCode);
	const bindings = readStoredBindings();
	bindings[action] = next;
	writeStoredBindings(bindings);
	return next;
}

export function resetRemoteKeyBinding(action: RemoteKeyAction): number {
	const bindings = readStoredBindings();
	delete bindings[action];
	writeStoredBindings(bindings);
	return getRemoteKeyActionDefinition(action).defaultKeyCode;
}

export function resetRemoteKeyBindings(): Record<RemoteKeyAction, number> {
	writeStoredBindings({});
	return getRemoteKeyBindings();
}

export function matchesRemoteKeyAction(event: KeyboardEvent, action: RemoteKeyAction): boolean {
	const definition = getRemoteKeyActionDefinition(action);
	const stored = readStoredBindings()[action];
	if (stored !== undefined) return event.keyCode === stored;

	return event.keyCode === definition.defaultKeyCode || definition.defaultAliases?.includes(event.key) === true || definition.defaultCodes?.includes(event.code) === true;
}

export function subscribeRemoteKeySettingsChanges(listener: () => void): () => void {
	window.addEventListener(REMOTE_KEY_SETTINGS_EVENT, listener);
	window.addEventListener('storage', listener);

	return () => {
		window.removeEventListener(REMOTE_KEY_SETTINGS_EVENT, listener);
		window.removeEventListener('storage', listener);
	};
}
