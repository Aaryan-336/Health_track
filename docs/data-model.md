# Data Model

# 1. Core Design
Use UUID primary keys, `created_at`, `updated_at`, and soft deletion/archive fields where appropriate.

# 2. Users
## users
- id
- email/auth_provider_id
- display_name
- avatar_url
- timezone
- theme_preference
- created_at
- updated_at

# 3. Couple Relationship
## couple_relationships
- id
- user_a_id
- user_b_id
- status: pending, active, paused, ended
- created_at
- activated_at
- ended_at

Enforce that a user has only one active relationship in MVP.

## couple_invites
- id
- sender_id
- recipient identifier
- status
- expires_at

# 4. Tracking
## habits
- id
- owner_id
- title
- icon
- colour
- frequency_rule
- active

## habit_completions
- id
- habit_id
- user_id
- completed_at
- local_date

## water_entries
- id
- user_id
- amount_ml
- logged_at
- local_date

## meal_entries
- id
- user_id
- meal_type
- description
- logged_at

## activity_entries
- id
- user_id
- activity_type
- duration_minutes
- intensity
- logged_at

## mood_entries
- id
- user_id
- mood_value
- stress_value
- note
- logged_at
- share_mode

## journal_entries
- id
- user_id
- title
- content
- mood_entry_id
- is_shared
- created_at

# 5. Goals
## goals
- id
- owner_type: personal, couple
- couple_id nullable
- creator_id
- title
- description
- category
- goal_type
- target_value
- current_value
- unit
- deadline
- recurrence_rule
- progress_mode
- status
- theme_id

## goal_participants
- id
- goal_id
- user_id
- role
- acceptance_status

## goal_contributions
- id
- goal_id
- user_id
- value
- source_type
- source_id nullable
- note
- contributed_at

`source_type` allows a goal to be linked to a manual action or a tracked event without exposing unrelated private data.

# 6. Challenges
## challenges
- id
- couple_id
- title
- description
- start_at
- end_at
- target_rule
- status

# 7. Check-ins and Promises
## daily_checkins
- id
- user_id
- couple_id
- local_date
- status
- note

## promises
- id
- couple_id
- creator_id
- title
- promise_text
- status: proposed, active, completed, archived
- accepted_by_user_a_at
- accepted_by_user_b_at
- tracking_rule

# 8. Messages
## messages
- id
- couple_id
- sender_id
- recipient_id
- body
- message_type
- scheduled_for nullable
- delivered_at
- opened_at

## open_when_letters
- id
- couple_id
- sender_id
- recipient_id
- trigger_label
- title
- body
- status

## message_reactions
- id
- message_id
- user_id
- reaction

# 9. Notifications
## notification_preferences
- user_id
- category
- enabled
- quiet_start
- quiet_end

## device_subscriptions
- id
- user_id
- provider
- endpoint/token
- device_metadata
- active
- last_seen_at

## scheduled_notifications
- id
- user_id
- related_resource_type
- related_resource_id
- scheduled_for
- payload_template
- status

## notification_deliveries
- id
- scheduled_notification_id nullable
- user_id
- provider
- status
- sent_at
- delivered_at nullable
- error

# 10. Memories
## memories
- id
- couple_id
- creator_id
- caption
- memory_date
- created_at

## memory_media
- id
- memory_id
- storage_key
- media_type
- sort_order

# 11. Scores and Insights
## daily_scores
- id
- user_id
- local_date
- score
- component_json
- calculated_at

## couple_scores
- id
- couple_id
- local_date
- score
- component_json

## ai_insights
- id
- user_id
- insight_type
- title
- body
- evidence_json
- generated_at
- dismissed_at

# 12. Privacy
## sharing_preferences
- id
- user_id
- category
- share_enabled
- detail_level

## audit_events
- id
- actor_id
- event_type
- resource_type
- resource_id
- metadata_json
- created_at
