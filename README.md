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

## Live security model

- Public visitors can only open active QR links and log scan events.
- Dashboard users must log in and receive an 8-hour session token.
- Admin-only actions, like creating access users, are checked inside Supabase.
- Direct public table reads/writes are blocked with Row Level Security.
- Passwords are stored as hashes through Supabase/Postgres, not as plain text.

## Flow

1. Create a merchant.
2. Paste the destination link, or use a Branch link when the client provides one.
3. The app generates a public QR URL: `/m/merchant-name`.
4. When someone opens it, the scan is logged.
5. The visitor is redirected to the saved destination.

## Login

Create the first admin user directly in Supabase, then create additional users from the `Access` tab. Do not ship default passwords in production.

## Destination modes

- Normal app/link: use App Store URL, Play Store URL, or a fallback website URL.
- Branch later: paste Branch attribution link and optional channel/source when the company provides them.
