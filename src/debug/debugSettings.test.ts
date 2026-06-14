import {isDebugOverlayToggleKey} from './debugSettings';
import {resetRemoteKeyBindings, setRemoteKeyBinding} from '../utils/remoteKeySettings';

function keyEvent(keyCode: number, key = '', code = ''): KeyboardEvent {
	return new KeyboardEvent('keydown', {keyCode, key, code});
}

describe('debugSettings remote key binding', () => {
	beforeEach(() => {
		window.localStorage.clear();
		resetRemoteKeyBindings();
	});

	test('uses the default Blue key binding', () => {
		expect(isDebugOverlayToggleKey(keyEvent(406, 'Blue', 'ColorF3Blue'))).toBe(true);
	});

	test('uses a custom diagnostics toggle binding instead of the default', () => {
		setRemoteKeyBinding('toggleDebug', 405);

		expect(isDebugOverlayToggleKey(keyEvent(406, 'Blue', 'ColorF3Blue'))).toBe(false);
		expect(isDebugOverlayToggleKey(keyEvent(405))).toBe(true);
	});
});
