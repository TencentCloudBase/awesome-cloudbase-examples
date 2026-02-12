import { N8nAgent } from "@cloudbase/agent-adapter-n8n";

export function createAgent() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error(
      "N8N_WEBHOOK_URL is required. " +
        "Set it via environment variable or .env file.\n" +
        "Example: N8N_WEBHOOK_URL=http://localhost:5678/webhook/xxx/chat",
    );
  }

  const agent = new N8nAgent({
    n8nConfig: {
      webhookUrl,
      // If your n8n webhook has authentication enabled (Basic Auth recommended),
      // pass the appropriate headers via request.headers:
      //
      // Basic Auth (recommended, easiest to configure in n8n):
      //   request: {
      //     headers: {
      //       Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
      //     },
      //   },
      //
      // Also supports Header Auth and JWT Auth via the same mechanism.
    },
  });

  return { agent };
}
