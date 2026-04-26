import * as XLSX from "xlsx";

export type ImportedParticipant = {
  name: string;
  phone: string;
};

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function normalizePhoneDigits(s: string) {
  return s.replace(/\D/g, "");
}

function isProbablyCsvSeparatorLine(line: string) {
  const comma = (line.match(/,/g) ?? []).length;
  const semicolon = (line.match(/;/g) ?? []).length;
  return { comma, semicolon };
}

export async function importParticipantsFromFile(file: File): Promise<ImportedParticipant[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const wsName = wb.SheetNames[0];
    const ws = wsName ? wb.Sheets[wsName] : undefined;
    if (!ws) return [];

    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, blankrows: false });
    // rows: Array<Array<cell>>
    const out: ImportedParticipant[] = [];
    for (const r of rows) {
      const a = r?.[0] ?? "";
      const b = r?.[1] ?? "";
      const n = normalizeName(String(a ?? ""));
      const p = normalizePhoneDigits(String(b ?? ""));
      if (!n) continue;
      out.push({ name: n, phone: p });
    }
    return out;
  }

  if (name.endsWith(".csv")) {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const { comma, semicolon } = isProbablyCsvSeparatorLine(lines[0]);
    const sep = semicolon > comma ? ";" : ",";

    const out: ImportedParticipant[] = [];
    for (const line of lines) {
      const parts = line.split(sep);
      const n = normalizeName(String(parts[0] ?? ""));
      const p = normalizePhoneDigits(String(parts[1] ?? ""));
      if (!n) continue;
      out.push({ name: n, phone: p });
    }
    return out;
  }

  return [];
}

