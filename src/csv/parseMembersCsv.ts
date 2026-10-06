import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import type { RawMemberRow } from "../domain/member.js";

export function parseMembersCsvContent(content: string): RawMemberRow[] {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawMemberRow[];
}

export function parseMembersCsvFile(filePath: string): RawMemberRow[] {
  return parseMembersCsvContent(readFileSync(filePath, "utf-8"));
}
