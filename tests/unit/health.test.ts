import { expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { version } from "../../package.json";

it("F-72 returns the package version and health status", async () => {
  const response = GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", version });
});
