# Hosting OwenCraft Online on Cloudflare Pages

Cloudflare Pages hosts static files for free with https built in — exactly what
this game needs (all the multiplayer traffic goes to Firebase, not to Cloudflare).

The Firebase config is **not stored in the game file**. `voxelcraft.html` contains
`__TOKENS__`, and `build.js` replaces them with your real values from environment
variables, producing a playable `dist/index.html`. That way the repository never
contains your config.

> Honest note: these values still end up in the page that every player's browser
> downloads — that's how Firebase web apps work, and it's why the real protection
> is your database security rules and the authorized-domains list, not secrecy.
> Keeping them out of Git is still good hygiene (no secret-scanner alarms, easy
> per-environment config, nothing sensitive in the commit history).

## Option A — Git-connected deploys (recommended)

Push the `owen-craft` folder to a GitHub/GitLab repository (the `.gitignore` here
already excludes `.env` and `dist/`), then:

1. Sign in at https://dash.cloudflare.com → **Workers & Pages**.
2. **Create application → Pages → Connect to Git**, pick your repository.
3. Build settings:
   - **Build command:** `node build.js`
   - **Build output directory:** `dist`
   - **Root directory:** the folder containing `build.js` (set this if `owen-craft`
     is a subfolder of your repo; leave default if it's the repo root).
4. Before the first deploy (or after, then redeploy): open the project's
   **Settings → Environment variables** and add, for Production (and Preview if
   you want preview builds to work):
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_APP_ID`
   (values come from your Firebase console — same ones as in your local `.env`).
5. Deploy. Your game is live at `https://<project-name>.pages.dev`, and every
   `git push` rebuilds and redeploys automatically.

## Option B — drag-and-drop (no repo)

1. Locally: copy `.env.example` to `.env`, fill in your values, run `node build.js`
   (needs Node.js installed).
2. In Cloudflare: **Workers & Pages → Create application → Pages → Upload assets**,
   name the project, and drag the **`dist` folder** in.
3. Repeat (Create a new deployment → upload `dist`) whenever the game changes.

## Tell Firebase about your domain (required!)

Google sign-in only works from domains Firebase trusts:

1. Firebase console → **Authentication → Settings → Authorized domains**.
2. **Add domain**: `<project-name>.pages.dev` (and any custom domain).

Without this the Google popup fails with `auth/unauthorized-domain`.

## Testing locally

```
node build.js
cd dist
python -m http.server 8000
```
Then open http://localhost:8000 (localhost is already Firebase-authorized).
Opening `voxelcraft.html` directly won't work — it still has the tokens; always
play the built `dist/index.html`.

## Optional: use your own domain

1. Pages project → **Custom domains** tab → **Set up a custom domain**.
2. Enter e.g. `play.yourdomain.com` and follow the DNS prompt (one click if the
   domain is already on Cloudflare).
3. Add that domain to Firebase's authorized domains too.

## If you ever committed real values by accident

Rotating is easy: in the Firebase console delete the web app (Project settings →
Your apps) and register a new one — you get a fresh `apiKey`/`appId` to put in
`.env` and Cloudflare's variables. Old committed values remain in Git history,
which is why rotating beats deleting the file.

## Notes

- Free plan limits are generous (500 builds/month, unlimited static bandwidth).
- `voxelcraft-singleplayer.html` is copied into `dist/` too — it works offline
  at `/voxelcraft-singleplayer.html` and needs no Firebase.
- To reset the shared world: delete `world/edits` in the Realtime Database.
