"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/components/ui/api-request";

export function NotificationBell({
  initial,
}: {
  initial: number;
}): React.JSX.Element {
  const [unread, setUnread] = useState(initial);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    async function poll(): Promise<void> {
      try {
        const result = await apiRequest<{ unread: number }>(
          "/api/notifications?countOnly=true",
          "GET",
          undefined,
          abort.signal,
        );
        if (active) setUnread(result.unread);
      } catch {
        /* Keep the most recent count until the next poll. */
      }
    }
    const timer = setInterval(() => void poll(), 60_000);
    return () => {
      active = false;
      abort.abort();
      clearInterval(timer);
    };
  }, [initial]);
  return (
    <Link
      href="/notifications"
      className="inline-flex min-h-11 items-center gap-1 px-2 text-accent"
      aria-label={`Notifications, ${unread} unread`}
    >
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      <span aria-live="polite">{unread}</span>
    </Link>
  );
}
