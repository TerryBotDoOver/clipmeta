import { NextRequest, NextResponse } from "next/server";
import {
  getAllFlags,
  setFlag,
  createFlag,
  deleteFlag,
} from "@/lib/feature-flags";

// GET — list all flags
export async function GET() {
  try {
    const flags = await getAllFlags();
    return NextResponse.json({ flags });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create or toggle a flag
// Body: { action: "create" | "toggle", name: string, description?: string, enabled?: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, name, description, enabled } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (action === "create") {
      await createFlag(name, description);
      return NextResponse.json({ ok: true });
    }

    if (action === "toggle") {
      await setFlag(name, !!enabled);
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      await deleteFlag(name);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
