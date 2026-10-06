import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { parseMembersCsvFile } from "../../src/csv/parseMembersCsv.js";
import { importMemberRows } from "../../src/import/importMembers.js";
import { MemberStore } from "../../src/storage/memberStore.js";
import { createApp } from "../../src/server/createApp.js";

const SAMPLE_CSV_PATH = join(process.cwd(), "data", "sample.csv");
const referenceDate = new Date("2026-10-06T00:00:00Z");

let store: MemberStore;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "perci-health-sample-"));
  store = new MemberStore(join(dir, "members.json"));
});

describe("data/sample.csv end to end", () => {
  it("imports the valid rows, resolves the in-file duplicate, and rejects the broken rows", () => {
    const rows = parseMembersCsvFile(SAMPLE_CSV_PATH);
    const summary = importMemberRows(rows, store, referenceDate);

    expect(summary.imported).toBe(4);
    expect(summary.updated).toBe(0);
    expect(summary.unchanged).toBe(0);
    expect(summary.rejected).toEqual([
      { row: 6, reason: "first_name is required" },
      { row: 7, reason: "must be a real calendar date in YYYY-MM-DD format" },
      { row: 8, reason: "email is not a valid email address" },
      { row: 9, reason: "policy_end cannot be before policy_start" },
    ]);

    expect(store.get("P-1004")?.email).toBe("dan.new@example.com");
    expect(store.get("P-2001")).toBeUndefined();
  });

  it("is idempotent on a second import of the same file", () => {
    const rows = parseMembersCsvFile(SAMPLE_CSV_PATH);

    importMemberRows(rows, store, referenceDate);
    const second = importMemberRows(rows, store, referenceDate);

    expect(second.imported).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(4);
  });

  it("makes imported members reachable through the lookup endpoint", async () => {
    const rows = parseMembersCsvFile(SAMPLE_CSV_PATH);
    importMemberRows(rows, store, referenceDate);
    const app = createApp(store);

    const found = await request(app).get("/members/P-1001");
    expect(found.status).toBe(200);
    expect(found.body.email).toBe("alice.johnson@example.com");

    const rejectedId = await request(app).get("/members/P-2001");
    expect(rejectedId.status).toBe(404);
  });
});
