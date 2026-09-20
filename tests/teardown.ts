import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
export default function teardown() {
  const dir = process.env.DATA_DIR;
  if (dir && path.dirname(dir) === tmpdir() && path.basename(dir).startsWith('lintas-e2e-'))
    rmSync(dir, { recursive: true, force: true });
}
