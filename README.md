# Cloud Search

A tiny, keyboard-first search app for very small screens, hosted on Vercel.

## Features

- Three search modes in one bar: **DDG** (default), **Google**, and **URL** (open the typed address directly).
- Cloud **search history** (last 100 entries), shared across all your phones via Supabase.
- Cloud **bookmarks** (last 100) with custom names.
- Turn any history entry into a bookmark with the `☆` button — the name and URL are prefilled for you to confirm.
- Built for ~240×360 viewports and full tab/keyboard navigation; touch also works.

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it. This creates the tables and the anon RLS policies.
3. Go to **Project Settings → API Keys** (or the **Connect** dialog) and copy your keys.

The app accepts either key setup:

| Setup | Environment variables |
| --- | --- |
| Secret key (recommended if available) | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (`sb_secret_...`) |
| Publishable key only | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) |
| Legacy keys | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

A publishable key runs as the `anon` Postgres role, so it needs the anon policies from `supabase/schema.sql`. A secret key bypasses RLS. Both are read only in server API routes — neither key is required in client code.

> New Supabase projects show `sb_publishable_...` / `sb_secret_...` keys. If you only see the publishable key, use Setup 2 above — no secret key is required.

### 2. Local development

```bash
cp .env.local.example .env.local
# fill in the two values from step 1
npm install
npm run dev
```

Open http://localhost:3000.

### 3. Deploy to Vercel (GitHub repo)

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Add the environment variables from the table above — for example `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Deploy. Open the Vercel URL in your phone's cloud-apps service.

## Keyboard

| Key | Action |
| --- | --- |
| `Tab` | Move through every control in order |
| `/` or `Ctrl/Cmd + K` | Focus the search box |
| `↑` / `↓` | Walk through history (or bookmark) rows |
| `Enter` | Run a search, open a bookmark, or submit a form |
| `Esc` | Blur the current input |

The segmented controls (search mode, History/Links) also respond to arrow keys because they are radio groups. A skip link appears at the top when focused.

## Notes

- Direct URLs are normalized to `http(s)` and rejected if they use another scheme.
- History saves are best-effort: a storage failure will not stop a search from opening.
- The API routes are intentionally open (single user, no token). Anyone with the URL can read or clear your history.
