import { join } from "node:path";
import { parseMembersCsvFile } from "./csv/parseMembersCsv.js";
import { importMemberRows } from "./import/importMembers.js";
import { MemberStore } from "./storage/memberStore.js";

function main(): void {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("Usage: npm run import -- <path-to-csv>");
    process.exitCode = 1;
    return;
  }

  const store = new MemberStore(join(process.cwd(), "data", "members.json"));
  const rows = parseMembersCsvFile(filePath);
  const summary = importMemberRows(rows, store);

  console.log(`Imported: ${summary.imported}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Unchanged: ${summary.unchanged}`);
  console.log(`Rejected: ${summary.rejected.length}`);

  for (const rejection of summary.rejected) {
    console.log(`  row ${rejection.row}: ${rejection.reason}`);
  }
}

main();
