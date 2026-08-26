import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "tmp/**",
    "qa_*/**",
    "work_cv/**",
    "anil_3d_model/**",
    "anil_enes_scene/**",
    "3d enes/**",
    "deliverables/**",
    "output/**",
    "scripts/**",
    "*.js",
  ]),
]);
