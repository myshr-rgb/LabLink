import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { getConfig } from "../config";
import { migrate } from "./migrate";
import { seedData } from "./seed-data";

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
  return (state.lablinkDb ??= initializeDatabase(getConfig().DATABASE_PATH));
}

function initializeDatabase(path: string): Database.Database {
  const db = openDatabase(path);
  try {
    seedData(db, new Date());
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
