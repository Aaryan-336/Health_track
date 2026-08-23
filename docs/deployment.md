# Deployment

## Recommended Initial Production Setup

```text
Frontend + Application
-> Vercel

Database
-> Neon or Supabase PostgreSQL

Object Storage
-> Supabase Storage or Cloudflare R2

Push
-> Web Push + VAPID

Background Jobs
-> Vercel Cron or dedicated worker when needed
```

## Environment Variables

```text
DATABASE_URL
AUTH_SECRET
NEXT_PUBLIC_APP_URL
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
STORAGE_BUCKET
AI_API_KEY
```

## Deployment Checklist
- HTTPS enabled
- Production database migrations applied
- Environment variables configured
- PWA manifest verified
- Service worker verified
- Push permission flow tested
- Scheduled notification job tested
- Database backups enabled
- Error monitoring enabled
- Privacy authorization tests passed
