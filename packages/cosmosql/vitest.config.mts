import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "vitest/config";

if (existsSync(".env")) {
	loadEnvFile(".env");
}

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		testTimeout: 60000,
		hookTimeout: 60000,
	},
});
