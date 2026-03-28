import * as XLSX from "xlsx";

export interface ExcelParseResult {
  sheetNames: string[];
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

// ─── Multi-sheet parsing for migration ──────────────────────────────────────

export type ParsedSheet = {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

export async function parseExcelFile(buffer: ArrayBuffer): Promise<ParsedSheet[]> {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheets: ParsedSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      raw: false,
    });

    if (jsonData.length === 0) continue;

    const headers = Object.keys(jsonData[0]);
    sheets.push({ sheetName, headers, rows: jsonData });
  }

  return sheets;
}

// ─── Original single-sheet parser ───────────────────────────────────────────

export function parseExcel(buffer: ArrayBuffer, sheetIndex = 0): ExcelParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetNames = workbook.SheetNames;

    if (sheetIndex >= sheetNames.length) {
      return { sheetNames, headers: [], rows: [], errors: ["Aba não encontrada"] };
    }

    const sheet = workbook.Sheets[sheetNames[sheetIndex]];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: "",
      raw: false,
    });

    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    const rows = jsonData.map((row) => {
      const mapped: Record<string, string> = {};
      for (const key of headers) {
        mapped[key] = String(row[key] ?? "");
      }
      return mapped;
    });

    return { sheetNames, headers, rows, errors: [] };
  } catch (err: any) {
    return {
      sheetNames: [],
      headers: [],
      rows: [],
      errors: [`Erro ao processar Excel: ${err.message}`],
    };
  }
}
