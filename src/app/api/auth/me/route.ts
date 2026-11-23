import { apiHandler } from "@/lib/security/api-handler";

export const GET = apiHandler({
  auth: "public",
  bucket: { name: "me", limit: 120, windowMs: 60_000 },
  handler: ({ actor }) => actor,
});
