# System Architecture

## High-Level Architecture

```text
Next.js PWA
    |
    | HTTPS / Server Actions / API
    v
Application Backend
    |
    +--> PostgreSQL
    +--> Object Storage
    +--> Push Notification Service
    +--> AI Provider
```

## Recommended Architecture

### Frontend
Next.js with TypeScript and App Router. The app is installable as a PWA and uses responsive mobile-first layouts.

### Backend
Use Next.js route handlers/server actions for the first production version. This keeps the architecture simple. Extract a dedicated backend only if scaling or background processing requires it.

### Database
PostgreSQL with Prisma ORM.

### Storage
Object storage for avatars and memory photos.

### Background Jobs
A worker or scheduled job handles:
- Scheduled messages
- Reminder notifications
- Daily score recalculation
- Streak checks
- Celebration generation

### Push Notifications
PWA Push API + Service Worker + Web Push delivery.

## Main Request Flow

```text
User Action
  -> Authentication Check
  -> Input Validation
  -> Ownership / Couple Permission Check
  -> Database Transaction
  -> Derived Data Recalculation
  -> Notification or Celebration Event
  -> Updated UI
```

## Domain Modules

```text
Auth
Profiles
Couples
Goals
Habits
Health Tracking
Mood & Journal
Scores
Messages
Open When Letters
Memories
Notifications
Privacy
AI Insights
```

## Design Principle
Keep source-of-truth data separate from derived data. Logs are source data; daily scores, streaks and couple summaries are derived data.
