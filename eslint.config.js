const { defineConfig } = require("eslint/config");
const expoFlatConfig = require("eslint-config-expo/flat");

const GLOBAL_IGNORES = [
  "dist/*",

  ".expo",
  ".expo/**",
  "./.expo/**",
  ".expo/types/**",
  "./.expo/types/**",
  ".expo/types/router.d.ts",
  "./.expo/types/router.d.ts",
  ".expo/types/**/*.d.ts",
  "./.expo/types/**/*.d.ts",

  "**/.expo/**",
  "**/.expo/types/**",
  "**/.expo/types/router.d.ts",
  "**/.expo/types/**/*.d.ts",
];

const expoConfigs = (Array.isArray(expoFlatConfig) ? expoFlatConfig : [expoFlatConfig]).map(
  (config) => ({
    ...config,
    ignores: [...(config.ignores ?? []), ...GLOBAL_IGNORES],
    linterOptions: {
      ...(config.linterOptions ?? {}),
      reportUnusedDisableDirectives: "off",
    },
  })
);

module.exports = defineConfig([
  {
    ignores: [
      ".expo",
      ".expo/**",
      "**/.expo/**",
      ".expo/types/**",
      "**/.expo/types/**",
      ".expo/types/router.d.ts",
      "**/.expo/types/router.d.ts",
      "expo/types/**",
      "**/expo/types/**",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    files: [".expo/types/router.d.ts", "**/.expo/types/router.d.ts", "expo/types/router.d.ts", "**/expo/types/router.d.ts"],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    ignores: GLOBAL_IGNORES,
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  ...expoConfigs,
  {
    ignores: GLOBAL_IGNORES,
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    ignores: [
      ".expo/types/router.d.ts",
      ".expo/types/**/*.d.ts",
      "**/.expo/types/router.d.ts",
      "**/.expo/types/**/*.d.ts",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    files: ["**/*"],
    ignores: GLOBAL_IGNORES,
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    files: [".expo/types/router.d.ts", "./.expo/types/router.d.ts", ".expo/types/**/*.d.ts", "./.expo/types/**/*.d.ts", "**/.expo/types/router.d.ts", "**/.expo/types/**/*.d.ts"],
    ignores: GLOBAL_IGNORES,
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
]);
