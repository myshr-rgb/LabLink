import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

const paths = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
);
const bytes = [...new Set(paths.split("\0").filter(Boolean))].reduce(
  (sum, path) => sum + statSync(path).size,
  0,
);
process.stdout.write(`Repository files: ${bytes} bytes (budget 9000000)\n`);
if (bytes > 9_000_000) process.exitCode = 1;
