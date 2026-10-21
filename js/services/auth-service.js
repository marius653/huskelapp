import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged as observeAuthState,
  setPersistence,
  signInWithPopup,
  signOut as firebaseSignOut
} from "firebase/auth";

import { auth } from "../firebase.js";

const googleProvider = new GoogleAuthProvider();

export function createAuthService() {
  return {
    provider: "firebase",

    getCurrentUser() {
      return auth.currentUser;
    },

    onAuthStateChanged(callback) {
      return observeAuthState(auth, callback);
    },

    async signInWithGoogle() {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    },

    async signOut() {
      await firebaseSignOut(auth);
    }
  };
}
