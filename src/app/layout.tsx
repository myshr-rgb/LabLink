import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { Navigation } from "@/components/layout/Navigation";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { unreadNotificationCount } from "@/services/notification.service";
import { viewer } from "@/services/viewer.service";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LabLink",
  description: "Campus lab resource sharing",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const actor = await viewer();
  const unread = actor ? unreadNotificationCount(actor) : 0;
  return (
    <html lang="en">
      <body>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-30 focus:bg-bg focus:p-3"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-10 border-b border-border bg-bg">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
            <Link href="/" className="font-semibold text-accent">
              LabLink
            </Link>
            <Navigation role={actor?.role} />
            <div className="flex items-center gap-2">
              {actor && (
                <NotificationBell
                  key={actor.userId + ":" + unread}
                  initial={unread}
                />
              )}
              <UserMenu actor={actor} />
            </div>
          </div>
        </header>
        {children}
        <footer className="mx-auto flex max-w-[1120px] flex-wrap gap-4 border-t border-border px-4 py-4 text-sm text-text-muted">
          <span>Built for campus labs</span>
          <Link href="/how-it-works" className="underline">
            How it works
          </Link>
        </footer>
      </body>
    </html>
  );
}
