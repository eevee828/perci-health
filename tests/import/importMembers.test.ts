import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { importMemberRows } from "../../src/import/importMembers.js";
import { MemberStore } from "../../src/storage/memberStore.js";
import type { RawMemberRow } from "../../src/domain/member.js";

const referenceDate = new Date("2026-10-06T00:00:00Z");

function rawRow(overrides: Partial<RawMemberRow> = {}): RawMemberRow {
  return {
    partner_member_id: "P-001",
    first_name: "Jane",
    last_name: "Doe",
    date_of_birth: "1990-05-15",
    email: "jane.doe@example.com",
    policy_start: "2025-01-01",
    policy_end: "2025-12-31",
    ...overrides,
  };
}

let store: MemberStore;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "perci-health-import-"));
  store = new MemberStore(join(dir, "members.json"));
});

describe("importMemberRows", () => {
  it("reports correct counts and reasons for a mix of valid and invalid rows", () => {
    const rows = [
      rawRow({ partner_member_id: "P-001" }),
      rawRow({ partner_member_id: "P-002", email: "not-an-email" }),
      rawRow({ partner_member_id: "" }),
    ];

    const summary = importMemberRows(rows, store, referenceDate);

    expect(summary.imported).toBe(1);
    expect(summary.updated).toBe(0);
    expect(summary.unchanged).toBe(0);
    expect(summary.rejected).toEqual([
      { row: 2, reason: "email is not a valid email address" },
      { row: 3, reason: "partner_member_id is required" },
    ]);
  });

  it("creates zero new records when the same import runs twice", () => {
    const rows = [rawRow()];

    const first = importMemberRows(rows, store, referenceDate);
    expect(first.imported).toBe(1);

    const second = importMemberRows(rows, store, referenceDate);
    expect(second.imported).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(1);
  });

  it("resolves two rows sharing a partner_member_id to one record, using the last occurrence", () => {
    const rows = [
      rawRow({ partner_member_id: "P-001", email: "first@example.com" }),
      rawRow({ partner_member_id: "P-001", email: "second@example.com" }),
    ];

    const summary = importMemberRows(rows, store, referenceDate);

    expect(summary.imported).toBe(1);
    expect(summary.rejected).toEqual([]);
    expect(store.get("P-001")?.email).toBe("second@example.com");
  });
});
