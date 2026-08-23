# Security and Privacy

## Core Principle
The app handles personal wellness information. Data must be private by default.

## Access Control

### Personal Data
Only the owner can access personal health logs unless that specific data type or record is explicitly shared.

### Couple Data
Only active members of the same couple can access shared goals, messages, memories, promises and challenges.

### Authorization
Every server request must validate:
1. Authenticated user
2. Requested resource
3. Resource ownership or active couple membership
4. Explicit sharing permission where required

## Sensitive Data Rules
- Never expose private journal content to a partner without sharing.
- Never expose mood data without consent.
- Never expose one user's health history simply because they are connected as a couple.
- Store passwords only through the authentication provider.
- Store secrets only in environment variables.
- Encrypt data in transit with HTTPS.

## Deletion
Users should be able to delete personal records. Ending a couple connection should revoke future access to private and shared resources according to the chosen product policy.
