/*
  Firebase/Firestore adapter placeholder.

  Appen bruker samme grensesnitt uansett datakilde:
    getTasks / saveTasks
    getEvents / saveEvents
    getSettings / saveSettings

  Anbefalt struktur:
    users/{uid}/tasks/{taskId}
    users/{uid}/events/{eventId}
    users/{uid}/meta/settings

  Se docs/FIREBASE.md.
*/
export async function createFirebaseStore() {
  throw new Error("Firebase er ikke konfigurert ennå. Se docs/FIREBASE.md.");
}
