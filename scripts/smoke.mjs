import { spawnSync } from 'node:child_process';
import electronPath from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const build = spawnSync(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
  stdio: 'inherit',
  env: process.env,
});
if (build.status !== 0) process.exit(build.status ?? 1);

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

// 用独立的临时 userData，避免冒烟里的主题/音量/喜欢污染真实配置。
const smokeData = fs.mkdtempSync(path.join(os.tmpdir(), 'spoteasy-smoke-'));

const child = spawnSync(
  electronPath,
  [
    '.',
    `--user-data=${smokeData}`,
    '--eval-file=' + path.resolve('scripts/smoke-eval.js'),
    '--shot-route=#/home',
    '--shot-size=1440x900',
  ],
  { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
);

const line = (child.stdout || '')
  .split(/\r?\n/)
  .find((l) => l.startsWith('[eval] '));

if (!line) {
  fs.rmSync(smokeData, { recursive: true, force: true });
  console.error(child.stdout);
  console.error(child.stderr);
  console.error('smoke: no [eval] output');
  process.exit(1);
}

fs.rmSync(smokeData, { recursive: true, force: true });

const result = JSON.parse(line.slice('[eval] '.length));
console.log('\n交互冒烟检查：\n');
for (const { name, value } of result.steps) {
  console.log(`  ${String(name).padEnd(24)} ${JSON.stringify(value)}`);
}

const failed = result.steps.filter(({ value }) => value === false || value === null);
if (failed.length) {
  console.error('\n需要人工确认的项:', failed.map((f) => f.name).join(', '));
}
