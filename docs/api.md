# API Design

## Authentication
```text
POST /api/auth/sign-up
POST /api/auth/sign-in
POST /api/auth/sign-out
GET  /api/auth/me
```

## Profile
```text
GET    /api/profile
PATCH  /api/profile
GET    /api/privacy
PATCH  /api/privacy
```

## Couple
```text
POST /api/couples
POST /api/couples/invite
POST /api/couples/join
GET  /api/couples/current
PATCH /api/couples/current
```

## Goals
```text
GET    /api/goals
POST   /api/goals
GET    /api/goals/:id
PATCH  /api/goals/:id
DELETE /api/goals/:id
POST   /api/goals/:id/progress
POST   /api/goals/:id/participants
```

## Health Tracking
```text
GET  /api/water
POST /api/water
GET  /api/meals
POST /api/meals
GET  /api/workouts
POST /api/workouts
GET  /api/moods
POST /api/moods
GET  /api/journal
POST /api/journal
```

## Habits
```text
GET  /api/habits
POST /api/habits
PATCH /api/habits/:id
POST /api/habits/:id/complete
```

## Scores
```text
GET /api/scores/health
GET /api/scores/couple
GET /api/streaks
```

## Messages
```text
GET  /api/messages
POST /api/messages
POST /api/messages/:id/react
POST /api/messages/:id/read
```

## Open When
```text
GET  /api/open-when
POST /api/open-when
POST /api/open-when/:id/open
```

## Memories
```text
GET  /api/memories
POST /api/memories
DELETE /api/memories/:id
```

## Notifications
```text
POST   /api/notifications/subscribe
DELETE /api/notifications/subscribe
GET    /api/notifications/preferences
PATCH  /api/notifications/preferences
POST   /api/notifications/test
```

## API Rules
Every protected endpoint must validate authentication, ownership and couple membership before returning or mutating data.
