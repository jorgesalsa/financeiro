import Papa from "papaparse";

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

export function parseCSV(content: string, delimiter?: string): CSVParseResult {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    delimiter: delimiter || undefined,
    transformHeader: (header: string) => header.trim(),
  });

  return {
    headers: result.meta.fields || [],
    rows: result.data as Record<string, string>[],
    errors: result.errors.map((e) => `Linha ${e.row}: ${e.message}`),
  };
}
