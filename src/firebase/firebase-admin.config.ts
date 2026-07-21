import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { Storage, getStorage } from "firebase-admin/storage";

const hasCredentials =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

if (!hasCredentials) {
  console.warn(
    "WARNING: Firebase Admin environment variables are missing. Using fallback placeholders for build/compilation."
  );
}

let adminDb: Firestore;
let adminStorage: Storage;

const createDummyProxy = (name: string): any => {
  return new Proxy(
    () => {
      throw new Error(
        `Firebase Admin "${name}" was not initialized because environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are missing.`
      );
    },
    {
      get: (target, prop) => {
        if (prop === "then") return undefined;
        return createDummyProxy(name);
      },
    }
  );
};

if (hasCredentials) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  let app: App;

  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    app = getApps()[0];
  }

  adminDb = getFirestore(app);
  adminStorage = getStorage(app);
} else {
  adminDb = createDummyProxy("adminDb") as unknown as Firestore;
  adminStorage = createDummyProxy("adminStorage") as unknown as Storage;
}

export { adminDb, adminStorage };
