import { NextResponse } from "next/server";

function htmlPage() {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email drafts disabled</title><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:680px;margin:40px auto;padding:0 20px;line-height:1.5;color:#111}.muted{color:#666}</style></head><body><h1>Email drafts disabled</h1><p class="muted">Codex email draft approvals are disabled. Handle this customer reply manually.</p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET() {
  return htmlPage();
}

export async function POST() {
  return htmlPage();
}
