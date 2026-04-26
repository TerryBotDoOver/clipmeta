import crypto from "crypto";

const secret = () => (process.env.DRIP_SECRET || "clipmeta-drip-2026").trim();

export function createEmailApprovalToken(emailId: string, action: "send" | "discard") {
  return crypto
    .createHmac("sha256", secret())
    .update(`${emailId}:${action}`)
    .digest("hex");
}

export function verifyEmailApprovalToken(emailId: string, action: "send" | "discard", token: string | null) {
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
