import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Member } from "../domain/member.js";

export type UpsertOutcome = "inserted" | "updated" | "unchanged";

function membersMatch(a: Member, b: Member): boolean {
  return (
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.dateOfBirth === b.dateOfBirth &&
    a.email === b.email &&
    a.policyStart === b.policyStart &&
    a.policyEnd === b.policyEnd
  );
}

export class MemberStore {
  constructor(private readonly filePath: string) {}

  private readAll(): Record<string, Member> {
    if (!existsSync(this.filePath)) {
      return {};
    }

    const content = readFileSync(this.filePath, "utf-8").trim();
    return content === "" ? {} : (JSON.parse(content) as Record<string, Member>);
  }

  private writeAll(members: Record<string, Member>): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(members, null, 2));
  }

  get(partnerMemberId: string): Member | undefined {
    return this.readAll()[partnerMemberId];
  }

  upsert(member: Member): UpsertOutcome {
    const members = this.readAll();
    const existing = members[member.partnerMemberId];

    if (!existing) {
      members[member.partnerMemberId] = member;
      this.writeAll(members);
      return "inserted";
    }

    if (membersMatch(existing, member)) {
      return "unchanged";
    }

    members[member.partnerMemberId] = member;
    this.writeAll(members);
    return "updated";
  }
}
