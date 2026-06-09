import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const guardScript = path.join(__dirname, 'architecture-guard.js');

function withTempProject(callback: (projectRoot: string) => void): void {
	const projectRoot = mkdtempSync(path.join(tmpdir(), 'immich-architecture-guard-'));
	try {
		callback(projectRoot);
	} finally {
		rmSync(projectRoot, {recursive: true, force: true});
	}
}

describe('architecture-guard CLI', () => {
	test('passes when target detection appears only in approved modules', () => {
		withTempProject((projectRoot) => {
			mkdirSync(path.join(projectRoot, 'src/platform'), {recursive: true});
			mkdirSync(path.join(projectRoot, 'src/components'), {recursive: true});
			writeFileSync(path.join(projectRoot, 'src/platform/detection.ts'), "const target = process.env.WEBOS_TARGET;\n");
			writeFileSync(path.join(projectRoot, 'src/components/Card.tsx'), "export const Card = () => null;\n");

			const result = spawnSync(process.execPath, [guardScript], {cwd: projectRoot, encoding: 'utf8'});

			expect(result.status).toBe(0);
			expect(result.stdout).toContain('Architecture guard passed');
		});
	});

	test('fails when target detection leaks into components', () => {
		withTempProject((projectRoot) => {
			mkdirSync(path.join(projectRoot, 'src/components'), {recursive: true});
			writeFileSync(path.join(projectRoot, 'src/components/Card.tsx'), "export const target = process.env.WEBOS_TARGET;\n");

			const result = spawnSync(process.execPath, [guardScript], {cwd: projectRoot, encoding: 'utf8'});

			expect(result.status).toBe(1);
			expect(result.stderr).toContain('Architecture violation');
			expect(result.stderr).toContain('src/components/Card.tsx');
		});
	});
});
