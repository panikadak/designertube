import type { NextRequest } from "next/server";
import { byId } from "@/lib/data";

// Card data for a list of ids, in the given order (Liked, History, Watch later).
export async function GET(req: NextRequest) {
  const map = byId();
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 500);
  return Response.json(ids.map((id) => map.get(id)).filter(Boolean));
}
