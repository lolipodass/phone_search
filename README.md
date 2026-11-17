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
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

> The service-role key is server-only. It is used in API routes and never sent to the browser.

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
3. Add the environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
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
