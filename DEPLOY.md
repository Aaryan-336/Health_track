# Deploying Bloom

```text
Vercel   →  the Next.js app (UI, API routes, server actions)
Supabase →  PostgreSQL + a private Storage bucket for memory photos
GitHub   →  a scheduled Action that drives the notification dispatcher
```

The app is a single Next.js process — the UI and the API are the same server —
so there is no separate backend to deploy. Everything below fits on free tiers.

---

## 1 · Supabase (database + photo storage)

1. Create a project at <https://supabase.com/dashboard>. Save the database
   password it shows you — it appears once.
2. **Project settings → Database → Connection string → URI.** You need two
   forms of it:
   - **Pooled** (port `6543`, "Transaction" mode) → this becomes `DATABASE_URL`.
     Append `?pgbouncer=true&connection_limit=1` — serverless functions open a
     lot of short-lived clients and will exhaust the pool without it.
   - **Direct** (port `5432`) → this becomes `DIRECT_URL`. Migrations need a
     real session and cannot run through the pooler.
3. **Storage → New bucket** → name it `memories` and leave **Public** *off*.
   Photos are couple-private and are served through the app's authorised
   `/api/v1/media/[id]` route, never from a public URL.
4. **Project settings → API** → copy the **Project URL** (`SUPABASE_URL`) and
   the **`service_role`** key (`SUPABASE_SERVICE_ROLE_KEY`). The service-role
   key bypasses row-level security — it belongs only in server environment
   variables, never in the browser and never in the repo.

## 2 · Generate the secrets

Run these locally and keep the output somewhere safe:

```bash
openssl rand -base64 48     # AUTH_SECRET
openssl rand -hex 24        # CRON_SECRET
npm run vapid               # VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY
```

Generate a **fresh** VAPID pair for production — do not reuse the development
keys in `.env`.

## 3 · Vercel (the app)

1. <https://vercel.com/new> → import `Aaryan-336/Health_track`. Framework is
   detected as Next.js; leave the defaults.
2. **Settings → Build & Development Settings → Build Command → Override** with:

   ```
   npm run vercel-build
   ```

   That runs `prisma generate && prisma migrate deploy && next build`, so every
   deploy applies pending migrations before the app goes live.
3. Add the environment variables below (Production, Preview and Development).

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase **pooled** URI + `?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | Supabase **direct** URI (port 5432) |
   | `AUTH_SECRET` | from step 2 |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-project>.vercel.app` |
   | `VAPID_SUBJECT` | `mailto:you@example.com` |
   | `VAPID_PUBLIC_KEY` | from `npm run vapid` |
   | `VAPID_PRIVATE_KEY` | from `npm run vapid` |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **the same value** as `VAPID_PUBLIC_KEY` |
   | `STORAGE_DRIVER` | `supabase` |
   | `STORAGE_BUCKET` | `memories` |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key |
   | `CRON_SECRET` | from step 2 |
   | `AI_API_KEY` | optional — leave empty for the non-AI insight copy |

   `NEXT_PUBLIC_APP_URL` has to match the real origin, and the VAPID public key
   genuinely goes in twice: the server signs with it, and the browser needs it
   to subscribe.
4. Deploy. The first build creates every table from `prisma/migrations`.

## 4 · Your accounts

Do **not** run `npm run db:seed` against production — it creates two fictional
people with a published password. Instead:

1. Open the deployed app, `/sign-up`, and create your account.
2. Finish onboarding, then **Together → create an invite code**.
3. She signs up on her phone and enters the code. That is the only way two
   accounts get linked.

## 5 · The notification tick

Scheduled notes, "open when" letters and daily reminders are delivered by a
dispatcher pass. On free tiers, GitHub Actions runs it:

1. Repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `APP_URL` = `https://<your-project>.vercel.app`
   - `CRON_SECRET` = the same value you gave Vercel
2. **Actions** tab → enable workflows → run **Notification tick** once by hand
   to confirm it returns `HTTP 200`.

It then runs about every 15 minutes. Two caveats worth knowing: GitHub queues
scheduled runs, so the timing is approximate, and it disables schedules in
repositories with no activity for 60 days.

The same work is available as a long-running process — `npm run worker` — if
you would rather host it somewhere. See `render.yaml` for a Render worker or
cron job; note that neither is on Render's free tier, because a free Render
service sleeps after ~15 minutes of inactivity and would stop ticking.

## 6 · Install it on your phones

Push notifications on iOS only work once the app is installed to the home
screen — Safari will not offer them to a normal tab.

1. Open the Vercel URL in Safari → **Share → Add to Home Screen**.
2. Open it from the home screen icon.
3. **You → Notifications → Turn on**, then **Send a test**.

## 7 · Before you call it done

- [ ] Sign-up, onboarding and the invite-code link both ways
- [ ] Log water, a meal, a workout, a mood check-in; confirm the home score moves
- [ ] **Privacy & sharing**: turn a category off and confirm it disappears from
      her view of you — this is enforced server-side, so it should be immediate
- [ ] Send a note; open it on the other phone; react to it
- [ ] Add a memory with a photo and confirm it loads (Supabase Storage)
- [ ] Push: turn on, send a test, tap it, confirm it deep-links into the note
- [ ] Turn on **Point-in-Time Recovery** or take a Supabase backup

## Gotchas

- **`prisma migrate deploy` fails on the pooled URL.** That is what `DIRECT_URL`
  is for; check it points at port 5432.
- **"Too many connections".** `connection_limit=1` is missing from the pooled
  `DATABASE_URL`.
- **Push works on desktop but not iPhone.** The app has to be launched from the
  home-screen icon, not a Safari tab.
- **Photos upload but do not display.** `STORAGE_DRIVER` is not `supabase`, the
  bucket name does not match `STORAGE_BUCKET`, or the key used is the `anon` key
  rather than `service_role`.
- **Existing local photos.** Anything uploaded in development lives in `./storage`
  and is not migrated; production starts with an empty bucket.
