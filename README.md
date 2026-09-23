# Sisterhood Baby Inventory

A shared list of baby items for up to 8 sisters: what each person owns, who has it right now, and what's free to borrow.

## Features

- **Items** with a photo, description, product link, owner and who currently has it
- **Photo upload** straight from a phone camera or camera roll. Photos are shrunk before upload and kept in private storage.
- **Photo from the product link:** if an item has a link but no photo, the app grabs the product photo from that page (the free `link-photo` Supabase Edge Function reads the page's share image). Items saved earlier get a *Get photo from link* button.
- **Find the product link for free:** the add/edit form has *Search photo with Google Lens* (opens Lens with the item's photo) and *Google “item name”* buttons. Copy the right product link and paste it in.
- **Pass along:** "I've got it now", "Returned to owner" or "Pass to…" another sister, or type the name of someone outside the app (e.g. "Mum")
- **Quantity:** items like 10 muslin wraps can be split between people: *Lend some* (who + how many), *Returned 1* / *Returned all*. Cards show e.g. "4 of 10 available".
- **Available / Not available** switch with an optional reason (using it myself, reserved, needs repair…), shown on the card and filterable
- **Views:** Everything · Free to borrow · On loan · Archive · Activity · People
- **Categories** (Sleep, Feeding, Out & about, Car seats, Nursery, Bath & changing, Play & toys, Clothes, Books, Safety, Other) with a quick filter row showing counts
- **Filters:** search, category, owned by, currently with, only items with photos, and sort (newest, recently changed, A–Z). Filters are remembered on each device.
- **Archive** with a reason (thrown away, given away, sold, not using, broken). You can bring things back.
- **Undo:** every change shows an Undo button, Ctrl/Cmd+Z undoes your last change, and each item's history (and the Activity feed) can undo its latest change. Deleting is soft, so deleted items can always be restored.
- **Live updates** when someone else makes a change
- **Invite-only logins:** on *People*, enter a name + email and tap *Invite*. The `invite-member` edge function creates a ready-to-use login with an easy password (e.g. `teddy-clover-4827`) and gives you a message to copy or text. No confirmation emails. *Reset password* next to a person issues a new one; anyone can change their own password. Only invited people can see anything (enforced by row level security).

## Cost

Everything runs on free tiers: Supabase Free (500MB database, 1GB photo storage, 50k monthly users), Netlify Free (hosting from a private repo) and Google sign-in. There are no paid APIs (the `link-photo` edge function is within Supabase's free 500k invocations/month). Supabase pauses a free project after a week with no visits; opening the dashboard and clicking *Restore* wakes it (data is kept).

## Stack

React + Vite + TypeScript, Supabase (auth, Postgres, storage, realtime). The schema is in `supabase/migrations/`.

## Run locally

```bash
npm install
npm run dev
```

## One-time setup

1. **Turn off public sign-ups:** Supabase → Authentication → Sign In / Providers → switch off *Allow new users to sign up*. Invites still work (they're created by the invite function).
2. **URLs:** in Supabase → Authentication → URL Configuration, set the Site URL to your Netlify address (e.g. `https://sisterhood-inventory.netlify.app/`).
3. **Hosting (free, works with a private repo):** sign up at netlify.com with GitHub → *Add new site* → *Import an existing project* → GitHub → pick this repo and allow access to it. The build settings come from `netlify.toml`, so just click *Deploy*. Rename the site under *Site configuration* (e.g. `sisterhood-inventory`). Every push to the production branch redeploys automatically.
4. **Invite everyone:** sign in, open *People*, and invite each sister. Text them the message it gives you.
