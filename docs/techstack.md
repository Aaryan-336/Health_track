# Tech Stack

## Recommended Stack

### Frontend
- Next.js
- TypeScript
- React
- Tailwind CSS
- Framer Motion
- Zustand for lightweight client state

### PWA
- Web App Manifest
- Service Worker
- Push API
- Web Push Protocol

### Backend
- Next.js Server Actions and Route Handlers
- Background job worker for scheduled tasks

### Database
- PostgreSQL
- Prisma ORM

### Authentication
- Auth.js or Supabase Auth

### Storage
- Supabase Storage or Cloudflare R2

### Notifications
- Web Push using VAPID keys
- Service Worker for background notification display

### AI
- Groq or another low-latency LLM provider
- AI is optional and must never invent medical facts

### Deployment
- Vercel for Next.js
- Neon/Supabase for PostgreSQL
- Upstash/Redis only when queues or caching become necessary

## Architecture Rule
Do not introduce Redis, queues, microservices or a separate backend until the actual product requires them.
