# AI QR Code

Merchant QR referral dashboard.

## Vercel settings

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Environment variables

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase setup

Run the SQL in `supabase/schema.sql` inside Supabase SQL Editor.

## First version flow

1. Create a merchant.
2. Paste the company AppsFlyer OneLink.
3. The app generates a public QR URL: `/m/merchant-name`.
4. When someone opens it, the scan is logged.
5. The visitor is redirected to the saved destination.

## Login

The first dashboard gate is:

```text
Username: Dinesh
Password: 654123
```

## Destination modes

- Normal app/link: use App Store URL, Play Store URL, or a fallback website URL.
- AppsFlyer later: paste OneLink and optional PID when the company provides them.
