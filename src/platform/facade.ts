import React, {createContext, useContext} from 'react';

import {
	type CapabilityKey,
	type FeatureGate,
	type PlatformCapabilities,
	resolvePlatformCapabilities,
	type WebOSTarget,
} from './capabilities';
import {
	type PlatformDiagnostics,
	resolveCapabilityOverrides,
	type PlatformResolutionOptions,
	resolveTarget,
} from './detection';

export interface PlatformFacade {
	target: WebOSTarget;
	capabilities: PlatformCapabilities;
	getCapability(capability: CapabilityKey): FeatureGate;
	supports(capability: CapabilityKey): boolean;
	requiresServerProxy(capability: CapabilityKey): boolean;
	isDisabled(capability: CapabilityKey): boolean;
}

export interface CreatePlatformFacadeOptions extends PlatformResolutionOptions {}

export interface PlatformFacadeProviderProps {
	value: PlatformFacade;
	children?: React.ReactNode;
}

function buildPlatformFacade(target: WebOSTarget, capabilities: PlatformCapabilities): PlatformFacade {
	return {
		target,
		capabilities,
		getCapability(capability) {
			return capabilities[capability];
		},
		supports(capability) {
			return capabilities[capability].supported;
		},
		requiresServerProxy(capability) {
			return capabilities[capability].serverProxyRequired;
		},
		isDisabled(capability) {
			return capabilities[capability].disabled;
		},
	};
}

export function createPlatformFacade(options: CreatePlatformFacadeOptions = {}): PlatformFacade {
	const target = resolveTarget(options);
	const capabilities = resolvePlatformCapabilities(target, resolveCapabilityOverrides(options));

	return buildPlatformFacade(target, capabilities);
}

export function createPlatformFacadeFromDiagnostics(options: {
	target?: WebOSTarget;
	diagnostics?: PlatformDiagnostics;
	env?: Record<string, string | undefined>;
} = {}): PlatformFacade {
	return createPlatformFacade(options);
}

const defaultPlatformFacade = createPlatformFacade({target: 'modern'});

export const PlatformFacadeContext = createContext<PlatformFacade>(defaultPlatformFacade);

export function PlatformFacadeProvider({value, children}: PlatformFacadeProviderProps) {
	return React.createElement(PlatformFacadeContext.Provider, {value}, children);
}

export function usePlatformFacade(): PlatformFacade {
	return useContext(PlatformFacadeContext);
}
