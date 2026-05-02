import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getPreliminaryQuotations } from "@/lib/quotations";

export async function GET() {
  const auth = await requireApiUser(["admin", "manager"]);
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await getPreliminaryQuotations());
}
