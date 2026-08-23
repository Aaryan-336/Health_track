# Data Model

## Primary Entities

```text
User
├── UserProfile
├── HealthProfile
├── PrivacySettings
├── Habit
├── HabitCompletion
├── WaterLog
├── MealLog
├── WorkoutLog
├── MoodCheckIn
├── JournalEntry
├── DailyHealthScore
├── DailyCheckIn
├── Notification
└── NotificationPreference

Couple
├── CoupleMembership
├── Goal
├── CoupleChallenge
├── CoupleMessage
├── OpenWhenLetter
├── Memory
├── CoupleScore
├── CouplePromise
└── CoupleCelebration

Goal
├── GoalParticipant
├── GoalProgress
├── GoalMilestone
└── GoalCelebration
```

## Core Rules

### User
A unique account with private personal data.

### Couple
A shared relationship space with a maximum of two active members.

### Goal
Can be `INDIVIDUAL` or `SHARED`, with a category, target, frequency, progress and participants.

### Health Logs
Water, meals, workouts, moods and habits are immutable or append-oriented logs where possible.

### Privacy
Health data is private by default. Sharing with a partner requires explicit consent.

### Derived Data
Daily health scores, couple scores and streaks are derived from source records and can be recalculated.

## Key Enums

```text
GoalType: INDIVIDUAL | SHARED
GoalStatus: DRAFT | ACTIVE | COMPLETED | PAUSED | CANCELLED | EXPIRED
GoalCategory: WATER | NUTRITION | FITNESS | ACTIVITY | HABIT | WELLNESS | RELATIONSHIP | DATE_ADVENTURE | QUALITY_TIME | CUSTOM
MealType: BREAKFAST | LUNCH | DINNER | SNACK | OTHER
MoodType: VERY_SAD | SAD | LOW | NEUTRAL | GOOD | HAPPY | VERY_HAPPY
NotificationType: CUSTOM_MESSAGE | HEALTH_REMINDER | GOAL_REMINDER | HABIT_REMINDER | WATER_REMINDER | MEAL_REMINDER | WORKOUT_REMINDER | DAILY_CHECK_IN | COUPLE_UPDATE | GOAL_COMPLETED | OPEN_WHEN | CELEBRATION
```

## Important Indexes

```text
userId + date
coupleId + date
goalId + userId
userId + loggedAt
scheduledFor + status
```

## Data Flow

```text
Health Event
  -> Create Log
  -> Update Relevant Goal Progress
  -> Recalculate Score
  -> Check Streak
  -> Check Milestone
  -> Create Celebration / Notification
```
