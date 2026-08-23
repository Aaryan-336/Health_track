# Notifications and PWA Architecture

## Purpose
The app must support cute personalised notifications from one partner to the other.

## Requirements
- App must be installable as a PWA.
- User must explicitly grant notification permission.
- Each device stores its own push subscription.
- The server stores the subscription securely.
- A service worker receives background push events.
- Notification clicks open the relevant screen.

## Flow

```text
Partner A sends message
-> Message stored
-> Notification job created
-> Server finds Partner B device subscriptions
-> Web Push sent
-> Service Worker receives push
-> Cute notification displayed
-> Partner B taps notification
-> PWA opens message experience
```

## Important Limitation
The operating system controls the visual appearance of the actual notification. A PWA cannot guarantee a fully custom notification background in the system notification tray.

The solution is:
- Use notification title, body, icon and image where supported.
- On tap, open a fully custom in-app full-screen cute background experience.

## Scheduled Notifications

```text
Message scheduledFor timestamp
-> Background job checks due messages
-> Send push
-> Mark notification SENT
-> Update message sentAt
```

## Notification Preferences
Users can control:
- Health reminders
- Couple messages
- Goal reminders
- Habit reminders
- Quiet hours
- Notification categories
