import manifest from "../../../../package.json";
import { apiHandler } from "@/lib/security/api-handler";

export const GET = apiHandler(() => ({
  status: "ok",
  version: manifest.version,
}));
