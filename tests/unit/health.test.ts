import { expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { version } from "../../package.json";

it("F-72 returns the package version and health status", async () => {
  const response = await GET(new Request("http://localhost/api/health"), {
    params: Promise.resolve({}),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ data: { status: "ok", version } });
});
