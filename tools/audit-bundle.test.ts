import {spawnSync} from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const auditScript = path.join(__dirname, 'audit-bundle.mjs');

describe('audit-bundle CLI', () => {
	test('passes an ES2015-only fixture without heuristic hits', () => {
		const result = spawnSync(process.execPath, [auditScript, path.join(repoRoot, 'test-fixtures/es2015-only.js')], {encoding: 'utf8'});

		expect(result.status).toBe(0);
		expect(result.stdout).toContain('AUDIT PASSED');
	});

	test('reports heuristic hits for modern syntax fixtures after parse validation', () => {
		const result = spawnSync(process.execPath, [auditScript, path.join(repoRoot, 'test-fixtures/optional-chaining.js')], {encoding: 'utf8'});

		expect(result.status).toBe(0);
		expect(result.stdout).toContain('AUDIT PASSED WITH HEURISTIC HITS');
		expect(result.stdout).toContain('Optional Chaining');
	});

	test('fails when the bundle path does not exist', () => {
		const result = spawnSync(process.execPath, [auditScript, path.join(repoRoot, 'missing-bundle.js')], {encoding: 'utf8'});

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('Bundle not found');
	});
});
