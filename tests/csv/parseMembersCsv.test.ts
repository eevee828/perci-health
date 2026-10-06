import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMembersCsvContent, parseMembersCsvFile } from "../../src/csv/parseMembersCsv.js";

const HEADER =
  "partner_member_id,first_name,last_name,date_of_birth,email,policy_start,policy_end";

describe("parseMembersCsvContent", () => {
  it("parses a well-formed CSV into one row object per data line", () => {
    const csv = [
      HEADER,
      "P-001,Jane,Doe,1990-05-15,jane@example.com,2025-01-01,2025-12-31",
      "P-002,John,Smith,1985-03-20,john@example.com,2025-02-01,",
    ].join("\n");

    expect(parseMembersCsvContent(csv)).toEqual([
      {
        partner_member_id: "P-001",
        first_name: "Jane",
        last_name: "Doe",
        date_of_birth: "1990-05-15",
        email: "jane@example.com",
        policy_start: "2025-01-01",
        policy_end: "2025-12-31",
      },
      {
        partner_member_id: "P-002",
        first_name: "John",
        last_name: "Smith",
        date_of_birth: "1985-03-20",
        email: "john@example.com",
        policy_start: "2025-02-01",
        policy_end: "",
      },
    ]);
  });

  it("handles a quoted field containing a comma", () => {
    const csv = [
      HEADER,
      'P-003,Alex,"Smith, Jr.",1992-07-01,alex@example.com,2025-01-01,2025-12-31',
    ].join("\n");

    expect(parseMembersCsvContent(csv)).toEqual([
      {
        partner_member_id: "P-003",
        first_name: "Alex",
        last_name: "Smith, Jr.",
        date_of_birth: "1992-07-01",
        email: "alex@example.com",
        policy_start: "2025-01-01",
        policy_end: "2025-12-31",
      },
    ]);
  });

  it("parses a header-only file to zero rows without error", () => {
    expect(parseMembersCsvContent(HEADER)).toEqual([]);
  });
});

describe("parseMembersCsvFile", () => {
  it("reads and parses a CSV file from disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "perci-health-"));
    const filePath = join(dir, "members.csv");
    writeFileSync(
      filePath,
      [
        HEADER,
        "P-001,Jane,Doe,1990-05-15,jane@example.com,2025-01-01,2025-12-31",
      ].join("\n"),
    );

    expect(parseMembersCsvFile(filePath)).toEqual([
      {
        partner_member_id: "P-001",
        first_name: "Jane",
        last_name: "Doe",
        date_of_birth: "1990-05-15",
        email: "jane@example.com",
        policy_start: "2025-01-01",
        policy_end: "2025-12-31",
      },
    ]);
  });
});
