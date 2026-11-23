import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: { "/*": ["./src/lib/db/schema.sql"] },
  poweredByHeader: false,
};
export default config;
