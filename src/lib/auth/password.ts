import bcrypt from "bcryptjs";
import { validPasswordLength } from "./password-policy";

const COST = 12;
const DUMMY_HASH =
  "$2b$12$DA04qPjLjfC07STjDY4DPec8oyMGr48RwXVSHy4LWS5oim4AgQF9C";

/** Hash an accepted signup password. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

/** Compare a cost-12 hash even for an unknown or disabled account. */
export async function verifyPassword(
  password: string,
  hash: string | undefined,
): Promise<boolean> {
  const usable =
    hash !== undefined &&
    hash.startsWith("$2") &&
    validPasswordLength(password);
  const candidate = usable ? hash : DUMMY_HASH;
  const matches = await bcrypt.compare(
    validPasswordLength(password) ? password : "",
    candidate,
  );
  return Boolean(usable && matches);
}
