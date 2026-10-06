import { join } from "node:path";
import { createApp } from "./server/createApp.js";
import { MemberStore } from "./storage/memberStore.js";

const port = Number(process.env.PORT ?? 3000);
const store = new MemberStore(join(process.cwd(), "data", "members.json"));
const app = createApp(store);

app.listen(port, () => {
  console.log(`Eligibility lookup server listening on port ${port}`);
});
