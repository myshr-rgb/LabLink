"use client";
import Link from "next/link";
import { useRef } from "react";
import { secondary } from "@/components/ui/workflow-ui";
import type { Role } from "@/types/domain";

export function Navigation({
  role,
}: {
  role: Role | undefined;
}): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const links = [
    ["/equipment", "Equipment"],
    ["/how-it-works", "How it works"],
  ];
  if (role) links.push(["/bookings", "My bookings"], ["/projects", "Projects"]);
  if (role === "faculty" || role === "admin")
    links.push(["/approvals", "Approvals"]);
  const nav = (mobile: boolean) => (
    <nav
      aria-label="Main"
      className={mobile ? "grid gap-2" : "flex flex-wrap gap-3"}
    >
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          onClick={() => {
            if (mobile) dialog.current?.close();
          }}
          className="inline-flex min-h-11 items-center text-text-muted hover:text-accent"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
  return (
    <>
      <div className="hidden lg:block">{nav(false)}</div>
      <button
        type="button"
        className={secondary + " lg:hidden"}
        onClick={() => dialog.current?.showModal()}
      >
        Menu
      </button>
      <dialog
        ref={dialog}
        aria-label="Main menu"
        className="w-[min(360px,90vw)] rounded-xl bg-bg p-6 backdrop:bg-text/40"
      >
        {nav(true)}
        <button className={secondary} onClick={() => dialog.current?.close()}>
          Close menu
        </button>
      </dialog>
    </>
  );
}
