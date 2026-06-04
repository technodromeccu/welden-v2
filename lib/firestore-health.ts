// Phase 4: real Firestore connectivity probe for /api/health.
//
// getDeploymentHealth() only checks that env vars are PRESENT. This performs an actual
// (cheap, read-only) round-trip so a misconfigured service-account key or unreachable
// project is caught by the deploy health gate instead of failing silently in production.
// Only probes when Firestore is the active backend; file-backed mode has no external dep.

export type FirestoreHealth = {
  backend: "firestore" | "file";
  reachable: boolean;
  error: string | null;
};

export async function probeFirestore(): Promise<FirestoreHealth> {
  if (process.env.DATA_BACKEND !== "firestore") {
    return { backend: "file", reachable: true, error: null };
  }

  try {
    const { getFirestoreDb } = await import("./firebase-admin");
    const db = await getFirestoreDb();
    // A get() on a sentinel doc is a genuine round-trip (existence is irrelevant) and
    // costs one read — enough to prove credentials + connectivity without writing.
    // NB: Firestore reserves doc ids matching __.*__, so the id must not be wrapped that way.
    await db.collection("state").doc("health-probe").get();
    return { backend: "firestore", reachable: true, error: null };
  } catch (error) {
    return {
      backend: "firestore",
      reachable: false,
      error: error instanceof Error ? error.message : "Firestore unreachable"
    };
  }
}
