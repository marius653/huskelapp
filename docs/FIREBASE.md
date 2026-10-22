# Firebase-oppsett for HuskelApp

HuskelApp bruker Firebase Authentication, Cloud Firestore og Firebase Hosting. GitHub er kildekode- og CI-kilden, mens den publiserte appen ligger på Firebase Hosting.

## Produksjonsarkitektur

```text
GitHub
  |
  +-- GitHub Actions
        |
        +-- Vite build
        |
        +-- Firebase Hosting: huskelapp-m
              |
              +-- Firebase Authentication
              +-- Cloud Firestore
```

Produksjonsadresser:

- `https://huskelapp-m.web.app`
- `https://huskelapp-m.firebaseapp.com`

For iOS/Safari installeres appen fra `huskelapp-m.firebaseapp.com`, mens Firebase Authentication bruker prosjektets standard `authDomain`: `huskelapp-7625b.firebaseapp.com`.

## Lokal konfigurasjon

Firebase web-konfigurasjonen leses fra `.env.local`. Filen skal ikke committes.

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=huskelapp-7625b.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=huskelapp-7625b
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Firebase-klientverdiene ligger som GitHub Repository Variables for CI-builden. `VITE_FIREBASE_AUTH_DOMAIN` settes eksplisitt til prosjektets standard Firebase Auth-domene i workflowen.

## Hosting

`firebase.json` publiserer Vite-output fra `dist/`, bruker SPA-rewrite til `/index.html`, og peker på Hosting-target `app`.

`.firebaserc` kobler target `app` til Firebase Hosting-siten `huskelapp-m` i prosjektet `huskelapp-7625b`.

Manuell deploy fra lokal terminal:

```powershell
npm.cmd run build
npx.cmd firebase-tools deploy --only hosting:app
```

## Automatisk deploy fra GitHub

Push eller merge til `main` bygger og deployer automatisk via `.github/workflows/deploy-firebase-hosting.yml`.

Workflowen bruker Hosting-target `app` og GitHub Repository Secret:

```text
FIREBASE_SERVICE_ACCOUNT_HUSKELAPP_7625B
```

Verdien er en Firebase/Google Cloud service-account-nøkkel med rettighet til å deploye Hosting. Denne nøkkelen er hemmelig og skal aldri committes.

## Firestore Security Rules

Reglene ligger i `firestore.rules`.

De krever innlogging, begrenser tilgang til den innloggede brukerens egen `uid`, validerer grunnleggende felttyper og lengder, og avviser andre dokumentstier som standard.

Reglene publiseres separat fra Hosting.

## Migrering av eldre lokale data

Ved første innlogging kan HuskelApp importere eldre data fra:

- `huskelapp_tasks_v1`
- `huskelapp_events_v1`
- `huskelapp_settings_v1`
- `huskelapp_links_v1`
- `huskelapp_notes_v1`

Den lokale kopien beholdes som backup etter migrering.
