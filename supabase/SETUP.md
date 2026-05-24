# Supabase setup (step by step)

## Why you don’t see a project under the Vercel org

The URL you opened looks like:

`https://supabase.com/dashboard/org/vercel_icfg_...`

That is **Vercel’s integration organization**, not your personal Supabase account. A project only appears there if you:

1. Connected **Supabase** from the **Vercel** dashboard (Project → Integrations / Storage → Supabase), **and**
2. Linked it to a **deployed Vercel app**.

This repo (`ai-stock-dashboard-3d`) was created **locally**. It is **not** automatically linked to that Vercel org until you either:

- **Option A (recommended for local dev):** Create a Supabase project in your **personal** Supabase account, or  
- **Option B:** Deploy this app to Vercel and add the Supabase integration there (then the project shows under `vercel_icfg_...`).

---

## Option A — Personal Supabase project (local development)

### Step 1: Open the right dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Top-left: open the **organization** dropdown.
3. Choose your **personal** org (your name), **not** `vercel_icfg_...`.

### Step 2: Create a project

1. Click **New project**
2. **Name:** `nexus-ai` (or any name)
3. **Database password:** choose a strong password (save it somewhere safe)
4. **Region:** pick one close to you
5. Click **Create new project** and wait ~2 minutes until status is **Active**

### Step 3: Copy API keys

1. In the project, go to **Project Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key (under Project API keys) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   Do **not** use the `service_role` key in the Next.js app.

Direct link pattern:  
`https://supabase.com/dashboard/project/<your-project-id>/settings/api`

### Step 4: Create `.env.local` in this repo

In the project root (`ai-stock-dashboard-3d`), create a file named **`.env.local`**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your real values from Step 3. No quotes needed.

### Step 5: Restart the dev server

Env vars load only at startup:

```bash
# Stop the running server (Ctrl+C), then:
npm run dev
```

### Step 6: Run the database migrations

1. Supabase dashboard → **SQL Editor** → **New query**
2. Run **both** files in order:
   - `supabase/migrations/20260522000000_initial_schema.sql` (profiles + auth trigger)
   - `supabase/migrations/20260522100000_dashboard_schema.sql` (watchlist table)
3. Click **Run** for each

### Step 7: Auth URL settings

1. **Authentication** → **URL Configuration**
2. **Site URL:** `http://localhost:3000`
3. **Redirect URLs** (add each):
   - `http://localhost:3000/**`
   - `http://localhost:3000/login`
   - `http://localhost:3000/signup`
   - `http://localhost:3000/dashboard`

### Step 8: Test

1. Open [http://localhost:3000/signup](http://localhost:3000/signup)
2. Sign up with email + password (meet all password rules)
3. You should land on `/dashboard`

---

## Option B — Vercel integration (project under `vercel_icfg_...`)

Use this if you deploy on Vercel and want the project in that org.

### Step 1: Push repo to GitHub

Ensure `ai-stock-dashboard-3d` is in a GitHub repository.

### Step 2: Import on Vercel

1. [https://vercel.com/new](https://vercel.com/new)
2. Import the GitHub repo
3. Deploy (defaults are fine for Next.js)

### Step 3: Add Supabase on Vercel

1. Vercel → your project → **Storage** or **Integrations**
2. **Connect** / **Create** Supabase database
3. Vercel creates the Supabase project and injects env vars into the Vercel project

### Step 4: Pull env vars for local dev

```bash
npx vercel env pull .env.local
```

Or copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Vercel → Project → **Settings** → **Environment Variables** into `.env.local`.

### Step 5: Migration + restart

Same as Option A **Step 6–8** (run SQL migration, configure auth URLs, restart `npm run dev`).

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Runtime error about URL/API key | `.env.local` missing or wrong; restart `npm run dev` |
| Project not in `vercel_icfg` org | Normal for local-only repos; use personal org or Vercel integration |
| Sign up works but no profile row | Run the migration SQL in Step 6 |
| Email confirmation required | Dashboard → **Authentication** → **Providers** → Email → disable “Confirm email” for testing |

---

## Checklist

- [ ] Personal Supabase project created (or Vercel integration connected)
- [ ] `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Dev server restarted after adding env
- [ ] Migration SQL executed
- [ ] Auth redirect URLs include `http://localhost:3000`
