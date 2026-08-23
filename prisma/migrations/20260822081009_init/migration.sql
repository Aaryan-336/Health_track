-- CreateEnum
CREATE TYPE "CoupleStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "GoalOwnerType" AS ENUM ('PERSONAL', 'COUPLE');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('INDIVIDUAL', 'SHARED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('WATER', 'NUTRITION', 'FITNESS', 'ACTIVITY', 'HABIT', 'WELLNESS', 'RELATIONSHIP', 'DATE_ADVENTURE', 'QUALITY_TIME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProgressMode" AS ENUM ('MANUAL', 'AUTO_TRACKED', 'CHECK_IN');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('OWNER', 'PARTNER');

-- CreateEnum
CREATE TYPE "AcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER');

-- CreateEnum
CREATE TYPE "MoodType" AS ENUM ('VERY_SAD', 'SAD', 'LOW', 'NEUTRAL', 'GOOD', 'HAPPY', 'VERY_HAPPY');

-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('PRIVATE', 'STATUS_ONLY', 'STATUS_AND_NOTE');

-- CreateEnum
CREATE TYPE "ShareCategory" AS ENUM ('HEALTH_SCORE', 'WATER_TARGET', 'WATER_DETAIL', 'MEALS', 'WORKOUTS', 'HABITS', 'MOOD_STATUS', 'MOOD_NOTE', 'STREAKS');

-- CreateEnum
CREATE TYPE "ShareDetailLevel" AS ENUM ('NONE', 'STATUS', 'SUMMARY', 'DETAIL');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PromiseStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('NOTE', 'ENCOURAGEMENT', 'THINKING_OF_YOU', 'CELEBRATION', 'REMINDER');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('SEALED', 'OPENED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('HEALTH_REMINDERS', 'COUPLE_MESSAGES', 'GOAL_REMINDERS', 'HABIT_REMINDERS', 'CELEBRATIONS', 'DAILY_CHECK_IN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CUSTOM_MESSAGE', 'HEALTH_REMINDER', 'GOAL_REMINDER', 'HABIT_REMINDER', 'WATER_REMINDER', 'MEAL_REMINDER', 'WORKOUT_REMINDER', 'DAILY_CHECK_IN', 'COUPLE_UPDATE', 'GOAL_COMPLETED', 'OPEN_WHEN', 'CELEBRATION');

-- CreateEnum
CREATE TYPE "ScheduledStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CelebrationKind" AS ENUM ('GOAL_COMPLETED', 'MILESTONE_REACHED', 'CHALLENGE_WON', 'STREAK_MILESTONE', 'PROMISE_KEPT');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('POSITIVE_TREND', 'GENTLE_NUDGE', 'PATTERN', 'GOAL_PROGRESS');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('HONEY', 'BLUSH', 'LILAC', 'SAGE', 'SKY', 'CLAY');

-- CreateEnum
CREATE TYPE "ModePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "themePreference" "ThemePreference" NOT NULL DEFAULT 'BLUSH',
    "modePreference" "ModePreference" NOT NULL DEFAULT 'SYSTEM',
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "dailyWaterGoalMl" INTEGER NOT NULL DEFAULT 2000,
    "dailyMealGoal" INTEGER NOT NULL DEFAULT 3,
    "weeklyWorkoutGoal" INTEGER NOT NULL DEFAULT 4,
    "dailyActivityGoal" INTEGER NOT NULL DEFAULT 30,
    "glassSizeMl" INTEGER NOT NULL DEFAULT 250,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_relationships" (
    "id" UUID NOT NULL,
    "userAId" UUID NOT NULL,
    "userBId" UUID,
    "status" "CoupleStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "anniversary" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "couple_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_invites" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couple_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habits" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'sparkle',
    "colour" TEXT NOT NULL DEFAULT 'lilac',
    "frequencyRule" TEXT NOT NULL DEFAULT 'DAILY',
    "targetPerDay" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_completions" (
    "id" UUID NOT NULL,
    "habitId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localDate" VARCHAR(10) NOT NULL,

    CONSTRAINT "habit_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localDate" VARCHAR(10) NOT NULL,

    CONSTRAINT "water_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mealType" "MealType" NOT NULL,
    "description" TEXT NOT NULL,
    "feelsGood" BOOLEAN NOT NULL DEFAULT true,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localDate" VARCHAR(10) NOT NULL,

    CONSTRAINT "meal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "activityType" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "intensity" INTEGER NOT NULL DEFAULT 2,
    "note" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localDate" VARCHAR(10) NOT NULL,

    CONSTRAINT "activity_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mood_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "moodValue" "MoodType" NOT NULL,
    "stressValue" INTEGER NOT NULL DEFAULT 3,
    "note" TEXT,
    "shareMode" "ShareMode" NOT NULL DEFAULT 'PRIVATE',
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localDate" VARCHAR(10) NOT NULL,

    CONSTRAINT "mood_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "prompt" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "moodEntryId" UUID,
    "localDate" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "ownerType" "GoalOwnerType" NOT NULL,
    "goalType" "GoalType" NOT NULL,
    "coupleId" UUID,
    "creatorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '✨',
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'times',
    "deadline" TIMESTAMP(3),
    "recurrenceRule" TEXT,
    "progressMode" "ProgressMode" NOT NULL DEFAULT 'MANUAL',
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "themeId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_participants" (
    "id" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'OWNER',
    "acceptanceStatus" "AcceptanceStatus" NOT NULL DEFAULT 'ACCEPTED',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_contributions" (
    "id" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceId" UUID,
    "note" TEXT,
    "contributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localDate" VARCHAR(10) NOT NULL,

    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_milestones" (
    "id" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "thresholdPct" INTEGER NOT NULL,
    "reachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '🔥',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "targetRule" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL DEFAULT 7,
    "progressA" INTEGER NOT NULL DEFAULT 0,
    "progressB" INTEGER NOT NULL DEFAULT 0,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_checkins" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "localDate" VARCHAR(10) NOT NULL,
    "status" "CheckInStatus" NOT NULL DEFAULT 'DONE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promises" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "promiseText" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🤍',
    "status" "PromiseStatus" NOT NULL DEFAULT 'PROPOSED',
    "acceptedByUserAAt" TIMESTAMP(3),
    "acceptedByUserBAt" TIMESTAMP(3),
    "trackingRule" TEXT,
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'NOTE',
    "background" TEXT NOT NULL DEFAULT 'sunrise',
    "scheduledFor" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_when_letters" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "triggerLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "background" TEXT NOT NULL DEFAULT 'dusk',
    "status" "LetterStatus" NOT NULL DEFAULT 'SEALED',
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "open_when_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memories" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "caption" TEXT,
    "memoryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_media" (
    "id" UUID NOT NULL,
    "memoryId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_scores" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "localDate" VARCHAR(10) NOT NULL,
    "score" INTEGER NOT NULL,
    "componentJson" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_scores" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "localDate" VARCHAR(10) NOT NULL,
    "score" INTEGER NOT NULL,
    "componentJson" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couple_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "insightType" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'high',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celebrations" (
    "id" UUID NOT NULL,
    "coupleId" UUID,
    "goalId" UUID,
    "challengeId" UUID,
    "promiseId" UUID,
    "kind" "CelebrationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🎉',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "celebrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celebration_seen" (
    "id" UUID NOT NULL,
    "celebrationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "celebration_seen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sharing_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "category" "ShareCategory" NOT NULL,
    "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailLevel" "ShareDetailLevel" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sharing_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "eventType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quietStart" VARCHAR(5),
    "quietEnd" VARCHAR(5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_subscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'webpush',
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "deviceMetadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "relatedResourceType" TEXT NOT NULL,
    "relatedResourceId" UUID,
    "notificationType" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "payloadTemplate" JSONB NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "ScheduledStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "scheduledNotificationId" UUID,
    "subscriptionId" UUID,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'webpush',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "health_profiles_userId_key" ON "health_profiles"("userId");

-- CreateIndex
CREATE INDEX "couple_relationships_userAId_status_idx" ON "couple_relationships"("userAId", "status");

-- CreateIndex
CREATE INDEX "couple_relationships_userBId_status_idx" ON "couple_relationships"("userBId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "couple_invites_code_key" ON "couple_invites"("code");

-- CreateIndex
CREATE INDEX "couple_invites_code_status_idx" ON "couple_invites"("code", "status");

-- CreateIndex
CREATE INDEX "habits_ownerId_active_idx" ON "habits"("ownerId", "active");

-- CreateIndex
CREATE INDEX "habit_completions_userId_localDate_idx" ON "habit_completions"("userId", "localDate");

-- CreateIndex
CREATE INDEX "habit_completions_habitId_localDate_idx" ON "habit_completions"("habitId", "localDate");

-- CreateIndex
CREATE INDEX "water_entries_userId_localDate_idx" ON "water_entries"("userId", "localDate");

-- CreateIndex
CREATE INDEX "water_entries_userId_loggedAt_idx" ON "water_entries"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "meal_entries_userId_localDate_idx" ON "meal_entries"("userId", "localDate");

-- CreateIndex
CREATE INDEX "meal_entries_userId_loggedAt_idx" ON "meal_entries"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "activity_entries_userId_localDate_idx" ON "activity_entries"("userId", "localDate");

-- CreateIndex
CREATE INDEX "activity_entries_userId_loggedAt_idx" ON "activity_entries"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "mood_entries_userId_localDate_idx" ON "mood_entries"("userId", "localDate");

-- CreateIndex
CREATE INDEX "mood_entries_userId_loggedAt_idx" ON "mood_entries"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "journal_entries_userId_localDate_idx" ON "journal_entries"("userId", "localDate");

-- CreateIndex
CREATE INDEX "goals_creatorId_status_idx" ON "goals"("creatorId", "status");

-- CreateIndex
CREATE INDEX "goals_coupleId_status_idx" ON "goals"("coupleId", "status");

-- CreateIndex
CREATE INDEX "goal_participants_userId_acceptanceStatus_idx" ON "goal_participants"("userId", "acceptanceStatus");

-- CreateIndex
CREATE UNIQUE INDEX "goal_participants_goalId_userId_key" ON "goal_participants"("goalId", "userId");

-- CreateIndex
CREATE INDEX "goal_contributions_goalId_userId_idx" ON "goal_contributions"("goalId", "userId");

-- CreateIndex
CREATE INDEX "goal_contributions_goalId_contributedAt_idx" ON "goal_contributions"("goalId", "contributedAt");

-- CreateIndex
CREATE UNIQUE INDEX "goal_contributions_goalId_sourceType_sourceId_key" ON "goal_contributions"("goalId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_milestones_goalId_thresholdPct_key" ON "goal_milestones"("goalId", "thresholdPct");

-- CreateIndex
CREATE INDEX "challenges_coupleId_status_idx" ON "challenges"("coupleId", "status");

-- CreateIndex
CREATE INDEX "daily_checkins_coupleId_localDate_idx" ON "daily_checkins"("coupleId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_checkins_userId_localDate_key" ON "daily_checkins"("userId", "localDate");

-- CreateIndex
CREATE INDEX "promises_coupleId_status_idx" ON "promises"("coupleId", "status");

-- CreateIndex
CREATE INDEX "messages_coupleId_createdAt_idx" ON "messages"("coupleId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_recipientId_deliveredAt_idx" ON "messages"("recipientId", "deliveredAt");

-- CreateIndex
CREATE INDEX "messages_scheduledFor_deliveredAt_idx" ON "messages"("scheduledFor", "deliveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_messageId_userId_key" ON "message_reactions"("messageId", "userId");

-- CreateIndex
CREATE INDEX "open_when_letters_recipientId_status_idx" ON "open_when_letters"("recipientId", "status");

-- CreateIndex
CREATE INDEX "memories_coupleId_memoryDate_idx" ON "memories"("coupleId", "memoryDate");

-- CreateIndex
CREATE INDEX "memory_media_memoryId_sortOrder_idx" ON "memory_media"("memoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "daily_scores_userId_localDate_idx" ON "daily_scores"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_scores_userId_localDate_key" ON "daily_scores"("userId", "localDate");

-- CreateIndex
CREATE INDEX "couple_scores_coupleId_localDate_idx" ON "couple_scores"("coupleId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "couple_scores_coupleId_localDate_key" ON "couple_scores"("coupleId", "localDate");

-- CreateIndex
CREATE INDEX "ai_insights_userId_generatedAt_idx" ON "ai_insights"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "celebrations_coupleId_createdAt_idx" ON "celebrations"("coupleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "celebration_seen_celebrationId_userId_key" ON "celebration_seen"("celebrationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "sharing_preferences_userId_category_key" ON "sharing_preferences"("userId", "category");

-- CreateIndex
CREATE INDEX "audit_events_actorId_createdAt_idx" ON "audit_events"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_category_key" ON "notification_preferences"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "device_subscriptions_endpoint_key" ON "device_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "device_subscriptions_userId_active_idx" ON "device_subscriptions"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_notifications_dedupeKey_key" ON "scheduled_notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX "scheduled_notifications_status_scheduledFor_idx" ON "scheduled_notifications"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "scheduled_notifications_userId_status_idx" ON "scheduled_notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "notification_deliveries_userId_createdAt_idx" ON "notification_deliveries"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_relationships" ADD CONSTRAINT "couple_relationships_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_relationships" ADD CONSTRAINT "couple_relationships_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_entries" ADD CONSTRAINT "water_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mood_entries" ADD CONSTRAINT "mood_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_moodEntryId_fkey" FOREIGN KEY ("moodEntryId") REFERENCES "mood_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_participants" ADD CONSTRAINT "goal_participants_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_participants" ADD CONSTRAINT "goal_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promises" ADD CONSTRAINT "promises_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promises" ADD CONSTRAINT "promises_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_when_letters" ADD CONSTRAINT "open_when_letters_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_when_letters" ADD CONSTRAINT "open_when_letters_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_when_letters" ADD CONSTRAINT "open_when_letters_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_media" ADD CONSTRAINT "memory_media_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_scores" ADD CONSTRAINT "daily_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_scores" ADD CONSTRAINT "couple_scores_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couple_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrations" ADD CONSTRAINT "celebrations_promiseId_fkey" FOREIGN KEY ("promiseId") REFERENCES "promises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebration_seen" ADD CONSTRAINT "celebration_seen_celebrationId_fkey" FOREIGN KEY ("celebrationId") REFERENCES "celebrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebration_seen" ADD CONSTRAINT "celebration_seen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharing_preferences" ADD CONSTRAINT "sharing_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_subscriptions" ADD CONSTRAINT "device_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_scheduledNotificationId_fkey" FOREIGN KEY ("scheduledNotificationId") REFERENCES "scheduled_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "device_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
