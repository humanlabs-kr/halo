export * from './schema/index';
export * from './client';

/**
 * Drizzle operators are re-exported here so nothing outside this package
 * imports `drizzle-orm` directly. One copy of drizzle, one version — an app
 * pulling in its own would build query fragments that fail `instanceof` checks
 * against ours.
 */
export {
  eq,
  ne,
  and,
  or,
  desc,
  asc,
  gt,
  gte,
  lt,
  lte,
  sql,
  inArray,
  notInArray,
  like,
  ilike,
  isNull,
  isNotNull,
  count,
  sum,
  aliasedTable,
} from 'drizzle-orm';
