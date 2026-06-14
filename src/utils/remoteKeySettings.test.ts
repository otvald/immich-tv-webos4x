import {
	getRemoteKeyBinding,
	getRemoteKeyBindings,
	matchesRemoteKeyAction,
	resetRemoteKeyBinding,
	resetRemoteKeyBindings,
	setRemoteKeyBinding,
	subscribeRemoteKeySettingsChanges,
} from './remoteKeySettings';

function keyEvent(keyCode: number, key = '', code = ''): KeyboardEvent {
	return new KeyboardEvent('keydown', {key, code, keyCode});
}

describe('remoteKeySettings', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('returns safe defaults for current remote actions', () => {
		expect(getRemoteKeyBinding('randomPlay')).toBe(415);
		expect(getRemoteKeyBinding('randomStop')).toBe(19);
		expect(getRemoteKeyBinding('toggleDebug')).toBe(406);
		expect(getRemoteKeyBindings().previous).toBe(37);
	});

	test('persists custom key codes and resets individual actions', () => {
		expect(setRemoteKeyBinding('randomPlay', 406)).toBe(406);
		expect(getRemoteKeyBinding('randomPlay')).toBe(406);
		expect(matchesRemoteKeyAction(keyEvent(406), 'randomPlay')).toBe(true);
		expect(matchesRemoteKeyAction(keyEvent(415, 'Play'), 'randomPlay')).toBe(false);

		expect(resetRemoteKeyBinding('randomPlay')).toBe(415);
		expect(matchesRemoteKeyAction(keyEvent(415, 'Play'), 'randomPlay')).toBe(true);
	});

	test('clamps invalid key codes to the action default', () => {
		expect(setRemoteKeyBinding('randomStop', Number.NaN)).toBe(19);
		expect(setRemoteKeyBinding('randomStop', -5)).toBe(1);
		expect(setRemoteKeyBinding('randomStop', 20000)).toBe(9999);
	});

	test('resets all bindings and notifies subscribers', () => {
		const listener = jest.fn();
		const unsubscribe = subscribeRemoteKeySettingsChanges(listener);

		setRemoteKeyBinding('toggleDebug', 405);
		expect(listener).toHaveBeenCalledTimes(1);

		resetRemoteKeyBindings();
		expect(getRemoteKeyBinding('toggleDebug')).toBe(406);
		expect(listener).toHaveBeenCalledTimes(2);

		unsubscribe();
	});
});
