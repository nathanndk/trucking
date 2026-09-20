import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from '../src/db';
migrate(db, { migrationsFolder: './drizzle' });
console.log('Database migrations applied.');
sqlite.close();
