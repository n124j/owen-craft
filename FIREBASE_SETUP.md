# OwenCraft Online — Firebase Setup Guide

The multiplayer game (`voxelcraft.html`) uses Firebase for Google sign-in and for
syncing players, block edits, and chat. Setup takes about 10 minutes and the free
plan is more than enough for playing with friends and family.

The terrain itself is never stored online — every browser generates the identical
world from the same seed, so the database only carries tiny messages.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com and click **Add project** (sign in with your Google account).
2. Name it anything (e.g. `owencraft`). You can disable Google Analytics — it isn't needed.

## 2. Register a web app and get your config

1. On the project overview page, click the **`</>` (Web)** icon to add a web app.
2. Give it a nickname (e.g. `owencraft-web`). Skip Firebase Hosting for now.
3. Firebase shows a `firebaseConfig` code block. Keep this page open — you'll copy
   values from it in step 5.

## 3. Enable Google sign-in

1. In the left menu: **Build → Authentication → Get started**.
2. Under **Sign-in method**, choose **Google**, toggle **Enable**, pick a support email, and save.
3. Under **Authentication → Settings → Authorized domains**, make sure your website's
   domain is listed (add it if not). `localhost` is already there for testing.

## 4. Create the Realtime Database and set security rules

1. In the left menu: **Build → Realtime Database → Create Database**.
2. Pick the region closest to you and start in **locked mode**.
3. Open the **Rules** tab, replace everything with the rules below, and click **Publish**:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "players": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "arena": {
      ".read": "auth != null",
      "players": {
        "$uid": { ".write": "auth != null && auth.uid === $uid" }
      },
      "chat": {
        "$msg": {
          ".write": "auth != null && !data.exists() && newData.child('uid').val() === auth.uid",
          ".validate": "newData.child('text').isString() && newData.child('text').val().length <= 200 && newData.child('name').isString() && newData.child('name').val().length <= 16"
        }
      }
    },
    "world": {
      ".read": "auth != null",
      "edits": {
        "$chunk": { ".write": "auth != null" }
      }
    }
  }
}
```

(This same JSON lives in `database.rules.json` at the repo root, so it stays
version-controlled — copy/paste it into the Rules tab whenever it changes.)

These rules mean: signed-in players can see the shared world (`arena/*` for other
players and chat, `world/edits` for block changes), but each player's own
`players/$uid` data (profile, inventory) is only readable by that player, not by
everyone else who's signed in. Each player can only write their own
presence/profile/inventory; chat messages can't be edited after sending; and any
signed-in player may place/break blocks.

## 5. Put your config into environment variables (never in the code)

`voxelcraft.html` deliberately contains `__TOKENS__` instead of real values, so
nothing sensitive is ever committed to a repository. Your real values go in two
places:

1. **Locally:** copy `.env.example` to `.env` (gitignored) and fill in the five
   values from your `firebaseConfig` (step 2): `apiKey`, `authDomain`,
   `databaseURL`, `projectId`, `appId`.
   - `databaseURL` appears in the config only after you created the database
     (step 4). You can also copy it from the Realtime Database page — it looks
     like `https://YOURPROJECT-default-rtdb.REGION.firebasedatabase.app`.
2. **On Cloudflare Pages:** add the same five variables (named
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_DATABASE_URL`,
   `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`) under the project's
   **Settings → Environment variables**.

Then run `node build.js` — it injects the values and writes the playable game to
`dist/index.html`. Cloudflare runs the same script as its build command.

## 6. Put it on your website

Deploy the **built `dist` folder** (or let Cloudflare build it from your repo) —
full steps are in `CLOUDFLARE_HOSTING.md`. The game must be served over **https**
(or `localhost`) — Google sign-in does not work from a file opened directly off
the disk (`file://`).

To test locally first: run a tiny server in the folder, e.g.
`python -m http.server 8000`, then open `http://localhost:8000/voxelcraft.html`.

## Handy admin tricks

- **Reset the world** (undo everyone's block edits): in the Realtime Database data
  view, delete the `world/edits` node.
- **Clear chat history**: delete `arena/chat`.
- **Kick a stuck "ghost" player**: delete their entry under `arena/players`
  (this also happens automatically when their connection drops).
- **New world**: change `seed` in the `CFG` block of `voxelcraft.html` — everyone
  must use the same file so their worlds match. Reset `world/edits` when you do,
  since old edits would apply to the new terrain.

## Notes and limits

- The free (Spark) plan comfortably handles a handful of simultaneous players.
  Position updates are throttled to ~8 per second per moving player.
- This is a friendly, trust-based setup: any signed-in player can build anywhere.
  There is no server-side movement validation or anti-cheat — fine for friends,
  not for the open internet.
- `voxelcraft-singleplayer.html` is the original offline version — it still works
  by just double-clicking it, no Firebase needed.
