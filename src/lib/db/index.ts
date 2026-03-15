import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
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

export const db = createDb();
