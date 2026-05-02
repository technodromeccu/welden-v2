import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".claude/**",
      ".claire/**"
    ]
  },
  ...nextVitals
];

export default eslintConfig;
