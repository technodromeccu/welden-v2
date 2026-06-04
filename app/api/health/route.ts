import { NextResponse } from "next/server";
import { getDeploymentHealth } from "@/lib/runtime-config";
import { probeFirestore } from "@/lib/firestore-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = getDeploymentHealth();
  const firestore = await probeFirestore();

  // Production-ready requires the env gate AND, when Firestore is the active backend,
  // a live connectivity check — so a misconfigured Firebase backend fails the gate.
  const ok = health.readyForProduction && firestore.reachable;

  return NextResponse.json(
    { status: ok ? "ok" : "degraded", health, firestore },
    {
      status: ok ? 200 : 503
    }
  );
}
