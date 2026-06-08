#!/usr/bin/env node
// Generates target-specific appinfo.json from template based on WEBOS_TARGET environment variable.
// WEBOS_TARGET=modern (default): Uses fork app ID dk.otvald.immichtv
// WEBOS_TARGET=legacy: Uses fork legacy app ID dk.otvald.immichtv.legacy for side-by-side testing

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TEMPLATE_PATH = resolve(ROOT, 'webos-meta/appinfo.json.template');
const OUTPUT_PATH = resolve(ROOT, 'webos-meta/appinfo.json');
const PACKAGE_JSON_PATH = resolve(ROOT, 'package.json');

const target = (process.env.WEBOS_TARGET || 'modern').toLowerCase();

if (!['modern', 'legacy'].includes(target)) {
	console.error(`[generate-appinfo] ERROR: WEBOS_TARGET must be 'modern' or 'legacy', got: ${target}`);
	process.exit(1);
}

if (!existsSync(TEMPLATE_PATH)) {
	console.error(`[generate-appinfo] ERROR: Template not found: ${TEMPLATE_PATH}`);
	process.exit(1);
}

if (!existsSync(PACKAGE_JSON_PATH)) {
	console.error(`[generate-appinfo] ERROR: package.json not found: ${PACKAGE_JSON_PATH}`);
	process.exit(1);
}

const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));
const version = packageJson.version;

const targetConfig = {
	modern: {
		appId: 'dk.otvald.immichtv',
		appTitle: 'Immich TV Enhanced',
		vendor: 'Otvald (fork of Seeky91)',
	},
	legacy: {
		appId: 'dk.otvald.immichtv.legacy',
		appTitle: 'Immich TV Enhanced Legacy',
		vendor: 'Otvald (fork of Seeky91)',
	},
};

const config = targetConfig[target];

const template = readFileSync(TEMPLATE_PATH, 'utf8');

let output = template
	.replace(/{{APP_ID}}/g, config.appId)
	.replace(/{{VERSION}}/g, version)
	.replace(/{{APP_TITLE}}/g, config.appTitle)
	.replace(/{{APP_VENDOR}}/g, config.vendor);

writeFileSync(OUTPUT_PATH, output, 'utf8');

console.log(`[generate-appinfo] Generated appinfo.json for target=${target}`);
console.log(`  App ID: ${config.appId}`);
console.log(`  Title: ${config.appTitle}`);
console.log(`  Vendor: ${config.vendor}`);
console.log(`  Version: ${version}`);
console.log(`  Output: ${OUTPUT_PATH}`);
