#!/usr/bin/env node

/**
 * Architecture Guard Script
 *
 * Enforces that target detection patterns (WEBOS_TARGET, webOS4, isLegacy, UA parsing,
 * browser-version checks) only appear in approved modules.
 *
 * Usage: node tools/architecture-guard.js [--fix]
 * Exit code: 0 if clean, 1 if violations found
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_PATTERNS = [
	/\bWEBOS_TARGET\b/,
	/\bwebOS4\b/,
	/\bisLegacy\b/,
	/navigator\.userAgent/,
	/\bchrome\s*[<>=]/i,
	/\bfirefox\s*[<>=]/i,
	/\bversion\s*[<>=]/i,
];

const APPROVED_PATHS = [
	'src/platform',
	'src/config',
	'src/compat',
	'src/diagnostics',
	'tools',
	'src/__tests__',
];

const FORBIDDEN_PATHS = [
	'src/components',
	'src/views',
	'src/domain',
	'src/hooks',
	'src/api',
	'src/utils',
];

function isApprovedPath(filePath) {
	return APPROVED_PATHS.some(approved => filePath.includes(approved));
}

function isForbiddenPath(filePath) {
	return FORBIDDEN_PATHS.some(forbidden => filePath.includes(forbidden));
}

function isTestFile(filePath) {
	return filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx');
}

function scanFile(filePath) {
	const violations = [];
	const patterns = [];

	if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
		return {violations, patterns};
	}

	if (isTestFile(filePath)) {
		return {violations, patterns};
	}

	if (isApprovedPath(filePath)) {
		return {violations, patterns};
	}

	if (!isForbiddenPath(filePath)) {
		return {violations, patterns};
	}

	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const lines = content.split('\n');

		lines.forEach((line, index) => {
			FORBIDDEN_PATTERNS.forEach(pattern => {
				if (pattern.test(line)) {
					patterns.push(pattern.source);
					violations.push(`${filePath}:${index + 1}: ${line.trim()}`);
				}
			});
		});
	} catch (err) {
		// Ignore read errors
	}

	return {violations, patterns};
}

function walkDirectory(dir, callback) {
	const entries = fs.readdirSync(dir, {withFileTypes: true});

	entries.forEach(entry => {
		const fullPath = path.join(dir, entry.name);

		if (['.git', 'node_modules', 'build', 'dist'].includes(entry.name)) {
			return;
		}

		if (entry.isDirectory()) {
			walkDirectory(fullPath, callback);
		} else {
			callback(fullPath);
		}
	});
}

function main() {
	const violations = [];
	const srcDir = process.cwd();

	walkDirectory(srcDir, filePath => {
		const {violations: fileViolations} = scanFile(filePath);
		violations.push(...fileViolations);
	});

	if (violations.length > 0) {
		console.error('❌ Architecture violation: target detection found outside approved modules');
		console.error('');
		console.error('Approved modules: src/platform, src/config, src/compat, src/diagnostics, tools');
		console.error('Forbidden in: src/components, src/views, src/domain, src/hooks, src/api, src/utils');
		console.error('');
		console.error('Violations:');
		violations.forEach(v => console.error(`  ${v}`));
		console.error('');
		process.exit(1);
	}

	console.log('✅ Architecture guard passed: no forbidden patterns detected');
	process.exit(0);
}

main();
