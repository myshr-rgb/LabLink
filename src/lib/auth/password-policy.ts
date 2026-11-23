const COMMON = new Set([
  "password123",
  "password1234",
  "password123!",
  "1234567890",
  "qwerty12345",
  "letmein1234",
  "iloveyou123",
  "admin12345",
  "changeme123",
]);

/** bcrypt truncates at 72 UTF-8 bytes. Reject those inputs before hashing. */
export function validPasswordLength(password: string): boolean {
  return (
    password.length >= 10 && new TextEncoder().encode(password).length <= 72
  );
}

/** Apply signup rules without transforming the password itself. */
export function allowedPassword(password: string): boolean {
  return validPasswordLength(password) && !COMMON.has(password.toLowerCase());
}
