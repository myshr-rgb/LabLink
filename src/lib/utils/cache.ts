/** Bounded process-local LRU. Callers supply the clock and invalidate after writes. */
export class TtlCache<T> {
  private entries = new Map<string, { value: T; expires: number }>();
  constructor(
    private readonly capacity: number,
    private readonly ttlMs: number,
  ) {}
  get(key: string, now: number): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    if (entry.expires <= now) return;
    this.entries.set(key, entry);
    return entry.value;
  }
  set(key: string, value: T, now: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expires: now + this.ttlMs });
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }
  clear(): void {
    this.entries.clear();
  }
}
