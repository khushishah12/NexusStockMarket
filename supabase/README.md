# Supabase setup

## 1. Create a project

Create a project at [supabase.com](https://supabase.com) and copy the **Project URL** and **anon public** key.

## 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 3. Apply migrations

**Hosted project (SQL Editor):** paste and run `migrations/20260522000000_initial_schema.sql`.

**CLI:**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## 4. Auth settings

In Supabase Dashboard → **Authentication** → **URL Configuration**, set:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/login`, `http://localhost:3000/signup`, `http://localhost:3000/dashboard`

## 5. Install dependencies & run

```bash
npm install
npm run dev
```

Unauthenticated visits to `/dashboard` redirect to `/login`. After sign-up or log-in, users can access protected routes.
