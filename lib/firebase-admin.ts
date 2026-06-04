import type { Firestore } from "firebase-admin/firestore";
import type { Bucket } from "@google-cloud/storage";

// Server-only Firebase Admin SDK bootstrap.
//
// All imports of "firebase-admin/*" are dynamic so this module costs nothing
// unless the Firestore backend is actually used (DATA_BACKEND=firestore).
// Credentials are resolved one of two ways:
//   - FIREBASE_SERVICE_ACCOUNT_JSON  : full service-account JSON as one string (hosted)
//   - GOOGLE_APPLICATION_CREDENTIALS : path to the key file (local dev, via applicationDefault)

let firestoreInstance: Firestore | null = null;
let appInitialized = false;

async function ensureApp(): Promise<void> {
  if (appInitialized) return;
  const { getApps, initializeApp, cert, applicationDefault } = await import("firebase-admin/app");

  if (getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || undefined;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim() || undefined;

    const credential = serviceAccountJson
      ? cert(JSON.parse(serviceAccountJson))
      : applicationDefault();

    initializeApp({ credential, projectId, storageBucket });
  }

  appInitialized = true;
}

export async function getFirestoreDb(): Promise<Firestore> {
  if (firestoreInstance) return firestoreInstance;
  await ensureApp();
  const { getFirestore } = await import("firebase-admin/firestore");
  firestoreInstance = getFirestore();
  return firestoreInstance;
}

export async function getStorageBucket(): Promise<Bucket> {
  await ensureApp();
  const { getStorage } = await import("firebase-admin/storage");
  // Uses the storageBucket configured in initializeApp (FIREBASE_STORAGE_BUCKET).
  return getStorage().bucket();
}
