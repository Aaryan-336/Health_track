# AI Insights Architecture

# 1. Purpose
AI exists to explain user patterns in simple language. It does not replace a doctor and does not diagnose.

# 2. Allowed Inputs
Only data the current user is authorised to use:
- Their own tracked aggregates
- Their own mood/stress history
- Their own habits and goals
- Shared goal data where relevant

Partner private data must not be inserted into another user's AI context.

# 3. Insight Examples
- “You completed more habits this week than last week.”
- “Your mood check-ins were generally higher on days when you logged activity.”
- “Your water tracking has been less consistent this week.”
- “You are close to completing your shared goal.”

Avoid:
- “Your low mood is caused by poor sleep.”
- “You may have a medical condition.”
- Treatment recommendations.

# 4. Pipeline
1. Scheduled or on-demand trigger.
2. Server aggregates relevant data.
3. Rules engine identifies candidate trends.
4. AI converts validated evidence into friendly language.
5. Response must follow a structured schema.
6. Safety validator rejects unsupported claims.
7. Insight is stored with evidence metadata.

# 5. Structured Output
```json
{
  "title": "Small win this week",
  "body": "You completed 5 more habits than last week.",
  "type": "positive_trend",
  "evidence": ["habit_completion_count"],
  "confidence": "high"
}
```

# 6. Design Rule
Use deterministic calculations for numbers. AI should explain calculated results, not invent them.
