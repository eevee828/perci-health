import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/server/createApp.js";
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

let store: MemberStore;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "perci-health-server-"));
  store = new MemberStore(join(dir, "members.json"));
});

describe("GET /members/:partnerMemberId", () => {
  it("returns 200 with the member for a known id", async () => {
    const member = sampleMember();
    store.upsert(member);

    const response = await request(createApp(store)).get(`/members/${member.partnerMemberId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(member);
  });

  it("returns 404 with a clear message for an unknown id", async () => {
    const response = await request(createApp(store)).get("/members/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "No member found for partner_member_id 'does-not-exist'",
    });
  });
});
