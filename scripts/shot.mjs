import { spawnSync } from 'node:child_process';
import electronPath from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const route = getArg('route', '#/home');
const size = getArg('size', '1440x900');
const out = getArg('out', 'shots/home.png');
const userData = getArg('user-data', '');

const build = spawnSync(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
  stdio: 'inherit',
  env: process.env,
});
if (build.status !== 0) process.exit(build.status ?? 1);

fs.mkdirSync(path.dirname(out), { recursive: true });

const electronArgs = [
  '.',
  `--screenshot=${path.resolve(out)}`,
  `--shot-size=${size}`,
  `--shot-route=${route.startsWith('#') ? route : `#${route}`}`,
  ...(userData ? [`--user-data=${path.resolve(userData)}`] : []),
];

const child = spawnSync(electronPath, electronArgs, {
  stdio: 'inherit',
  env: childEnv(),
});
process.exit(child.status ?? 0);

/** 开发壳（如 DSH）可能设置了 ELECTRON_RUN_AS_NODE=1，会让 Electron 退化成纯 Node。 */
function childEnv() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}
