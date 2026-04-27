import express from "express";

const router = express.Router();

const VERIFY_TOKEN = "oviaan123";

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

router.post("/", (req, res) => {
  // Log the raw body for debugging
  // console.log("Webhook received:", JSON.stringify(req.body, null, 2));

  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (value?.statuses) {
    for (const status of value.statuses) {
      const recipient = status.recipient_id;
      const state = status.status; // sent, delivered, read, failed
      const msgId = status.id;

      if (state === 'failed') {
        const error = status.errors?.[0];
        console.error(`[WhatsApp Status Update] Message ${msgId} to ${recipient} FAILED.`);
        console.error(`[WhatsApp Error Detail] Code: ${error?.code} | Message: ${error?.title} - ${error?.message}`);
      } else {
        console.log(`[WhatsApp Status Update] Message ${msgId} to ${recipient} status: ${state}`);
      }
    }
  }

  return res.sendStatus(200);
});

export default router;