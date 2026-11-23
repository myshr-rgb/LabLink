import { AppError } from "@/lib/errors";

export class RateLimitError extends AppError {
  constructor(readonly retryAfter: number) {
    super("RATE_LIMITED", "Too many requests. Try again shortly.");
  }
}
export interface Bucket {
  name: string;
  limit: number;
  windowMs: number;
}
interface Window {
  hits: number[];
  expires: number;
}
/** Sliding windows expire lazily. Bound memory and fail closed at capacity. */
export class RateLimiter {
  private windows = new Map<string, Window>();
  private nextSweep = 0;
  check(bucket: Bucket, client: string, now: number): void {
    if (now >= this.nextSweep) {
      for (const [key, window] of this.windows)
        if (window.expires <= now) this.windows.delete(key);
      this.nextSweep = now + 60_000;
    }
    const key = JSON.stringify([bucket.name, client]);
    const hits = (this.windows.get(key)?.hits ?? []).filter(
      (time) => time > now - bucket.windowMs,
    );
    if (hits.length >= bucket.limit)
      throw new RateLimitError(
        Math.ceil((hits[0] + bucket.windowMs - now) / 1000),
      );
    if (!this.windows.has(key) && this.windows.size >= 10000)
      throw new RateLimitError(60);
    hits.push(now);
    this.windows.set(key, { hits, expires: now + bucket.windowMs });
  }
}
