/**
 * D1/SQLite has no native array column type, so String[] Prisma fields became
 * JSON-encoded String columns during the Postgres -> D1 migration. These
 * helpers are the read/write boundary for that encoding.
 */
export function toJsonArray(arr: string[] | null | undefined): string {
  return JSON.stringify(arr ?? []);
}

export function fromJsonArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
