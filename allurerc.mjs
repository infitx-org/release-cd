import { defineConfig } from "allure";

import config from './config.mjs';

export default defineConfig({
  name: config.report.name || "report",
  historyPath: "", // todo https://github.com/allure-framework/allure3/issues/354
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
