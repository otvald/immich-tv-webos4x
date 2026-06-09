function loadDetection(appId: string): typeof import('./detection') {
	jest.resetModules();
	jest.doMock('../../webos-meta/appinfo.json', () => ({id: appId}));
	return require('./detection') as typeof import('./detection');
}

describe('platform detection', () => {
	afterEach(() => {
		jest.dontMock('../../webos-meta/appinfo.json');
		jest.resetModules();
	});

	test('prefers legacy app metadata over WEBOS_TARGET', () => {
		const {detectTarget} = loadDetection('dk.otvald.immichtv.legacy');

		expect(detectTarget({WEBOS_TARGET: 'modern'})).toBe('legacy');
	});

	test('uses WEBOS_TARGET when app metadata is not legacy', () => {
		const {detectTarget} = loadDetection('dk.otvald.immichtv');

		expect(detectTarget({WEBOS_TARGET: 'legacy'})).toBe('legacy');
		expect(detectTarget({WEBOS_TARGET: 'modern'})).toBe('modern');
		expect(detectTarget({})).toBe('modern');
	});

	test('resolveTarget allows diagnostics and explicit target overrides', () => {
		const {resolveTarget} = loadDetection('dk.otvald.immichtv');

		expect(resolveTarget({diagnostics: {target: 'legacy'}})).toBe('legacy');
		expect(resolveTarget({target: 'legacy'})).toBe('legacy');
		expect(resolveTarget({env: {WEBOS_TARGET: 'modern'}})).toBe('modern');
	});

	test('resolveCapabilityOverrides returns diagnostics overrides', () => {
		const {resolveCapabilityOverrides} = loadDetection('dk.otvald.immichtv');
		const capabilities = {video: {status: 'disabled' as const, reason: 'test'}};

		expect(resolveCapabilityOverrides({diagnostics: {capabilities}})).toEqual(capabilities);
		expect(resolveCapabilityOverrides()).toEqual({});
	});
});
