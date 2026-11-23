import { openDatabase } from "@/lib/db/client";
/** Use the same migration path as the persistent database. */
export function testDb(): ReturnType<typeof openDatabase> {
  return openDatabase(":memory:");
}
