# Firebase deployment plan (Firebase Hosting)

This repo currently has only a README, so this plan assumes we will deploy a **static web app** to **Firebase Hosting** (optionally built by a CI step). If the app later needs an API, auth, or backend jobs, we can extend this to Firebase Functions/Firestore.

## What we’ll deploy

- **Hosting only** (recommended first step)
  - Static files served from a build output folder (commonly `dist/`, `build/`, or `public/`).
  - Optional SPA routing (rewrite all routes to `index.html`).

## Prerequisites

- A Firebase/Google Cloud project (create in Firebase Console).
- Local `firebase-tools` for one-time init (or do init in CI).
- GitHub repo secrets for CI deployments (recommended).

## One-time setup (local)

1. Install Firebase CLI:

```bash
npm i -g firebase-tools
firebase --version
```

2. Login and select project:

```bash
firebase login
firebase projects:list
```

3. Initialize Hosting in this repo (generates `firebase.json` and `.firebaserc`):

```bash
firebase init hosting
```

Suggested answers (adjust to your framework):

- **Public directory**: `dist` (or `build` / `public`)
- **Single-page app**: Yes (if using client-side routing)
- **GitHub Action deploys**: Yes (optional; we include a workflow template in this repo)

## Configuration files

- **`.firebaserc`**: maps this repo to a Firebase project id (replace placeholder).
- **`firebase.json`**: Hosting config (set the correct `public` folder; enable SPA rewrite if needed).

## CI/CD plan (GitHub Actions)

We’ll support:

- **Preview deployments** on pull requests.
- **Production deploys** on push to `main`.

### Required GitHub secrets

Recommended (simplest) approach: store the service account JSON in a single secret named:

- `FIREBASE_SERVICE_ACCOUNT`

Alternative: you *can* name it `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` (some examples do this), but then your workflow must reference that exact secret name.

Steps to create the service account JSON:

1. In Google Cloud Console for the Firebase project:
   - IAM & Admin → Service Accounts → Create service account
   - Grant role: **Firebase Hosting Admin** (or broader if needed)
2. Create a JSON key for that service account.
3. Add the JSON as the GitHub secret.

### Build output folder

Decide (or implement later) how the app builds:

- **No build yet**: keep a `public/` folder with `index.html` and assets, and deploy that.
- **SPA framework** (React/Vite/etc.): run a CI build and deploy `dist/` or `build/`.

## Smoke test / verification

After a deploy:

- Open the Hosting URL shown in deploy logs.
- Verify:
  - Home page loads
  - Hard-refresh on a deep route works (if SPA rewrite enabled)
  - Assets load (no 404s)

## Rollback strategy

Firebase Hosting supports versions:

```bash
firebase hosting:releases:list
firebase hosting:rollback
```

## Next steps (once code exists)

- Add a real build script (`npm run build`) and update `firebase.json` `public` to match output.
- Add caching headers for immutable assets.
- Add monitoring/alerts (Firebase Performance / Crashlytics if applicable).

