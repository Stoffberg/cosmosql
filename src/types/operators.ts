// Where clause operators
export type StringOperators = {
  equals?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
};

export type NumberOperators = {
  equals?: number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
};

export type BooleanOperators = {
  equals?: boolean;
};

export type ArrayOperators<T> = {
  contains?: T;
  containsAny?: T[];
  containsAll?: T[];
};

// Where clause type
export type WhereInput<T> = {
  [K in keyof T]?: 
    T[K] extends string ? string | StringOperators :
    T[K] extends number ? number | NumberOperators :
    T[K] extends boolean ? boolean | BooleanOperators :
    T[K] extends Array<infer U> ? ArrayOperators<U> :
    T[K] extends object ? WhereInput<T[K]> :
    T[K];
};

// Select clause type
export type SelectInput<T> = {
  [K in keyof T]?: 
    T[K] extends object 
      ? boolean | SelectInput<T[K]>
      : boolean;
};

// Order by type
export type OrderByInput<T> = {
  [K in keyof T]?: 'asc' | 'desc';
};

// Apply select to result type
export type SelectResult<T, S extends SelectInput<T>> = {
  [K in keyof S as S[K] extends false ? never : K]: 
    S[K] extends object
      ? K extends keyof T
        ? T[K] extends object
          ? SelectResult<T[K], S[K] & SelectInput<T[K]>>
          : T[K]
        : never
      : K extends keyof T
        ? T[K]
        : never
};

