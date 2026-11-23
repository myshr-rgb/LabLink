import Link from "next/link";
import { button, page } from "@/components/ui/workflow-ui";
export default function NotFoundPage(): React.JSX.Element {
  return (
    <main id="content" className={page}>
      <h1 className="mb-4 text-2xl font-semibold">Page unavailable</h1>
      <Link href="/equipment" className={button}>
        Browse equipment
      </Link>
    </main>
  );
}
