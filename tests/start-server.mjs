import { execFileSync, spawn } from 'node:child_process';
import Database from 'better-sqlite3';
for (const script of ['migrate', 'seed', 'bootstrap'])
  execFileSync(process.execPath, ['--import', 'tsx', `scripts/${script}.ts`], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });
// The seed leaves projects, clients and articles empty, and empty sections are hidden from the
// website. Publish one of each so every public page exists; tests that need them empty unpublish.
{
  const db = new Database(process.env.DATABASE_PATH);
  const now = Date.now();
  const insert = (table, extra = {}) => {
    const values = {
      title: `E2E ${table}`,
      slug: `e2e-${table}`,
      short_description: 'Konten uji.',
      description: 'Konten uji untuk tes end-to-end.',
      title_en: `E2E ${table} (en)`,
      published: 1,
      sort_order: 50,
      created_at: now,
      updated_at: now,
      ...extra,
    };
    const columns = Object.keys(values);
    db.prepare(
      `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    ).run(...Object.values(values));
  };
  insert('projects', { client_name: 'PT E2E', project_year: '2025' });
  insert('clients');
  insert('articles');
  db.close();
}
const server = spawn(process.execPath, ['dist/server/entry.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    server.kill(signal);
  });
server.on('exit', (code) => process.exit(code ?? 0));
