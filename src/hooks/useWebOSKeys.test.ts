import {act, renderHook} from '@testing-library/react';

import {useWebOSKeys} from './useWebOSKeys';
import {resetRemoteKeyBindings, setRemoteKeyBinding} from '../utils/remoteKeySettings';

function press(keyCode: number, key = '', code = ''): void {
	act(() => {
		window.dispatchEvent(new KeyboardEvent('keydown', {keyCode, key, code, cancelable: true}));
	});
}

describe('useWebOSKeys configurable bindings', () => {
	beforeEach(() => {
		window.localStorage.clear();
		resetRemoteKeyBindings();
	});

	test('uses default PLAY and STOP mappings', () => {
		const onPlay = jest.fn();
		const onStop = jest.fn();
		const {unmount} = renderHook(() => useWebOSKeys({onPlay, onStop}));

		press(415, 'Play', 'MediaPlay');
		press(19, 'Stop', 'MediaStop');

		expect(onPlay).toHaveBeenCalledTimes(1);
		expect(onStop).toHaveBeenCalledTimes(1);
		unmount();
	});

	test('uses custom random play mapping instead of default key code', () => {
		const onPlay = jest.fn();
		setRemoteKeyBinding('randomPlay', 406);
		const {unmount} = renderHook(() => useWebOSKeys({onPlay}));

		press(415, 'Play', 'MediaPlay');
		press(406);

		expect(onPlay).toHaveBeenCalledTimes(1);
		unmount();
	});

	test('uses custom media viewer navigation mappings', () => {
		const onArrowLeft = jest.fn();
		const onArrowRight = jest.fn();
		setRemoteKeyBinding('previous', 403);
		setRemoteKeyBinding('next', 404);
		const {unmount} = renderHook(() => useWebOSKeys({onArrowLeft, onArrowRight}));

		press(37, 'ArrowLeft', 'ArrowLeft');
		press(39, 'ArrowRight', 'ArrowRight');
		press(403);
		press(404);

		expect(onArrowLeft).toHaveBeenCalledTimes(1);
		expect(onArrowRight).toHaveBeenCalledTimes(1);
		unmount();
	});
});
