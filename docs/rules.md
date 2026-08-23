# Development Rules

1. Use TypeScript throughout the application.
2. Keep components small and reusable.
3. Validate all external input.
4. Never trust client-side authorization.
5. Every database mutation must verify ownership.
6. Couple data must verify active couple membership.
7. Private health data is private by default.
8. AI output must never be presented as medical diagnosis.
9. Derived scores must be reproducible from source data.
10. Use transactions for multi-step critical operations.
11. Do not expose secrets to the client.
12. Do not store push subscriptions in local-only state.
13. Use optimistic UI only with reliable rollback.
14. Respect timezone boundaries when calculating daily logs and streaks.
15. Use UTC in storage and convert at the user interface boundary.
16. Keep notification delivery idempotent.
17. Use soft deletion or explicit status transitions where history matters.
18. Do not over-engineer microservices for the initial product.
19. Test all privacy boundaries.
20. Prioritise mobile-first UI.
