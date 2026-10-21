import { APP_CONFIG } from "../config.js";
import { createLocalStore } from "./local-store.js";

export async function createStore({ uid } = {}) {
  if (APP_CONFIG.storageProvider === "local") return createLocalStore();

  if (APP_CONFIG.storageProvider === "firebase") {
    if (!uid) throw new Error("Firebase-lagring krever en innlogget bruker.");
    const { createFirebaseStore } = await import("./firebase-store.js");
    return createFirebaseStore(uid);
  }

  throw new Error(`Ukjent storageProvider: ${APP_CONFIG.storageProvider}`);
}
