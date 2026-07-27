import { type Catalog, type CatalogRecord } from './catalog.js';
import { type CatalogCollection } from './validation.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface SearchCatalogOptions {
  readonly domain?: CatalogCollection | undefined;
  readonly limit?: number | undefined;
  readonly query: string;
  readonly source?: string | undefined;
  readonly sourceRoot?: string | undefined;
}

export interface GetCatalogOptions {
  readonly abbreviation?: string | undefined;
  readonly domain?: CatalogCollection | undefined;
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly source?: string | undefined;
  readonly sourceRoot?: string | undefined;
}

export interface QueryCandidate {
  readonly domain: CatalogCollection;
  readonly id: string;
  readonly source: string;
  readonly sourceRoot: string;
}

export class QueryError extends Error {
  constructor(
    message: string,
    readonly candidates: readonly QueryCandidate[] = [],
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

function normalize(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase();
}

function requireQuery(value: string): string {
  const normalized = normalize(value);
  if (normalized.length === 0) throw new QueryError('A non-empty query is required.');
  if (normalized.length > 200) throw new QueryError('Query must be at most 200 characters.');
  return normalized;
}

function getLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new QueryError(`Limit must be an integer from 1 to ${MAX_LIMIT}.`);
  }
  return limit;
}

function matchesFilters(record: CatalogRecord, options: Omit<SearchCatalogOptions, 'limit' | 'query'>): boolean {
  return (
    (options.domain === undefined || record.domain === options.domain) &&
    (options.source === undefined || record.source === options.source) &&
    (options.sourceRoot === undefined || record.sourceRoot === options.sourceRoot)
  );
}

function getCandidate(record: CatalogRecord): QueryCandidate {
  return { domain: record.domain, id: record.id, source: record.source, sourceRoot: record.sourceRoot };
}

function order(records: readonly CatalogRecord[]): CatalogRecord[] {
  return [...records].sort((left, right) => left.id.localeCompare(right.id));
}

function getSearchRank(record: CatalogRecord, query: string): number {
  const name = normalize(record.name);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  return 3;
}

function orderSearchResults(records: readonly CatalogRecord[], query: string): CatalogRecord[] {
  return [...records].sort(
    (left, right) => getSearchRank(left, query) - getSearchRank(right, query) || left.id.localeCompare(right.id),
  );
}

export function searchCatalog(catalog: Catalog, options: SearchCatalogOptions): readonly CatalogRecord[] {
  const query = requireQuery(options.query);
  const limit = getLimit(options.limit);

  return orderSearchResults(
    catalog.records.filter((record) => {
      if (!matchesFilters(record, options)) return false;
      const indexedText = catalog.searchIndex?.get(record.id) ?? JSON.stringify(record.data).toLocaleLowerCase();
      return normalize(record.name).includes(query) || indexedText.includes(query);
    }),
    query,
  ).slice(0, limit);
}

export function getCatalogRecord(catalog: Catalog, options: GetCatalogOptions): CatalogRecord | undefined {
  if (options.id !== undefined) return catalog.records.find((record) => record.id === options.id);
  if (options.domain === undefined || (options.name === undefined && options.abbreviation === undefined)) {
    throw new QueryError('Provide an ID or a domain with a name or abbreviation for exact retrieval.');
  }

  const matches = order(
    catalog.records.filter(
      (record) =>
        record.domain === options.domain &&
        (options.name === undefined || record.name === options.name) &&
        (options.abbreviation === undefined || record.data.abbreviation === options.abbreviation) &&
        (options.source === undefined || record.source === options.source) &&
        (options.sourceRoot === undefined || record.sourceRoot === options.sourceRoot),
    ),
  );
  if (matches.length < 2) return matches[0];
  throw new QueryError(
    `Exact retrieval is ambiguous for ${options.domain}/${options.name ?? options.abbreviation}.`,
    matches.map(getCandidate),
  );
}
