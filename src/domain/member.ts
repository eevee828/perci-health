import { z } from "zod";

export interface RawMemberRow {
  partner_member_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  policy_start: string;
  policy_end: string;
}

export interface Member {
  partnerMemberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  policyStart: string;
  policyEnd: string | null;
}

function isRealCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const calendarDate = z
  .string()
  .trim()
  .refine(isRealCalendarDate, "must be a real calendar date in YYYY-MM-DD format");

export function buildMemberRowSchema(referenceDate: Date) {
  return z
    .object({
      partner_member_id: z.string().trim().min(1, "partner_member_id is required"),
      first_name: z.string().trim().min(1, "first_name is required"),
      last_name: z.string().trim().min(1, "last_name is required"),
      date_of_birth: calendarDate.refine(
        (value) => new Date(`${value}T00:00:00Z`) <= referenceDate,
        "date_of_birth cannot be in the future",
      ),
      email: z.string().trim().min(1, "email is required").email("email is not a valid email address"),
      policy_start: calendarDate,
      policy_end: z.string().trim(),
    })
    .superRefine((row, ctx) => {
      if (row.policy_end === "") {
        return;
      }

      if (!isRealCalendarDate(row.policy_end)) {
        ctx.addIssue({
          code: "custom",
          path: ["policy_end"],
          message: "policy_end must be blank or a real calendar date in YYYY-MM-DD format",
        });
        return;
      }

      if (row.policy_end < row.policy_start) {
        ctx.addIssue({
          code: "custom",
          path: ["policy_end"],
          message: "policy_end cannot be before policy_start",
        });
      }
    })
    .transform(
      (row): Member => ({
        partnerMemberId: row.partner_member_id,
        firstName: row.first_name,
        lastName: row.last_name,
        dateOfBirth: row.date_of_birth,
        email: row.email,
        policyStart: row.policy_start,
        policyEnd: row.policy_end === "" ? null : row.policy_end,
      }),
    );
}

export type MemberValidationResult =
  | { valid: true; member: Member }
  | { valid: false; reason: string };

export function validateMemberRow(
  row: RawMemberRow,
  referenceDate: Date = new Date(),
): MemberValidationResult {
  const result = buildMemberRowSchema(referenceDate).safeParse(row);

  if (result.success) {
    return { valid: true, member: result.data };
  }

  return { valid: false, reason: result.error.issues[0].message };
}
