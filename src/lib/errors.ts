const STATUS = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SLOT_TAKEN: 409,
  INVALID_TRANSITION: 409,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof STATUS;

export class AppError extends Error {
  readonly status: number;
  readonly expose: boolean;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
    this.expose = code !== "INTERNAL";
  }
}
