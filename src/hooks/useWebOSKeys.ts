import {useEffect} from 'react';
import {createBackHandlerStack, shouldHandleBackKey, type BackHandlerStack} from '../compat/input-adapter';

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
	return event.keyCode === 415 || event.key === 'Play' || event.key === 'MediaPlay' || event.code === 'MediaPlay';
}

function isStopKey(event: KeyboardEvent): boolean {
	return event.keyCode === 19 || event.key === 'Stop' || event.key === 'MediaStop' || event.code === 'MediaStop';
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
			if (event.key === 'ArrowLeft' && onArrowLeft) {
				event.preventDefault();
				onArrowLeft();
			} else if (event.key === 'ArrowRight' && onArrowRight) {
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
