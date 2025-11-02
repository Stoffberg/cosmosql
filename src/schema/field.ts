import type { FieldConfig } from '../types';

class FieldBuilder<T = any> {
  constructor(private config: FieldConfig<T>) {}

  optional(): FieldBuilder<T | undefined> {
    return new FieldBuilder({ ...this.config, optional: true });
  }

  default(value: T): FieldBuilder<T> {
    return new FieldBuilder({ ...this.config, default: value });
  }

  getConfig(): FieldConfig<T> {
    return this.config;
  }
}

export const field = {
  string: () => new FieldBuilder<string>({ type: 'string' }),

  number: () => new FieldBuilder<number>({ type: 'number' }),

  boolean: () => new FieldBuilder<boolean>({ type: 'boolean' }),

  date: () => new FieldBuilder<Date>({ type: 'date' }),
  
  array: <T>(itemType: FieldBuilder<T>) => 
    new FieldBuilder<T[]>({ 
      type: 'array', 
      array: itemType.getConfig() 
    }),
  
  object: <S extends Record<string, FieldBuilder>>(schema: S) => {
    const objectSchema: Record<string, FieldConfig> = {};
    for (const [key, builder] of Object.entries(schema)) {
      objectSchema[key] = builder.getConfig();
    }
    return new FieldBuilder<any>({ 
      type: 'object', 
      objectSchema 
    });
  }
};

