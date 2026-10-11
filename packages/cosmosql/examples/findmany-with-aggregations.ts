/**
 * Example: Using findMany with Aggregations
 * 
 * This example demonstrates how to use the new aggregate parameter in findMany
 * to fetch data along with aggregated statistics in a single, efficient query.
 */

import { createClient } from "../src";
import { container, field } from "../src/schema";

// Example schema
const userSchema = container("users", {
	id: field.string(),
	email: field.string(),
	name: field.string(),
	age: field.number(),
	score: field.number().optional(),
	isActive: field.boolean(),
	createdAt: field.date(),
}).partitionKey("email");

async function examples() {
	const db = createClient({
		endpoint: process.env.COSMOS_ENDPOINT!,
		key: process.env.COSMOS_KEY!,
		database: "my-database",
	});

	const { users } = await db.withContainers({
		users: userSchema,
	});

	// Example 1: Get users with count
	const result1 = await users.findMany({
		partitionKey: "john@example.com",
		where: { isActive: true },
		aggregate: {
			_count: true,
		},
	});
	
	console.log(`Found ${result1._count} active users`);
	console.log(`Users:`, result1.data);
	// Type: { data: User[], _count: number }

	// Example 2: Get users with average age
	const result2 = await users.findMany({
		partitionKey: "john@example.com",
		aggregate: {
			_avg: { age: true },
		},
	});
	
	console.log(`Average age: ${result2._avg.age}`);
	console.log(`Users:`, result2.data);
	// Type: { data: User[], _avg: { age: number | null } }

	// Example 3: Multiple aggregations
	const result3 = await users.findMany({
		partitionKey: "john@example.com",
		where: { isActive: true },
		aggregate: {
			_count: true,
			_avg: { age: true, score: true },
			_min: { age: true },
			_max: { age: true },
		},
	});
	
	console.log(`Stats for active users:`);
	console.log(`  Total: ${result3._count}`);
	console.log(`  Average age: ${result3._avg.age}`);
	console.log(`  Average score: ${result3._avg.score}`);
	console.log(`  Min age: ${result3._min.age}`);
	console.log(`  Max age: ${result3._max.age}`);
	console.log(`Users:`, result3.data);

	// Example 4: With select (only specific fields)
	const result4 = await users.findMany({
		partitionKey: "john@example.com",
		select: {
			id: true,
			name: true,
			age: true,
		},
		aggregate: {
			_count: true,
			_avg: { age: true },
		},
	});
	
	console.log(`Found ${result4._count} users with average age ${result4._avg.age}`);
	console.log(`Selected users:`, result4.data); // Only contains id, name, age
	// Type: { data: Array<{id: string, name: string, age: number}>, _count: number, _avg: { age: number | null } }

	// Example 5: With pagination - data is paginated, aggregations count all
	const result5 = await users.findMany({
		partitionKey: "john@example.com",
		take: 10, // Only get first 10 users
		skip: 0,
		aggregate: {
			_count: true, // But count ALL users matching the query
		},
	});
	
	console.log(`Showing ${result5.data.length} of ${result5._count} total users`);

	// Example 6: Cross-partition query with aggregations
	const result6 = await users.findMany({
		enableCrossPartitionQuery: true,
		where: {
			isActive: true,
		},
		aggregate: {
			_count: true,
			_avg: { age: true },
		},
	});
	
	console.log(`Total active users across all partitions: ${result6._count}`);
	console.log(`Average age: ${result6._avg.age}`);

	// Example 7: Sum aggregation
	const result7 = await users.findMany({
		partitionKey: "john@example.com",
		aggregate: {
			_sum: { score: true },
		},
	});
	
	console.log(`Total score: ${result7._sum.score}`);

	// Example 8: Without aggregation - returns plain array (backward compatible)
	const users8 = await users.findMany({
		partitionKey: "john@example.com",
		where: { isActive: true },
	});
	
	// Type: User[] (plain array, not an object with 'data' property)
	console.log(`Users:`, users8);
}

// Run examples
if (import.meta.main) {
	examples().catch(console.error);
}

