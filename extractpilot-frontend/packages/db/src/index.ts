/** Frontend-only type stub — database lives in the backend repo. */
export type Database = unknown;
export function createDb(_url: string): Database {
  throw new Error("@repo/db is a type stub in the frontend repo");
}
