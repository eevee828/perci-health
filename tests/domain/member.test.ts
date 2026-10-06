import { describe, expect, it } from "vitest";
import { validateMemberRow, type RawMemberRow } from "../../src/domain/member.js";

const referenceDate = new Date("2026-10-06T00:00:00Z");

function validRow(overrides: Partial<RawMemberRow> = {}): RawMemberRow {
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

describe("validateMemberRow", () => {
  it("accepts a fully valid row", () => {
    const result = validateMemberRow(validRow(), referenceDate);

    expect(result).toEqual({
      valid: true,
      member: {
        partnerMemberId: "P-001",
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: "1990-05-15",
        email: "jane.doe@example.com",
        policyStart: "2025-01-01",
        policyEnd: "2025-12-31",
      },
    });
  });

  it("accepts a blank policy_end as an open-ended policy", () => {
    const result = validateMemberRow(validRow({ policy_end: "" }), referenceDate);

    expect(result.valid).toBe(true);
    expect(result.valid && result.member.policyEnd).toBeNull();
  });

  it("rejects a row missing partner_member_id", () => {
    const result = validateMemberRow(validRow({ partner_member_id: "" }), referenceDate);

    expect(result).toEqual({ valid: false, reason: "partner_member_id is required" });
  });

  it("rejects a row missing first_name", () => {
    const result = validateMemberRow(validRow({ first_name: "" }), referenceDate);

    expect(result).toEqual({ valid: false, reason: "first_name is required" });
  });

  it("rejects a row missing last_name", () => {
    const result = validateMemberRow(validRow({ last_name: "" }), referenceDate);

    expect(result).toEqual({ valid: false, reason: "last_name is required" });
  });

  it("rejects a malformed date_of_birth", () => {
    const result = validateMemberRow(validRow({ date_of_birth: "15/05/1990" }), referenceDate);

    expect(result).toEqual({
      valid: false,
      reason: "must be a real calendar date in YYYY-MM-DD format",
    });
  });

  it("rejects a date_of_birth that is not a real calendar date", () => {
    const result = validateMemberRow(validRow({ date_of_birth: "1990-02-30" }), referenceDate);

    expect(result).toEqual({
      valid: false,
      reason: "must be a real calendar date in YYYY-MM-DD format",
    });
  });

  it("rejects a date_of_birth in the future", () => {
    const result = validateMemberRow(validRow({ date_of_birth: "2026-10-07" }), referenceDate);

    expect(result).toEqual({ valid: false, reason: "date_of_birth cannot be in the future" });
  });

  it("rejects a malformed email", () => {
    const result = validateMemberRow(validRow({ email: "not-an-email" }), referenceDate);

    expect(result).toEqual({ valid: false, reason: "email is not a valid email address" });
  });

  it("rejects a malformed policy_start", () => {
    const result = validateMemberRow(validRow({ policy_start: "not-a-date" }), referenceDate);

    expect(result).toEqual({
      valid: false,
      reason: "must be a real calendar date in YYYY-MM-DD format",
    });
  });

  it("rejects a malformed policy_end", () => {
    const result = validateMemberRow(validRow({ policy_end: "not-a-date" }), referenceDate);

    expect(result).toEqual({
      valid: false,
      reason: "policy_end must be blank or a real calendar date in YYYY-MM-DD format",
    });
  });

  it("rejects a policy_end earlier than policy_start", () => {
    const result = validateMemberRow(
      validRow({ policy_start: "2025-06-01", policy_end: "2025-01-01" }),
      referenceDate,
    );

    expect(result).toEqual({ valid: false, reason: "policy_end cannot be before policy_start" });
  });
});
