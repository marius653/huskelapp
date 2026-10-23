import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged as observeAuthState,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut
} from "firebase/auth";

import { auth } from "../firebase.js";

const googleProvider = new GoogleAuthProvider();

function isIosDevice() {
  const userAgent = navigator.userAgent || "";
  const classicIos = /iPad|iPhone|iPod/.test(userAgent);
  const modernIpad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return classicIos || modernIpad;
}


export function createAuthService() {
  return {
    provider: "firebase",

    getCurrentUser() {
      return auth.currentUser;
    },

    onAuthStateChanged(callback) {
      return observeAuthState(auth, callback);
    },

    async completeRedirectSignIn() {
      return getRedirectResult(auth);
    },

    async signInWithGoogle() {
      await setPersistence(auth, browserLocalPersistence);

      if (isIosDevice()) {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }

      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    },

    async signOut() {
      await firebaseSignOut(auth);
    }
  };
}
