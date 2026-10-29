import { spawnSync } from 'node:child_process';
import electronPath from 'electron';
import path from 'node:path';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawnSync(
  electronPath,
  ['.', '--render-svg=build/spoteasy-icon.svg', '--render-out=build/icon.png', '--render-size=256'],
  { stdio: 'inherit', env, cwd: path.resolve('.') },
);

process.exit(child.status ?? 0);
