import type { NextRequest } from "next/server";
import { search } from "@/lib/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return Response.json(search(q.slice(0, 200)));
}
