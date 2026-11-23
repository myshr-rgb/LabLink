import type { Metadata } from "next";
import Link from "next/link";
import { button, page } from "@/components/ui/workflow-ui";
export const metadata: Metadata = { title: "How it works · LabLink" };
export default function HowItWorks(): React.JSX.Element {
  return (
    <main id="content" className={page + " max-w-3xl space-y-5"}>
      <h1 className="text-3xl font-semibold">How it works</h1>
      <ol className="list-decimal space-y-3 pl-6">
        <li>
          Browse equipment and check the lab schedule. You can do both as a
          guest.
        </li>
        <li>Pick a time in IST. Sign in when you are ready to book.</li>
        <li>
          Open equipment confirms right away. Equipment that requires approval
          needs a project and a short explanation for your faculty guide.
        </li>
        <li>
          Check My bookings and Notifications for updates before visiting the
          lab.
        </li>
      </ol>
      <h2 className="text-xl font-semibold">When requests overlap</h2>
      <p className="text-text-muted">
        Requests can overlap while they wait for approval. Confirmed bookings
        hold the slot. Your faculty guide can request changes, and some
        equipment also requires a lab in-charge to approve.
      </p>
      <Link href="/equipment" className={button}>
        Browse equipment
      </Link>
    </main>
  );
}
