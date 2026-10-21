# HuskelApp v3

HuskelApp er en personlig planleggingsapp bygget med HTML, CSS og vanilla JavaScript. Denne versjonen er laget som et mer ferdig produkt og er klar for GitHub Pages.

## Funksjoner

- Oppgaver med prioritet, status og frist
- Underoppgaver med avkryssing, fremdrift og direkte tillegg fra oppgavekortet
- Redigering og sletting av oppgaver
- Åpne/Ferdige-filter og avkryssing av hele oppgaven
- Markering av passert frist
- Live dra-og-slipp og tastaturflytting i manuell sortering
- Automatisk sortering etter prioritet → frist → opprettet
- Globalt søk i oppgaver og underoppgaver
- Kalender for inneværende og neste måned
- Hendelser på valgfri fremtidig dato
- Gule hendelsesprikker med hover-info
- Hendelsesliste seks måneder frem og nedtelling i dager
- Egen kalenderfokus-visning
- Oppgaveliste, ferdigstillelsesring og statistikk
- Toppnavigasjon
- Lys/mørk/system-tema
- Eksport/import av komplett JSON-backup
- Innstillinger
- Personlige favorittlenker i Verktøy-kortet med eget redigeringsvindu
- Egen notatside med frie notater og skjulte notater knyttet til oppgaver
- Firebase Authentication og personlig Firestore-lagring per bruker

## Struktur

```text
HuskelApp-v3/
├── index.html
├── assets/icon.svg
├── css/styles.css
├── js/
│   ├── app.js
│   ├── config.js
│   ├── firebase-config.example.js
│   └── services/
│       ├── auth-service.js
│       ├── firebase-store.js
│       ├── local-store.js
│       └── store.js
├── docs/FIREBASE.md
├── .gitignore
└── .nojekyll
```

## Lokal utvikling

ES-moduler krever en liten lokal webserver:

```bash
python -m http.server 8000
```

Åpne `http://localhost:8000`.

## GitHub Pages

1. Opprett et offentlig repo.
2. Legg inn innholdet fra denne mappen og push til `main`.
3. Gå til **Settings → Pages**.
4. Velg **Deploy from a branch**.
5. Velg `main` og `/ (root)`.

## Lagring nå

Eksisterende localStorage-data beholdes som lokal backup og kan migreres én gang til den innloggede Firestore-kontoen:

```text
huskelapp_tasks_v1
huskelapp_events_v1
huskelapp_settings_v1
huskelapp_links_v1
huskelapp_notes_v1
```

Bruk **Eksporter data** for manuell backup.

## Firebase

Se `docs/FIREBASE.md`. Hovedappen snakker med et storage-adapterlag, slik at localStorage senere kan erstattes med Firestore uten å skrive om UI-logikken.
