/* Auth-adapter placeholder. Senere kan denne implementeres med Firebase Authentication. */
export function createAuthService() {
  return {
    provider: "none",
    async getCurrentUser() {
      return null;
    }
  };
}
