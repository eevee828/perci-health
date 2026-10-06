import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { MemberStore } from "../../src/storage/memberStore.js";
import type { Member } from "../../src/domain/member.js";

function sampleMember(overrides: Partial<Member> = {}): Member {
  return {
    partnerMemberId: "P-001",
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-05-15",
    email: "jane.doe@example.com",
    policyStart: "2025-01-01",
    policyEnd: "2025-12-31",
    ...overrides,
  };
}

let filePath: string;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "perci-health-store-"));
  filePath = join(dir, "members.json");
});

describe("MemberStore", () => {
  it("inserts a new member and it can be read back", () => {
    const store = new MemberStore(filePath);
    const member = sampleMember();

    expect(store.upsert(member)).toBe("inserted");
    expect(store.get(member.partnerMemberId)).toEqual(member);
  });

  it("does not duplicate or report as updated when re-importing an unchanged row", () => {
    const store = new MemberStore(filePath);
    const member = sampleMember();

    store.upsert(member);
    expect(store.upsert(member)).toBe("unchanged");

    const stored = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(Object.keys(stored)).toEqual([member.partnerMemberId]);
    expect(store.get(member.partnerMemberId)).toEqual(member);
  });

  it("updates the stored record in place when a field changes", () => {
    const store = new MemberStore(filePath);
    const member = sampleMember();
    const changed = sampleMember({ email: "jane.newemail@example.com" });

    store.upsert(member);
    expect(store.upsert(changed)).toBe("updated");

    const stored = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(Object.keys(stored)).toEqual([member.partnerMemberId]);
    expect(store.get(member.partnerMemberId)).toEqual(changed);
  });

  it("persists data across separate store instances", () => {
    const member = sampleMember();
    new MemberStore(filePath).upsert(member);

    const reopenedStore = new MemberStore(filePath);
    expect(reopenedStore.get(member.partnerMemberId)).toEqual(member);
  });
});
