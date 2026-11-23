import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthPageForm } from "@/components/auth/AuthPageForm";
import { validateSession } from "@/lib/auth/session";
import { getConfig } from "@/lib/config";

export default async function LoginPage(): Promise<React.JSX.Element> {
  if (validateSession((await headers()).get("cookie"), new Date()))
    redirect("/");
  return <AuthPageForm mode="login" demoMode={getConfig().DEMO_MODE} />;
}
