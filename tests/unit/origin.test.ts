import { expect, it } from "vitest";
import { checkOrigin } from "@/lib/security/origin";
import { securityHeaders } from "@/lib/security/headers";

const app = "https://lab.example.edu";
it.each([
  ["", "lab.example.edu"],
  ["https://elsewhere.example.edu", "lab.example.edu"],
  [app, "wrong.example.edu"],
])("SEC-09 rejects mismatched origin or host", (origin, host) => {
  const request = new Request(app, {
    method: "POST",
    headers: { origin, host, "content-type": "application/json" },
  });
  expect(() => checkOrigin(request, app)).toThrow("Request origin");
});
it("SEC-10 production policy sets HSTS and requires nonced scripts", () => {
  const headers = securityHeaders("testnonce", true);
  expect(headers.get("Strict-Transport-Security")).toContain("max-age=");
  expect(headers.get("Content-Security-Policy")).toContain(
    "'nonce-testnonce' 'strict-dynamic'",
  );
  expect(headers.get("Content-Security-Policy")).not.toContain("'unsafe-eval'");
});
