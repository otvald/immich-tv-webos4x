function loadPolyfills(appId: string, envTarget?: string, palmAppId?: string): jest.Mock {
	jest.resetModules();
	const applyLegacyPolyfills = jest.fn();
	jest.doMock('../webos-meta/appinfo.json', () => ({id: appId}));
	jest.doMock('./compat/polyfills-legacy', () => ({applyLegacyPolyfills}));

	const originalTarget = process.env.WEBOS_TARGET;
	const globalWithPalm = globalThis as typeof globalThis & {PalmSystem?: {appid?: string}};
	const originalPalmSystem = globalWithPalm.PalmSystem;

	if (envTarget === undefined) delete process.env.WEBOS_TARGET;
	else process.env.WEBOS_TARGET = envTarget;

	if (palmAppId === undefined) delete globalWithPalm.PalmSystem;
	else globalWithPalm.PalmSystem = {appid: palmAppId};

	require('./polyfills');

	if (originalTarget === undefined) delete process.env.WEBOS_TARGET;
	else process.env.WEBOS_TARGET = originalTarget;

	if (originalPalmSystem === undefined) delete globalWithPalm.PalmSystem;
	else globalWithPalm.PalmSystem = originalPalmSystem;

	return applyLegacyPolyfills;
}

describe('polyfill activation', () => {
	afterEach(() => {
		jest.dontMock('../webos-meta/appinfo.json');
		jest.dontMock('./compat/polyfills-legacy');
		jest.resetModules();
	});

	test('does not load legacy polyfills for modern app metadata by default', () => {
		expect(loadPolyfills('dk.otvald.immichtv')).not.toHaveBeenCalled();
	});

	test('loads legacy polyfills when WEBOS_TARGET is legacy', () => {
		expect(loadPolyfills('dk.otvald.immichtv', 'legacy')).toHaveBeenCalledTimes(1);
	});

	test('loads legacy polyfills for legacy package id', () => {
		expect(loadPolyfills('dk.otvald.immichtv.legacy')).toHaveBeenCalledTimes(1);
	});

	test('loads legacy polyfills for PalmSystem legacy app id', () => {
		expect(loadPolyfills('dk.otvald.immichtv', undefined, 'dk.otvald.immichtv.legacy')).toHaveBeenCalledTimes(1);
	});
});
