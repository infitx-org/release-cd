import { defineConfig } from "allure";

import config from './config.mjs';

export default defineConfig({
  name: config.report.name || "report",
  output: "./allure-report",
  plugins: {
    awesome: {
      options: {
        singleFile: true,
        reportLanguage: "en",
      },
    },
  },
});
