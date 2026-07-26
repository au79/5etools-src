export interface SourceReference {
  readonly page?: number;
  readonly source: string;
}

export interface CommonRecordShape {
  readonly additionalSources?: readonly SourceReference[];
  readonly edition?: string;
  readonly entries?: readonly Entry[];
  readonly name: string;
  readonly otherSources?: readonly SourceReference[];
  readonly page?: number;
  readonly reprintedAs?: readonly string[];
  readonly source: string;
}

export interface EntryContainer {
  readonly entries?: readonly Entry[];
  readonly items?: readonly Entry[];
  readonly name?: string;
  readonly type: string;
}

export type Entry = string | EntryContainer;

export function walkEntries(entries: readonly Entry[], visitText: (text: string) => void): void {
  for (const entry of entries) {
    if (typeof entry === 'string') {
      visitText(entry);
      continue;
    }
    if (entry.entries !== undefined) walkEntries(entry.entries, visitText);
    if (entry.items !== undefined) walkEntries(entry.items, visitText);
  }
}
