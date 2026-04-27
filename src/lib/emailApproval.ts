import crypto from "crypto";

const secret = () => (process.env.DRIP_SECRET || "clipmeta-drip-2026").trim();

export type EmailAction = "send" | "discard" | "revise";

export function createEmailApprovalToken(emailId: string, action: EmailAction) {
  return crypto
    .createHmac("sha256", secret())
    .update(`${emailId}:${action}`)
    .digest("hex");
}

export function verifyEmailApprovalToken(emailId: string, action: EmailAction, token: string | null) {
  if (!token) return false;
  const expected = createEmailApprovalToken(emailId, action);
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function emailApprovalUrl(baseUrl: string, emailId: string, action: "send" | "discard") {
  const url = new URL("/api/emails/approve", baseUrl);
  url.searchParams.set("emailId", emailId);
  url.searchParams.set("action", action);
  url.searchParams.set("token", createEmailApprovalToken(emailId, action));
  return url.toString();
}

export function emailReviseUrl(baseUrl: string, emailId: string) {
  const url = new URL("/api/emails/revise", baseUrl);
  url.searchParams.set("emailId", emailId);
  url.searchParams.set("token", createEmailApprovalToken(emailId, "revise"));
  return url.toString();
}
