# Firebase-plan for HuskelApp

HuskelApp v3 bruker Firebase Authentication og Cloud Firestore. localStorage beholdes kun som migreringskilde og lokal backup for eldre data.

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

## Security Rules

De validerte reglene ligger i `firestore.rules`.

Reglene krever innlogging, begrenser all tilgang til den innloggede brukerens egen `uid`, validerer grunnleggende felttyper og lengder, og avviser alle andre dokumentstier som standard.

Reglene må foreløpig publiseres manuelt i Firebase Console under **Firestore Database → Rules**.

## Slik kobles Firebase inn senere

1. Opprett Firebase-prosjekt.
2. Aktiver Authentication.
3. Opprett Firestore.
4. Legg GitHub Pages-domenet til som autorisert domene.
5. Kopier `js/firebase-config.example.js` til `js/firebase-config.js`.
6. Fyll inn konfigurasjonen.
7. `createFirebaseStore()` lagrer data per innlogget `uid`.
8. Firebase Auth håndterer Google-innlogging og sesjon.
9. `js/config.js` bruker `storageProvider: "firebase"` og `authProvider: "firebase"`.

## Migrering av eksisterende data

Når Firebase kobles på bør vi lage en engangsmigrering fra:

- `huskelapp_tasks_v1`
- `huskelapp_events_v1`
- `huskelapp_settings_v1`
- `huskelapp_links_v1`
- `huskelapp_notes_v1`

Dataene lastes opp under brukerens `uid`, verifiseres, og den lokale kopien beholdes til synkroniseringen er kontrollert.
