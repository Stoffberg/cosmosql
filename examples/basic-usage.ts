import { createClient, container, field } from 'cosmosql';

const users = container('users', {
  id: field.string(),
  email: field.string(),
  name: field.string(),
  age: field.number(),
  isActive: field.boolean().default(true),
  createdAt: field.date()
}).partitionKey('email');

const db = createClient({
  connectionString: process.env.COSMOS_CONNECTION_STRING!,
  database: 'example'
}).withContainers({ users });

async function main() {
  // Create user
  const user = await db.users.create({
    data: {
      id: 'user_1',
      email: 'john@example.com',
      name: 'John Doe',
      age: 30,
      createdAt: new Date()
    }
  });

  console.log('Created user:', user);

  // Find user
  const found = await db.users.findUnique({
    where: { id: 'user_1', email: 'john@example.com' }
  });

  console.log('Found user:', found);

  // Update user
  await db.users.update({
    where: { id: 'user_1', email: 'john@example.com' },
    data: { age: 31 }
  });

  // Delete user
  await db.users.delete({
    where: { id: 'user_1', email: 'john@example.com' }
  });
}

main().catch(console.error);

