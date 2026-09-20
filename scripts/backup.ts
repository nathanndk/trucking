import { mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sqlite } from '../src/db';
import { dataDir, uploadsDir } from '../src/lib/env';
const destination = process.env.BACKUP_DIR;
if (!destination || !path.isAbsolute(destination))
  throw new Error('Set BACKUP_DIR to an absolute directory outside the application and DATA_DIR.');
const root = path.resolve(destination);
const inside = (parent: string, child: string) => {
  const rel = path.relative(parent, child);
  return !rel || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
};
if (inside(process.cwd(), root) || inside(dataDir, root))
  throw new Error('Backups must be outside the application and persistent data directories.');
const target = path.join(root, `lintas-${new Date().toISOString().replaceAll(':', '-')}`);
await mkdir(target, { recursive: true, mode: 0o700 });
try {
  await sqlite.backup(path.join(target, 'app.db'));
  await cp(uploadsDir, path.join(target, 'uploads'), { recursive: true, errorOnExist: true }).catch(
    (e: NodeJS.ErrnoException) => {
      if (e.code !== 'ENOENT') throw e;
    },
  );
  await writeFile(
    path.join(target, 'manifest.json'),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        database: 'app.db',
        uploads: 'uploads',
        application: 'lintas-logistics',
        note: 'Restore database and uploads together. See README.',
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(`Backup completed: ${target}`);
} finally {
  sqlite.close();
}
