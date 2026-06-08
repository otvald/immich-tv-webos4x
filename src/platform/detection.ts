import type {CapabilityOverrides, WebOSTarget} from './capabilities';
import appInfo from '../../webos-meta/appinfo.json';

export interface PlatformDiagnostics {
	target?: WebOSTarget;
	capabilities?: CapabilityOverrides;
}

export interface PlatformResolutionOptions {
	target?: WebOSTarget;
	diagnostics?: PlatformDiagnostics;
	env?: Record<string, string | undefined>;
}

function readProcessEnv(): Record<string, string | undefined> {
	const processValue = globalThis as typeof globalThis & {
		process?: {
			env?: Record<string, string | undefined>;
		};
	};

	return processValue.process?.env ?? {};
}

export function detectTarget(env: Record<string, string | undefined> = readProcessEnv()): WebOSTarget {
	if (appInfo.id.includes('legacy')) return 'legacy';
	return env.WEBOS_TARGET === 'legacy' ? 'legacy' : 'modern';
}

export function resolveTarget(options: PlatformResolutionOptions = {}): WebOSTarget {
	return options.diagnostics?.target ?? options.target ?? detectTarget(options.env);
}

export function resolveCapabilityOverrides(options: PlatformResolutionOptions = {}): CapabilityOverrides {
	return options.diagnostics?.capabilities ?? {};
}
