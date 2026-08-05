import shared_eslint_config from "../obsidian-smart-env/eslint.base.mjs";

export default [
  ...shared_eslint_config,
  {
    files: ["src/**/*.js", "smart_env.config.js"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
];

