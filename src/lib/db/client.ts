import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { getConfig } from "../config";
import { migrate } from "./migrate";

/** Close incomplete connections if schema initialization fails. */
export function openDatabase(path: string): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  try {
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    migrate(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

const state = globalThis as typeof globalThis & {
  lablinkDb?: Database.Database;
};
/** Reuse a migrated connection across requests and development reloads. */
export function getDb(): Database.Database {
  return (state.lablinkDb ??= openDatabase(getConfig().DATABASE_PATH));
}
