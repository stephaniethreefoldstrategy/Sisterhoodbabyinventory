# Sisterhood Baby Inventory

A shared list of baby items for up to 8 sisters: what each person owns, who has it right now, and what's free to borrow.

## Features

- **Items** with a photo, description, product link, owner and who currently has it
- **Photo upload** straight from a phone camera or camera roll. Photos are shrunk before upload and kept in private storage.
- **Pass along:** "I've got it now", "Returned to owner" or "Pass to…"
- **Views:** Everything · Free to borrow · On loan · Archive · Activity · People
- **Categories** (Sleep, Feeding, Out & about, Car seats, Nursery, Bath & changing, Play & toys, Clothes, Books, Safety, Other) with a quick filter row showing counts
- **Filters:** search, category, owned by, currently with, only items with photos, and sort (newest, recently changed, A–Z). Filters are remembered on each device.
- **Archive** with a reason (thrown away, given away, sold, not using, broken). You can bring things back.
- **Undo:** every change shows an Undo button, Ctrl/Cmd+Z undoes your last change, and each item's history (and the Activity feed) can undo its latest change. Deleting is soft, so deleted items can always be restored.
- **Live updates** when someone else makes a change
- **Access:** Google sign-in (with an email-link fallback). Only emails added under *People* can see anything, and the database enforces this with row level security.

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
   `https://stephaniethreefoldstrategy.github.io/Sisterhoodbabyinventory/` and add `http://localhost:5173/` to the redirect URLs.
3. **Hosting:** in GitHub → Settings → Pages, set Source to *GitHub Actions*. Each push to `main` then deploys.
4. **Invite everyone:** sign in, open *People* and add each sister's Google email.
