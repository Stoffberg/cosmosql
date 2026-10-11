/**
 * Advanced Features Example
 * 
 * This example demonstrates the new bulk operations, migrations,
 * and database/container management features.
 */

import { container, createClient, defineMigration, field } from "../src";

// ═══════════════════════════════════════════════════════════
// 1. Define Schema
// ═══════════════════════════════════════════════════════════

const users = container("users", {
	id: field.string(),
	email: field.string(),
	name: field.string(),
	isActive: field.boolean().optional(),
	status: field.string().optional(),
	createdAt: field.date(),
	preferences: field
		.object({
			theme: field.string(),
			notifications: field.boolean(),
		})
		.optional(),
}).partitionKey("email");

const posts = container("posts", {
	id: field.string(),
	userId: field.string(),
	title: field.string(),
	content: field.string(),
	published: field.boolean(),
	createdAt: field.date(),
}).partitionKey("userId");

// ═══════════════════════════════════════════════════════════
// 2. Define Migrations
// ═══════════════════════════════════════════════════════════

const migration1 = defineMigration({
	version: 1,
	name: "add-user-preferences",
	description: "Add preferences object to all users",

	async up({ db, logger, progress }) {
		logger.info("Adding preferences to users...");

		const result = await db.users.updateMany({
			where: {},
			data: (doc: any) => ({
				preferences: {
					theme: "light",
					notifications: true,
				},
			}),
			enableCrossPartitionQuery: true,
			onProgress: progress.track("users"),
		});

		logger.info(`Updated ${result.updated} users`);
	},

	async down({ db, logger }) {
		logger.info("Removing preferences from users...");

		await db.users.updateMany({
			where: {},
			data: { preferences: undefined },
			enableCrossPartitionQuery: true,
		});
	},
});

const migration2 = defineMigration({
	version: 2,
	name: "archive-inactive-users",
	description: "Mark inactive users",

	async up({ db, logger }) {
		logger.info("Archiving inactive users...");

		const result = await db.users.updateMany({
			where: { isActive: false },
			data: { status: "archived" },
			enableCrossPartitionQuery: true,
		});

		logger.info(`Archived ${result.updated} users`);
	},

	async down({ db }) {
		await db.users.updateMany({
			where: { status: "archived" },
			data: { status: "active" },
			enableCrossPartitionQuery: true,
		});
	},
});

// ═══════════════════════════════════════════════════════════
// 3. Initialize Client with Migrations
// ═══════════════════════════════════════════════════════════

async function main() {
	const db = await createClient({
		connectionString: process.env.COSMOS_CONNECTION_STRING!,
		database: "advanced-demo",
		mode: "auto-create",
		migrations: [migration1, migration2],
	}).withContainers({
		users,
		posts,
	});

	// ═══════════════════════════════════════════════════════════
	// 4. Bulk Operations
	// ═══════════════════════════════════════════════════════════

	console.log("\n📦 Bulk Operations Demo");
	console.log("========================\n");

	// Bulk update with static data
	const updateResult1 = await db.users.updateMany({
		where: { isActive: false },
		data: { status: "archived" },
		enableCrossPartitionQuery: true,
		onProgress: (stats) => {
			console.log(
				`Progress: ${stats.percentage}% - ${stats.updated}/${stats.total} updated (${stats.ruConsumed.toFixed(2)} RU)`,
			);
		},
	});

	console.log(`\n✅ Updated ${updateResult1.updated} users`);
	console.log(`   Failed: ${updateResult1.failed}`);
	console.log(`   RU Consumed: ${updateResult1.performance.ruConsumed.toFixed(2)}`);
	console.log(`   Duration: ${updateResult1.performance.durationMs}ms`);

	// Bulk update with function (dynamic)
	const updateResult2 = await db.users.updateMany({
		where: { email: { contains: "@old.com" } },
		data: (doc) => ({
			email: doc.email.replace("@old.com", "@new.com"),
			migratedAt: new Date(),
		}),
		enableCrossPartitionQuery: true,
		batchSize: 25,
		maxConcurrency: 3,
	});

	console.log(`\n✅ Migrated ${updateResult2.updated} email addresses`);

	// Bulk delete
	const oneYearAgo = new Date();
	oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

	const deleteResult = await db.posts.deleteMany({
		where: { published: false },
		confirm: true, // Safety: must explicitly confirm
		enableCrossPartitionQuery: true,
		onProgress: (stats) => {
			console.log(`Deleting: ${stats.percentage}% complete`);
		},
	});

	console.log(`\n🗑️  Deleted ${deleteResult.deleted} old posts`);
	console.log(`   RU Consumed: ${deleteResult.performance.ruConsumed.toFixed(2)}`);

	// ═══════════════════════════════════════════════════════════
	// 5. Migrations
	// ═══════════════════════════════════════════════════════════

	if (db.migrations) {
		console.log("\n🔄 Migrations Demo");
		console.log("==================\n");

		// Check migration status
		const status = await db.migrations.status();
		console.log(`Current version: ${status.current?.version || "none"}`);
		console.log(`Pending migrations: ${status.pending.length}`);

		if (status.pending.length > 0) {
			// Plan migrations (dry-run)
			const plan = await db.migrations.plan({ dryRun: true });
			console.log(`\nWill apply ${plan.migrationsToApply.length} migrations:`);
			for (const migration of plan.migrationsToApply) {
				console.log(`  - v${migration.version}: ${migration.name}`);
				console.log(`    Estimated: ${migration.estimatedRU} RU, ${migration.estimatedDuration}`);
			}

			if (plan.warnings.length > 0) {
				console.log("\n⚠️  Warnings:");
				for (const warning of plan.warnings) {
					console.log(`  - ${warning}`);
				}
			}

			// Apply migrations
			console.log("\n⏳ Applying migrations...\n");
			const result = await db.migrations.apply({
				target: "latest",
				confirm: true,
				onProgress: (p) => {
					console.log(
						`[Migration ${p.migration.version}] ${p.status} - ${p.percentage}% (${p.ruConsumed.toFixed(2)} RU)`,
					);
				},
			});

			console.log(`\n✅ Applied ${result.applied.length} migrations`);
			console.log(`   Total RU: ${result.performance.totalRuConsumed.toFixed(2)}`);
			console.log(`   Duration: ${result.performance.totalDurationMs}ms`);
		}

		// Rollback example (commented out for safety)
		// await db.migrations.rollback({
		//   to: 1,
		//   confirm: true,
		//   onProgress: (p) => {
		//     console.log(`Rollback: ${p.migration.name} - ${p.status}`);
		//   }
		// });
	}

	// ═══════════════════════════════════════════════════════════
	// 6. Database & Container Management
	// ═══════════════════════════════════════════════════════════

	console.log("\n🔧 Management Demo");
	console.log("==================\n");

	// Get detailed database info
	const dbInfo = await db.management.getDatabaseInfo();
	console.log(`Database: ${dbInfo.id}`);
	console.log(`Containers: ${dbInfo.containersCount}`);
	console.log(`Total documents: ${dbInfo.storage.totalDocuments.toLocaleString()}`);
	console.log(`Storage: ${dbInfo.storage.totalSizeGB.toFixed(2)} GB`);

	console.log("\nContainer Details:");
	for (const container of dbInfo.containers) {
		console.log(`\n📦 ${container.id}`);
		console.log(`   Documents: ${container.statistics.documentCount.toLocaleString()}`);
		console.log(`   Partition Key: ${container.partitionKey.paths[0]}`);
		console.log(`   Schema Registered: ${container.schema?.registered ? "Yes" : "No"}`);
	}

	// Health check
	console.log("\n🏥 Health Check:");
	const health = await db.management.healthCheck();
	console.log(`Overall Health: ${health.overallHealth.toUpperCase()}`);

	for (const containerHealth of health.containers) {
		const icon = containerHealth.healthy ? "✅" : "⚠️";
		console.log(`${icon} ${containerHealth.container}`);

		if (containerHealth.issues.length > 0) {
			for (const issue of containerHealth.issues) {
				console.log(`   [${issue.severity}] ${issue.message}`);
				if (issue.recommendation) {
					console.log(`   💡 ${issue.recommendation}`);
				}
			}
		}
	}

	// Schema diff
	console.log("\n📊 Schema Diff:");
	const diff = await db.management.diffSchema();

	if (diff.requiresAction) {
		console.log("⚠️  Schema drift detected!");

		if (diff.containers.orphaned.length > 0) {
			console.log(`\nOrphaned containers: ${diff.containers.orphaned.join(", ")}`);
		}

		if (diff.containers.missing.length > 0) {
			console.log(`\nMissing containers: ${diff.containers.missing.join(", ")}`);
		}

		if (diff.containers.modified.length > 0) {
			console.log("\nModified containers:");
			for (const mod of diff.containers.modified) {
				console.log(`  - ${mod.container}`);
				console.log(`    Differences: ${JSON.stringify(mod.differences, null, 2)}`);
			}
		}
	} else {
		console.log("✅ Schema is in sync with database");
	}

	// List orphaned containers
	const orphaned = await db.management.listOrphanedContainers();
	if (orphaned.length > 0) {
		console.log(`\n🧹 Found ${orphaned.length} orphaned containers: ${orphaned.join(", ")}`);

		// Prune orphaned containers (dry run first)
		const prunePreview = await db.management.pruneContainers({
			confirm: false,
			dryRun: true,
		});
		console.log(`Would delete: ${prunePreview.pruned.join(", ")}`);

		// Actually prune (commented out for safety)
		// await db.management.pruneContainers({
		//   confirm: true,
		//   exclude: ['keep-this-one']
		// });
	}

	console.log("\n✅ Demo complete!");
}

// Run the demo
main().catch(console.error);

