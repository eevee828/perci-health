import express, { type Express } from "express";
import type { MemberStore } from "../storage/memberStore.js";

export function createApp(store: MemberStore): Express {
  const app = express();

  app.get("/members/:partnerMemberId", (req, res) => {
    const member = store.get(req.params.partnerMemberId);

    if (!member) {
      res.status(404).json({
        error: `No member found for partner_member_id '${req.params.partnerMemberId}'`,
      });
      return;
    }

    res.status(200).json(member);
  });

  return app;
}
