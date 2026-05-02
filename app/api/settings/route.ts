import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { validateSettings } from "@/lib/settings";
import { readCollection, writeCollection } from "@/lib/store";
import type { Settings } from "@/lib/types";

export async function GET() {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await readCollection<Settings>("settings"));
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  try {
    const body = (await request.json()) as Settings;
    const settings = validateSettings(body);
    await writeCollection("settings", settings);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update settings." },
      { status: 400 }
    );
  }
}
