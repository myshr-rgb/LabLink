import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const requireNext = createRequire(import.meta.resolve("eslint-config-next"));
const { FlatCompat } = requireNext("@eslint/eslintrc");
const compat = new FlatCompat({
  baseDirectory: fileURLToPath(new URL(".", import.meta.url)),
});
function boundary(files, patterns) {
  return { files, rules: { "no-restricted-imports": ["error", { patterns }] } };
}
const modules = (...names) =>
  names.flatMap((name) => [`**/${name}`, `**/${name}/**`]);
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "test-results/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { rules: { "react/no-danger": "error" } },
  boundary(
    ["src/{app,components}/**/*.{ts,tsx}"],
    [...modules("db", "ai"), "better-sqlite3"],
  ),
  boundary(["src/services/**/*.ts"], modules("app", "components")),
  boundary(
    ["src/lib/{booking,allocation}/**/*.ts"],
    [...modules("db", "ai", "services"), "next", "next/*", "node:*"],
  ),
  {
    files: ["src/lib/{booking,allocation}/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now" },
        { object: "Math", property: "random" },
      ],
    },
  },
  boundary(["src/lib/db/**/*.ts"], modules("services", "ai")),
  boundary(["src/lib/ai/**/*.ts"], modules("services", "db")),
  boundary(["src/lib/security/**/*.ts"], modules("components")),
];
