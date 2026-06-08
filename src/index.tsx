/* global ENACT_PACK_ISOMORPHIC */
import './polyfills';
import './App/attachErrorHandler';
import React from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';

import App from './App/App';
import {probeFetch, probeBlob} from './compat/network-adapter';
import {probeLocalStorage} from './compat/storage-adapter';
import {createPlatformFacade, detectTarget, type CapabilityOverrides} from './platform';

function readProcessEnv(): Record<string, string | undefined> {
	const processValue = globalThis as typeof globalThis & {
		process?: {
			env?: Record<string, string | undefined>;
		};
	};

	return processValue.process?.env ?? {};
}

function resolveBootstrapCapabilities(): CapabilityOverrides {
	if (typeof window === 'undefined') {
		return {};
	}

	const capabilities: CapabilityOverrides = {};
	const localStorageProbe = probeLocalStorage();
	const fetchProbe = probeFetch();
	const blobProbe = probeBlob();

	if (!localStorageProbe.available) {
		capabilities.localStorage = {
			status: 'disabled',
			reason: localStorageProbe.reason,
		};
	}

	if (!fetchProbe.available) {
		capabilities.fetch = {
			status: 'disabled',
			reason: fetchProbe.reason,
		};
	}

	if (!blobProbe.available) {
		capabilities.blob = {
			status: 'disabled',
			reason: blobProbe.reason,
		};
	}

	return capabilities;
}

export function initializePlatformFacade(env: Record<string, string | undefined> = readProcessEnv()) {
	return createPlatformFacade({
		target: detectTarget(env),
		diagnostics: {
			capabilities: resolveBootstrapCapabilities(),
		},
	});
}

const platformFacade = initializePlatformFacade();
const appElement = <App platformFacade={platformFacade} />;

if (typeof window !== 'undefined') {
	const rootElement = document.getElementById('root');
	if (rootElement) {
		if (typeof ENACT_PACK_ISOMORPHIC !== 'undefined' && ENACT_PACK_ISOMORPHIC) {
			hydrateRoot(rootElement, appElement);
		} else {
			createRoot(rootElement).render(appElement);
		}
	}
}

export default appElement;
