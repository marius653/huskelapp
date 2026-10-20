import { APP_CONFIG } from "../config.js";
import { createLocalStore } from "./local-store.js";

export async function createStore() {
  if (APP_CONFIG.storageProvider === "local") return createLocalStore();

  if (APP_CONFIG.storageProvider === "firebase") {
    const { createFirebaseStore } = await import("./firebase-store.js");
    return createFirebaseStore();
  }

  throw new Error(`Ukjent storageProvider: ${APP_CONFIG.storageProvider}`);
}
