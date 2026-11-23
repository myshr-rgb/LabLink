import { getDb } from "../client";
/** Hold SQLite's write lock across permission, availability and mutation checks. */
export function writeTransaction<T>(action: () => T): T {
  return getDb().transaction(action).immediate();
}
