/** Wrap the public, input-free health probe until the Phase 1 pipeline lands. */
export function apiHandler<T>(handle: () => T): () => Response {
  return () => Response.json(handle());
}
