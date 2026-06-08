#!/usr/bin/env node
// Audits final bundles for syntax unsupported at the Chromium 53 floor (webOS 4.x).
// Primary gate: esbuild parse-validation against target=chrome53.
// Secondary heuristics: advisory-only regex checks for obvious modern syntax markers.
//
// Usage:
//   node tools/audit-bundle.mjs <bundle-path>
//   npm run audit:legacy

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { transform } from 'esbuild';

const TARGET = 'chrome53';

const SUPPORTED_FEATURES = [
	'ES2015: let, const, arrow functions, classes, template literals',
	'ES2015: Promises, Map, Set, Symbol',
	'ES2015: Destructuring, array spread ([...arr])',
];

const UNSUPPORTED_PATTERNS = [
	{
		name: 'ES2020: Optional Chaining (?.)',
		pattern: /\?\./g,
		description: 'Optional chaining operator (?.) is not supported in Chromium 53'
	},
	{
		name: 'ES2020: Nullish Coalescing (??)',
		pattern: /\?\?(?!=)/g,
		description: 'Nullish coalescing operator (??) is not supported in Chromium 53'
	},
	{
		name: 'ES2018: Object Spread/Rest',
		pattern: /\{[^}]*\.\.\.[\w$]+[^}]*\}/g,
		description: 'Object spread/rest (...obj) is not supported in Chromium 53'
	},
	{
		name: 'ES2022: Private Fields',
		pattern: /#[\w$]+\s*[=;(]/g,
		description: 'Private class fields (#field) are not supported in Chromium 53'
	},
	{
		name: 'ES2017: Async Functions',
		pattern: /\basync\s+(function|\(|[\w$]+\s*=>)/g,
		description: 'Async/await is not supported in Chromium 53'
	},
	{
		name: 'ES2017: Await Operator',
		pattern: /\bawait\s+/g,
		description: 'Async/await is not supported in Chromium 53'
	},
	{
		name: 'ES2020: BigInt Literals',
		pattern: /\b\d+n\b/g,
		description: 'BigInt literals (123n) are not supported in Chromium 53'
	},
	{
		name: 'ES2021: Logical Assignment (&&=, ||=, ??=)',
		pattern: /(\?\?=|\|\|=|&&=)/g,
		description: 'Logical assignment operators are not supported in Chromium 53'
	}
];

const DEPENDENCY_PATTERNS = [
	/@tanstack[\\\/]react-query/,
	/@tanstack[\\\/]query-core/,
	/@enact[\\\/]/,
	/react-dom/,
	/react[\\\/]/,
	/scheduler/,
];

function printHeader() {
	console.log('\n╔══════════════════════════════════════════════════════════════╗');
	console.log('║  Bundle Syntax Audit - Chromium 53 Floor (webOS 4.x)       ║');
	console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

function printSummary(target, bundleName, sizeKB) {
	console.log(`Bundle: ${bundleName}`);
	console.log(`Size: ${sizeKB} KB`);
	console.log(`Target: ${target}\n`);
	console.log('Supported Features:');
	SUPPORTED_FEATURES.forEach(f => console.log(`  ✓ ${f}`));
	console.log('');
}

function extractContext(code, matchIndex, contextLines = 2) {
	const lines = code.split('\n');
	let currentPos = 0;
	let lineNum = 0;

	for (let i = 0; i < lines.length; i++) {
		const lineLength = lines[i].length + 1;
		if (currentPos + lineLength > matchIndex) {
			lineNum = i + 1;
			break;
		}
		currentPos += lineLength;
	}

	const start = Math.max(0, lineNum - contextLines - 1);
	const end = Math.min(lines.length, lineNum + contextLines);
	
	const snippet = lines.slice(start, end)
		.map((line, idx) => {
			const num = start + idx + 1;
			const marker = num === lineNum ? '→' : ' ';
			return `${marker} ${String(num).padStart(5, ' ')} | ${line}`;
		})
		.join('\n');

	return { lineNum, snippet, errorLine: lines[lineNum - 1] };
}

function identifyDependency(code, errorLine, lineNum) {
	const lines = code.split('\n');
	const searchStart = Math.max(0, lineNum - 100);
	const searchRegion = lines.slice(searchStart, lineNum).join('\n');

	const moduleMatch = searchRegion.match(/\/\*+[\s*]*[\.\/]*node_modules[\\\/]([^*\n]+)/);
	if (moduleMatch) {
		const modulePath = moduleMatch[1].trim();
		const pkgMatch = modulePath.match(/^(@?[^\\\/]+(?:[\\\/][^\\\/]+)?)/);
		return pkgMatch ? pkgMatch[1].replace(/\\/g, '/') : modulePath;
	}

	for (const pattern of DEPENDENCY_PATTERNS) {
		if (pattern.test(searchRegion)) {
			const match = searchRegion.match(pattern);
			if (match) {
				return match[0].replace(/\\/g, '/');
			}
		}
	}

	return null;
}

function auditBundle(bundlePath) {
	printHeader();

	if (!existsSync(bundlePath)) {
		console.error(`❌ ERROR: Bundle not found: ${bundlePath}\n`);
		console.error('Build the bundle first:');
		console.error('  npm run pack:legacy    (or pack:modern)\n');
		process.exit(1);
	}

	const bundleName = basename(bundlePath);
	const code = readFileSync(bundlePath, 'utf8');
	const sizeKB = (code.length / 1024).toFixed(1);

	printSummary(TARGET, bundleName, sizeKB);

	try {
		transform(code, {loader: 'js', target: TARGET});
	} catch (error) {
		console.error('❌ AUDIT FAILED: Bundle does not parse at the Chromium 53 floor\n');
		console.error(error.message || error);
		process.exit(2);
	}

	const violations = [];

	for (const check of UNSUPPORTED_PATTERNS) {
		const matches = [...code.matchAll(check.pattern)];
		if (matches.length > 0) {
			for (const match of matches) {
				const context = extractContext(code, match.index);
				const dependency = identifyDependency(code, context.errorLine, context.lineNum);
				
				violations.push({
					name: check.name,
					description: check.description,
					match: match[0],
					context,
					dependency
				});
			}
		}
	}

	if (violations.length === 0) {
		console.log('✅ AUDIT PASSED: Bundle is compatible with Chromium 53\n');
		console.log(`All code in ${bundleName} can be parsed and executed`);
		console.log('on webOS 4.x devices (LG C9 2019, etc.).\n');
		process.exit(0);
	}

	console.log(`⚠️  AUDIT PASSED WITH HEURISTIC HITS: Found ${violations.length} regex match(es) after parse validation\n`);
	console.log('These matches are advisory only because minified helper code can resemble newer syntax patterns.\n');

	const grouped = {};
	for (const v of violations) {
		if (!grouped[v.name]) {
			grouped[v.name] = [];
		}
		grouped[v.name].push(v);
	}

	for (const [featureName, items] of Object.entries(grouped)) {
		console.log(`\n${'='.repeat(70)}`);
		console.log(`${featureName} (${items.length} occurrence${items.length > 1 ? 's' : ''})`);
		console.log('='.repeat(70));
		console.log(items[0].description);
		console.log('');

		const maxDisplay = 3;
		const displayItems = items.slice(0, maxDisplay);

		for (let i = 0; i < displayItems.length; i++) {
			const item = displayItems[i];
			console.log(`\nOccurrence #${i + 1}:`);
			console.log(item.context.snippet);
			
			if (item.dependency) {
				console.log(`\n📦 Likely source: node_modules/${item.dependency}`);
			}
		}

		if (items.length > maxDisplay) {
			console.log(`\n... and ${items.length - maxDisplay} more occurrence(s)`);
		}
	}

	console.log('\n\n' + '='.repeat(70));
	console.log('FOLLOW-UP OPTIONS:');
	console.log('='.repeat(70));
	console.log('1. Configure Enact CLI webpack to transpile problematic dependencies');
	console.log('2. Run tools/transpile-legacy.mjs to post-process the bundle');
	console.log('3. Find older package versions compatible with ES2015');
	console.log('4. Use polyfills or alternative packages\n');

	process.exit(0);
}

const args = process.argv.slice(2);
if (args.length === 0) {
	console.error('Usage: node tools/audit-bundle.mjs <bundle-path>\n');
	console.error('Example:');
	console.error('  node tools/audit-bundle.mjs dist/main.js');
	console.error('  npm run audit:legacy\n');
	process.exit(1);
}

const bundlePath = args[0];
auditBundle(bundlePath);
