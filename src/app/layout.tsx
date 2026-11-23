import { headers } from "next/headers";
import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { validateSession } from "@/lib/auth/session";
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
  const actor = validateSession((await headers()).get("cookie"), new Date());
  return (
    <html lang="en">
      <body>
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
            <Link href="/" className="font-semibold text-accent">
              LabLink
            </Link>
            <UserMenu actor={actor} />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
