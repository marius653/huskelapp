# Firebase-plan for HuskelApp

HuskelApp v3 bruker foreløpig localStorage, men all lagring går gjennom `js/services/`.

## Målarkitektur

```text
GitHub Pages
   |
   +-- Firebase Authentication
   |
   +-- Cloud Firestore
```

## Anbefalt Firestore-struktur

```text
users/
  {uid}/
    tasks/
      {taskId}
    events/
      {eventId}
    links/
      {linkId}
    notes/
      {noteId}
    meta/
      settings
```

## Authentication

Google-innlogging er et naturlig førstesteg. E-post/passord kan også aktiveres. All data bør ligge under den innloggede brukerens `uid`.

## Security Rules – utgangspunkt

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

## Slik kobles Firebase inn senere

1. Opprett Firebase-prosjekt.
2. Aktiver Authentication.
3. Opprett Firestore.
4. Legg GitHub Pages-domenet til som autorisert domene.
5. Kopier `js/firebase-config.example.js` til `js/firebase-config.js`.
6. Fyll inn konfigurasjonen.
7. Implementer `createFirebaseStore()` i `js/services/firebase-store.js`.
8. Implementer Firebase Auth i `js/services/auth-service.js`.
9. Endre `js/config.js` til `storageProvider: "firebase"` og `authProvider: "firebase"`.

## Migrering av eksisterende data

Når Firebase kobles på bør vi lage en engangsmigrering fra:

- `huskelapp_tasks_v1`
- `huskelapp_events_v1`
- `huskelapp_settings_v1`
- `huskelapp_links_v1`
- `huskelapp_notes_v1`

Dataene lastes opp under brukerens `uid`, verifiseres, og den lokale kopien beholdes til synkroniseringen er kontrollert.
