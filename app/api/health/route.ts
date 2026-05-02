import { NextResponse } from "next/server";
import { getDeploymentHealth } from "@/lib/runtime-config";

export async function GET() {
  const health = getDeploymentHealth();

  return NextResponse.json(
    { status: health.readyForProduction ? "ok" : "degraded", health },
    {
      status: health.readyForProduction ? 200 : 503
    }
  );
}
