# Auth State Storage V1

## Goal

Document the current local persistence model for marketing-site auth, session, and billing state.

## File Location

The API stores auth state in:

`vault-example/yansilu-vault/.yansilu/auth-state.json`

When the active vault changes, the API switches to that vault's own:

`.yansilu/auth-state.json`

## Current Structure

The file now uses three logical layers:

1. `users`
2. `billingByUserId`
3. `sessions`

Example shape:

```json
{
  "users": [
    {
      "id": "user_example_com",
      "email": "example@example.com",
      "createdAt": "2026-05-08T00:00:00.000Z"
    }
  ],
  "billingByUserId": {
    "user_example_com": {
      "plan": "pro",
      "status": "active",
      "email": "example@example.com",
      "renewsAt": "2026-06-08T00:00:00.000Z"
    }
  },
  "sessions": [
    {
      "token": "auts_xxx",
      "userId": "user_example_com",
      "email": "example@example.com",
      "createdAt": "2026-05-08T00:00:00.000Z"
    }
  ]
}
```

## Why This Structure

This is a safer stepping stone than storing everything directly inside a session object.

It separates:

- user identity
- billing status
- session token lifecycle

That makes future changes easier:

- Stripe webhook sync
- multiple sessions per user
- customer portal support
- database migration

## Compatibility

The loader still accepts the older session-only shape and upgrades it in memory.

That means existing local state files do not need manual migration for now.

## Current Limitation

Billing is still keyed by email, not by a durable account id.
The runtime model now keys billing by internal `userId`, while still carrying `email` as a convenient attribute.
This is a better bridge toward a durable account system, but it is still a local JSON store rather than a true database.

## Recommended Next Step

Move this model from local JSON storage into a real database or structured store, and separate account identity from session lifecycle more formally.
