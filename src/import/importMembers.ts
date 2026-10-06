import { validateMemberRow, type Member, type RawMemberRow } from "../domain/member.js";
import type { MemberStore } from "../storage/memberStore.js";

export interface RejectedRow {
  row: number;
  reason: string;
}

export interface ImportSummary {
  imported: number;
  updated: number;
  unchanged: number;
  rejected: RejectedRow[];
}

export function importMemberRows(
  rows: RawMemberRow[],
  store: MemberStore,
  referenceDate: Date = new Date(),
): ImportSummary {
  const rejected: RejectedRow[] = [];
  const resolvedByPartnerId = new Map<string, Member>();

  rows.forEach((row, index) => {
    const result = validateMemberRow(row, referenceDate);

    if (!result.valid) {
      rejected.push({ row: index + 1, reason: result.reason });
      return;
    }

    resolvedByPartnerId.set(result.member.partnerMemberId, result.member);
  });

  const summary: ImportSummary = { imported: 0, updated: 0, unchanged: 0, rejected };

  for (const member of resolvedByPartnerId.values()) {
    const outcome = store.upsert(member);

    if (outcome === "inserted") {
      summary.imported++;
    } else if (outcome === "updated") {
      summary.updated++;
    } else {
      summary.unchanged++;
    }
  }

  return summary;
}
