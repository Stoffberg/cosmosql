import { QueryBuilder } from '../../src/query/query-builder';

describe('QueryBuilder', () => {
  test('builds simple query', () => {
    const builder = new QueryBuilder();
    builder.where({ age: 18 });

    const { query, parameters } = builder.build();

    expect(query).toContain('WHERE');
    expect(query).toContain('c.age');
    expect(parameters).toHaveLength(1);
    expect(parameters[0].value).toBe(18);
  });

  test('builds query with operators', () => {
    const builder = new QueryBuilder();
    builder.where({ age: { gte: 18, lte: 65 } });

    const { query, parameters } = builder.build();

    expect(query).toContain('>=');
    expect(query).toContain('<=');
    expect(parameters).toHaveLength(2);
  });

  test('adds ORDER BY', () => {
    const builder = new QueryBuilder();
    builder.orderBy({ age: 'desc' });

    const { query } = builder.build();

    expect(query).toContain('ORDER BY c.age DESC');
  });

  test('adds LIMIT and OFFSET', () => {
    const builder = new QueryBuilder();
    builder.take(10).skip(20);

    const { query } = builder.build();

    expect(query).toContain('OFFSET 20');
    expect(query).toContain('LIMIT 10');
  });
});

