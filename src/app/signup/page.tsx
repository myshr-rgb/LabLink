import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthPageForm } from "@/components/auth/AuthPageForm";
import { validateSession } from "@/lib/auth/session";

export default async function SignupPage(): Promise<React.JSX.Element> {
  if (validateSession((await headers()).get("cookie"), new Date()))
    redirect("/");
  return <AuthPageForm mode="signup" />;
}
