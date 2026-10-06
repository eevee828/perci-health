# Partner Eligibility Import

A small TypeScript/Node program for Perci's B2B partner eligibility import: reads a CSV of
eligible members, validates and stores them, and exposes a lookup by `partner_member_id`
over HTTP.

## Running it

Requires Node 18+ (developed and tested on Node 22.1.0).

Install dependencies:

```
npm install
```

Import a CSV — safe to run more than once, see "Assumptions" below:

```
npm run import -- data/sample.csv
```

Prints a summary of imported / updated / unchanged / rejected rows, with a specific reason
for each rejection.

Start the lookup server:

```
npm run serve
```

Then query a member:

```
curl http://localhost:3000/members/P-1001
```

Returns the member as JSON, or a 404 with a clear error message if the id isn't found. Port
defaults to 3000, overridable via `PORT`.

Run the tests:

```
npm test
```

## Assumptions

The brief leaves several things unspecified on purpose. Decisions made, and why:

- **Identity**: `partner_member_id` is the key a member is matched on when re-importing, not
  email. It's the partner's own stable id, and it's what lookup is keyed on anyway — if any
  other field changes (including email), the existing record is updated in place rather than
  treated as a new member.
- **Date strictness**: `date_of_birth`, `policy_start`, `policy_end` must be real calendar
  dates in `YYYY-MM-DD` format. `date_of_birth` can't be in the future. `policy_end` can't be
  earlier than `policy_start`. No "reasonable age range" checks beyond that.
- **Blank `policy_end`**: treated as valid — an open-ended, ongoing policy — rather than
  rejected.
- **Storage**: a single JSON file (`data/members.json`, gitignored — it's generated output,
  not source), keyed by `partner_member_id`. Simple, persists across runs, no native
  dependencies to install.
- **Lookup**: an HTTP endpoint (`GET /members/:partnerMemberId`) rather than a CLI command,
  for stronger full-stack signal.
- **Duplicate `partner_member_id` within one file**: the last occurrence in the file wins;
  earlier occurrences for the same id are superseded, not rejected.
- **Rejected-row reporting**: the import prints a count per outcome plus a specific,
  human-readable reason per rejected row — not just "invalid".

## How correctness was checked

28 automated tests (`npm test`), organized by the piece of behaviour they cover:

- **Validation** (`tests/domain/member.test.ts`) — every accept/reject rule above, and that
  rejections carry a specific reason rather than a generic one.
- **CSV parsing** (`tests/csv/parseMembersCsv.test.ts`) — well-formed rows, a quoted field
  containing a comma, a header-only file.
- **Storage** (`tests/storage/memberStore.test.ts`) — insert, no-op on an unchanged
  re-import, update on a changed field, and that data persists across separate store
  instances rather than just in memory.
- **Import orchestration** (`tests/import/importMembers.test.ts`) — mixed valid/invalid
  rows, idempotency on a repeat run, and in-file duplicate resolution.
- **HTTP endpoint** (`tests/server/createApp.test.ts`) — a hit and a 404 miss, via
  `supertest`.
- **End to end** (`tests/integration/sampleCsv.test.ts`) — the actual `data/sample.csv`
  fixture run through the real pipeline (parse → import → store → HTTP lookup), plus a
  second import to confirm idempotency against a real file rather than a hand-built one.

Beyond the test suite, each piece was also run for real as it was built, rather than trusting
the tests alone: the import CLI was run twice in a row against a scratch CSV to watch the
second run report `0 imported / 1 unchanged` directly in the terminal; the server was started
with `npm run serve` and queried with `curl` for both a known and an unknown id; and
`data/sample.csv` was run through `npm run import` by hand to confirm the exact summary and
rejection reasons before the integration test asserting on them was written.

`npx tsc --noEmit` was also run clean after every step.

## How AI was used

This was built with Claude (Claude Code), and in small commits reviewed one at a time rather
than as one large diff.

**Helped with**: scaffolding the project and toolchain — including diagnosing and working
around a real `npm`/`vitest`/`vite` native-dependency install bug, by pinning `vitest@4.1.11`
with a `vite@7` override instead of the broken default, keeping the dependency tree portable
and free of known vulnerabilities; writing the `zod` validation schema, the CSV parsing, the
store, the Express route, and the bulk of the test cases; following a build order where the
tests for each piece of behaviour were written in the same commit as the logic itself, so the
suite was a running regression check throughout rather than bolted on at the end.

**Didn't help with** — decisions made directly rather than guessed at by the model: the
identity-key choice, how strict date validation should be, how to handle a blank
`policy_end`, the storage mechanism, CLI vs HTTP for lookup, and how to resolve a duplicate
`partner_member_id` within one file. All stated under "Assumptions" above, and reasoned
through before any code was written.
