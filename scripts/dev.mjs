import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import electronPath from 'electron';

const server = await createServer({});
await server.listen();
const urls = server.resolvedUrls;
const url = urls.local[0];

console.log(`\n  Netify dev server  ${url}`);
console.log('  Electron 正在启动…\n');

const env = { ...process.env, VITE_DEV_SERVER_URL: url };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env,
});

child.on('close', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    child.kill();
    server.close().finally(() => process.exit(0));
  });
}
