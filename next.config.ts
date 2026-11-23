import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: { "/api/*": ["./src/lib/db/schema.sql"] },
  poweredByHeader: false,
};
export default config;
