import {useEffect} from 'react';
import {createBackHandlerStack, shouldHandleBackKey, type BackHandlerStack} from '../compat/input-adapter';
import {matchesRemoteKeyAction} from '../utils/remoteKeySettings';

interface UseWebOSKeysOptions {
	onBack?: () => void;
	onArrowLeft?: () => void;
	onArrowRight?: () => void;
	onPlay?: () => void;
	onStop?: () => void;
}

const backStack: BackHandlerStack = createBackHandlerStack();

let bridgeInstalled = false;

function isPlayKey(event: KeyboardEvent): boolean {
	return matchesRemoteKeyAction(event, 'randomPlay');
}

function isStopKey(event: KeyboardEvent): boolean {
	return matchesRemoteKeyAction(event, 'randomStop');
}

function ensureBridgeInstalled(): void {
	if (bridgeInstalled || typeof window === 'undefined') return;
	bridgeInstalled = true;

	window.addEventListener(
		'keydown',
		(event: KeyboardEvent) => {
			if (!shouldHandleBackKey(event)) return;
			if (backStack.fire()) {
				event.preventDefault();
				event.stopImmediatePropagation();
			}
		},
		{capture: true}
	);
}

export const useWebOSKeys = ({onBack, onArrowLeft, onArrowRight, onPlay, onStop}: UseWebOSKeysOptions = {}) => {
	useEffect(() => {
		ensureBridgeInstalled();

		let unregisterBack: (() => void) | undefined;
		if (onBack) {
			unregisterBack = backStack.push(onBack);
		}

		const handleArrowKeys = (event: KeyboardEvent) => {
			if (matchesRemoteKeyAction(event, 'previous') && onArrowLeft) {
				event.preventDefault();
				onArrowLeft();
			} else if (matchesRemoteKeyAction(event, 'next') && onArrowRight) {
				event.preventDefault();
				onArrowRight();
			}
		};
		const needsArrowListener = !!(onArrowLeft || onArrowRight);
		if (needsArrowListener) {
			window.addEventListener('keydown', handleArrowKeys, {capture: true});
		}

		const handleMediaKeys = (event: KeyboardEvent) => {
			if (onPlay && isPlayKey(event)) {
				event.preventDefault();
				event.stopImmediatePropagation();
				onPlay();
			} else if (onStop && isStopKey(event)) {
				event.preventDefault();
				event.stopImmediatePropagation();
				onStop();
			}
		};
		const needsMediaKeyListener = !!(onPlay || onStop);
		if (needsMediaKeyListener) {
			window.addEventListener('keydown', handleMediaKeys, {capture: true});
		}

		return () => {
			if (unregisterBack) {
				unregisterBack();
			}
			if (needsArrowListener) {
				window.removeEventListener('keydown', handleArrowKeys, {capture: true});
			}
			if (needsMediaKeyListener) {
				window.removeEventListener('keydown', handleMediaKeys, {capture: true});
			}
		};
	}, [onBack, onArrowLeft, onArrowRight, onPlay, onStop]);
};
