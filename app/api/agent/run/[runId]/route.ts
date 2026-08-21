import { NextRequest, NextResponse } from "next/server";
import { getRun } from "@/lib/agent/runStore";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { runId: string } }) {
  const run = getRun(params.runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  return NextResponse.json(run);
}
