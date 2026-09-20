import { execFileSync, spawn } from 'node:child_process';
for (const script of ['migrate', 'seed', 'bootstrap'])
  execFileSync(process.execPath, ['--import', 'tsx', `scripts/${script}.ts`], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });
const server = spawn(process.execPath, ['dist/server/entry.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    server.kill(signal);
  });
server.on('exit', (code) => process.exit(code ?? 0));
