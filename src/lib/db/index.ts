import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Schema = typeof schema;
type DB = PostgresJsDatabase<Schema>;

function createDb(): DB {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (see .env.example)."
    );
  }
  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
  });
  return drizzle(client, { schema });
}

let _db: DB | undefined;

function getDb(): DB {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

/**
 * Lazy DB: do not connect or throw at module load (Next.js build / Vercel may run without DATABASE_URL).
 * First real query triggers `createDb()`; missing DATABASE_URL then throws with the same message as before.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const d = getDb();
    const value = Reflect.get(d, prop, receiver);
    if (typeof value === "function") {
      return value.bind(d);
    }
    return value;
  },
});
