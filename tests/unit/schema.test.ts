import { field, container } from '../../src/schema';

describe('Schema Definition', () => {
  test('creates basic schema', () => {
    const users = container('users', {
      id: field.string(),
      email: field.string(),
      age: field.number()
    });

    expect(users.name).toBe('users');
  });

  test('handles partition keys', () => {
    const users = container('users', {
      id: field.string(),
      email: field.string()
    }).partitionKey('email');

    expect(users.partitionKeyField).toBe('email');
  });

  test('supports optional fields', () => {
    const users = container('users', {
      id: field.string(),
      name: field.string().optional()
    });

    expect(users.schema.name.optional).toBe(true);
  });

  test('supports default values', () => {
    const users = container('users', {
      id: field.string(),
      isActive: field.boolean().default(true)
    });

    expect(users.schema.isActive.default).toBe(true);
  });

  test('supports nested objects', () => {
    const users = container('users', {
      id: field.string(),
      address: field.object({
        street: field.string(),
        city: field.string()
      })
    });

    expect(users.schema.address.type).toBe('object');
  });

  test('supports arrays', () => {
    const users = container('users', {
      id: field.string(),
      tags: field.array(field.string())
    });

    expect(users.schema.tags.type).toBe('array');
  });
});

