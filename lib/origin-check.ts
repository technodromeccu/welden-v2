import { NextResponse } from "next/server";

function getExpectedOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? request.headers.get("host")?.trim();
  const protocol = forwardedProto ?? new URL(request.url).protocol.replace(":", "");

  if (!host) {
    return null;
  }

  return `${protocol}://${host}`;
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) {
    return null;
  }

  const expectedOrigin = getExpectedOrigin(request);
  if (!expectedOrigin || origin !== expectedOrigin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
}
