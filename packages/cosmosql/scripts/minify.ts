#!/usr/bin/env bun

/**
 * Minifies all JavaScript files in the dist directory
 * while preserving source maps
 */

import { build } from "esbuild";
import { readdir, stat } from "fs/promises";
import { join, dirname, extname } from "path";

async function getAllJsFiles(dir: string): Promise<string[]> {
	const files: string[] = [];
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await getAllJsFiles(fullPath)));
		} else if (entry.isFile() && extname(entry.name) === ".js") {
			files.push(fullPath);
		}
	}

	return files;
}

async function minifyFiles() {
	const distDir = join(process.cwd(), "dist");
	const jsFiles = await getAllJsFiles(distDir);

	console.log(`Minifying ${jsFiles.length} JavaScript files...`);

	for (const file of jsFiles) {
		const relativePath = file.replace(distDir + "/", "");
		const outfile = file; // Overwrite original

		try {
			await build({
				entryPoints: [file],
				outfile,
				format: "cjs",
				minify: true,
				sourcemap: "external", // Keep existing source map
				bundle: false,
				platform: "node",
				target: "node18",
				write: true,
				allowOverwrite: true,
			});

			console.log(`✓ Minified ${relativePath}`);
		} catch (error) {
			console.error(`✗ Failed to minify ${relativePath}:`, error);
			process.exit(1);
		}
	}

	console.log("✓ All files minified successfully");
}

minifyFiles().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});

