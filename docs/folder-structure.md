# Recommended Project Structure

```text
app/
  (auth)/
  (app)/
    home/
    goals/
    letters/
    us/
    track/
  api/
    v1/
components/
  ui/
  health/
  couple/
  goals/
  messages/
  memories/
  layout/
features/
  auth/
  couple/
  tracking/
  goals/
  messaging/
  notifications/
  insights/
  memories/
lib/
  db/
  auth/
  validation/
  permissions/
  scores/
  notifications/
  ai/
  dates/
workers/
  notification-worker/
public/
  icons/
  manifest assets/
styles/
docs/
```

## Feature Module Pattern
Each major feature should contain:
- types
- schemas
- repository/data access
- service/business logic
- UI components
- tests

Avoid one giant `utils` directory.
