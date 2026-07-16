#!/usr/bin/env node
/**
 * OwenCraft build script — injects the Firebase config into the game.
 *
 * Reads the five FIREBASE_* variables from the environment (on Cloudflare
 * Pages: project Settings -> Environment variables) or from a local .env
 * file (never committed), replaces the __TOKENS__ in voxelcraft.html, and
 * writes the playable result to dist/index.html.
 *
 * Usage:  node build.js
 * No dependencies — plain Node.
 */
const fs = require('fs');
const path = require('path');
const here = __dirname;

// ---- tiny .env loader (KEY=value lines; real env vars win) ----
const envFile = path.join(here, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const VARS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_APP_ID',
];

const missing = VARS.filter(v => !process.env[v]);
if (missing.length) {
  console.error('Missing environment variables:\n  ' + missing.join('\n  '));
  console.error('\nLocally: copy .env.example to .env and fill in the values.');
  console.error('On Cloudflare Pages: add them under Settings -> Environment variables.');
  process.exit(1);
}

let html = fs.readFileSync(path.join(here, 'voxelcraft.html'), 'utf8');
for (const v of VARS) html = html.split('__' + v + '__').join(process.env[v]);
if (html.includes('__FIREBASE_')) {
  console.error('Unreplaced placeholders remain — check the tokens in voxelcraft.html.');
  process.exit(1);
}

fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
fs.writeFileSync(path.join(here, 'dist', 'index.html'), html);
const sp = path.join(here, 'voxelcraft-singleplayer.html');
if (fs.existsSync(sp)) fs.copyFileSync(sp, path.join(here, 'dist', 'voxelcraft-singleplayer.html'));

// SEO assets — plain copies, no token substitution needed.
for (const f of ['og-image.svg', 'robots.txt', 'sitemap.xml']) {
  const src = path.join(here, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(here, 'dist', f));
}
// Cloudflare Pages honours this file: never let browsers cache the HTML,
// so every deploy reaches phones immediately (assets from CDNs still cache).
fs.writeFileSync(path.join(here, 'dist', '_headers'),
  '/*\n  Cache-Control: no-store\n');
console.log('Built dist/index.html (' + html.length + ' chars) — deploy the dist folder.');
