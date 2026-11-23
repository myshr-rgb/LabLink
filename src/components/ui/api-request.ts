export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
type Envelope<T> =
  { data: T } | { error: { message: string; details?: unknown } };

/** Fetch an API data envelope and keep structured errors available to forms. */
export async function apiRequest<T>(
  path: string,
  method = "GET",
  body?: object,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method,
    signal,
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const result = (await response.json()) as Envelope<T>;
  if ("error" in result)
    throw new ApiError(
      response.status,
      result.error.message,
      result.error.details,
    );
  if (!response.ok)
    throw new ApiError(response.status, "The request failed. Try again.");
  return result.data;
}
