# Sisterhood Baby Inventory

A shared list of baby items for up to 8 sisters: what each person owns, who has it right now, and what's free to borrow.

## Features

- **Items** with a photo, description, product link, owner and who currently has it
- **Photo upload** straight from a phone camera or camera roll. Photos are shrunk before upload and kept in private storage.
- **Find the product link for free:** the add/edit form has *Search photo with Google Lens* (opens Lens with the item's photo) and *Google “item name”* buttons. Copy the right product link and paste it in.
- **Pass along:** "I've got it now", "Returned to owner" or "Pass to…"
- **Views:** Everything · Free to borrow · On loan · Archive · Activity · People
- **Categories** (Sleep, Feeding, Out & about, Car seats, Nursery, Bath & changing, Play & toys, Clothes, Books, Safety, Other) with a quick filter row showing counts
- **Filters:** search, category, owned by, currently with, only items with photos, and sort (newest, recently changed, A–Z). Filters are remembered on each device.
- **Archive** with a reason (thrown away, given away, sold, not using, broken). You can bring things back.
- **Undo:** every change shows an Undo button, Ctrl/Cmd+Z undoes your last change, and each item's history (and the Activity feed) can undo its latest change. Deleting is soft, so deleted items can always be restored.
- **Live updates** when someone else makes a change
- **Own login for everyone:** each sister signs in with Google *or* her own email + password (create account, forgot password, and change password under *People*). Only emails added under *People* can see anything, and the database enforces this with row level security.

## Cost

Everything runs on free tiers: Supabase Free (500MB database, 1GB photo storage, 50k monthly users), Netlify Free (hosting from a private repo) and Google sign-in. There are no paid APIs. Supabase pauses a free project after a week with no visits; opening the dashboard and clicking *Restore* wakes it (data is kept).

## Stack

React + Vite + TypeScript, Supabase (auth, Postgres, storage, realtime). The schema is in `supabase/migrations/`.

## Run locally

```bash
npm install
npm run dev
```

## One-time setup

1. **Google sign-in:** create an OAuth client in Google Cloud Console (type: Web application) with the authorised redirect URI
   `https://eblyucklornvjollzfha.supabase.co/auth/v1/callback`. Then paste the client ID and secret into
   Supabase → Authentication → Sign In / Providers → Google.
2. **URLs:** in Supabase → Authentication → URL Configuration, set the Site URL to
   your Netlify address (e.g. `https://sisterhood-inventory.netlify.app/`) and add it plus `http://localhost:5173/` to the redirect URLs.
3. **Hosting (free, works with a private repo):** sign up at netlify.com with GitHub → *Add new site* → *Import an existing project* → GitHub → pick this repo and allow access to it. The build settings come from `netlify.toml`, so just click *Deploy*. Rename the site under *Site configuration* (e.g. `sisterhood-inventory`). Every push to the production branch redeploys automatically.
4. **Invite everyone:** sign in, open *People* and add each sister's email. They then either tap *Continue with Google* or choose *Create account* and set a password.
5. **Emails (recommended):** Supabase's built-in mailer only sends a few emails an hour, which can hold up sign-up confirmations and password resets. For reliable delivery, add SMTP details (e.g. Resend or your Google Workspace) under Supabase → Authentication → Emails → SMTP Settings.
