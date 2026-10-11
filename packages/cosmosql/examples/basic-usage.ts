import { container, createClient, field } from "../src";

const users = container("users", {
	id: field.string(),
	email: field.string(),
	name: field.string(),
	age: field.number(),
	isActive: field.boolean().default(true),
	createdAt: field.date(),
}).partitionKey("email");

async function main() {
	const db = await createClient({
		connectionString: process.env.COSMOS_CONNECTION_STRING,
		database: "example",
		mode: "auto-create", // Automatically create database and containers if they don't exist
	}).withContainers({ users });
	// Create user
	const user = await db.users.create({
		data: {
			id: "user_1",
			email: "john@example.com",
			name: "John Doe",
			age: 30,
			createdAt: new Date(),
		},
	});

	console.log("Created user:", user);

	// Find user
	const found = await db.users.findUnique({
		where: { id: "user_1", email: "john@example.com" },
	});

	console.log("Found user:", found);

	// Update user
	await db.users.update({
		where: { id: "user_1", email: "john@example.com" },
		data: { age: 31 },
	});

	// Delete user
	await db.users.delete({
		where: { id: "user_1", email: "john@example.com" },
	});
}

main().catch(console.error);
