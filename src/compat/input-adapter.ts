import {matchesRemoteKeyAction} from '../utils/remoteKeySettings';

export interface NormalizedKeyEvent {
	key: string;
	keyCode: number;
	originalEvent: KeyboardEvent;
}

const BACK_KEYCODES = new Set([461, 1536, 8, 10009, 27]);
const BACKSPACE_KEYCODE = 8;

export function normalizeKeyEvent(event: KeyboardEvent): NormalizedKeyEvent {
	const keyCode = event.keyCode;

	if (BACK_KEYCODES.has(keyCode)) {
		return {
			key: 'Back',
			keyCode,
			originalEvent: event,
		};
	}

	return {
		key: event.key,
		keyCode,
		originalEvent: event,
	};
}

export function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable || target.contentEditable === 'true') return true;
	const tag = target.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA';
}

function isEditingText(target: EventTarget | null): boolean {
	return isEditableTarget(target) || isEditableTarget(document.activeElement);
}

export function shouldHandleBackKey(event: KeyboardEvent): boolean {
	if (!BACK_KEYCODES.has(event.keyCode) && !matchesRemoteKeyAction(event, 'back')) return false;
	if (event.keyCode === BACKSPACE_KEYCODE && isEditingText(event.target)) return false;
	return true;
}

export interface BackHandlerStack {
	push: (handler: () => void) => () => void;
	fire: () => boolean;
}

export function createBackHandlerStack(): BackHandlerStack {
	const stack: Array<() => void> = [];

	return {
		push(handler: () => void): () => void {
			stack.push(handler);

			return () => {
				const idx = stack.lastIndexOf(handler);
				if (idx >= 0) {
					stack.splice(idx, 1);
				}
			};
		},

		fire(): boolean {
			const top = stack[stack.length - 1];
			if (!top) return false;
			top();
			return true;
		},
	};
}
