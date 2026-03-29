# Auth Notes

MVP flow:
1. `verifyToken` validates JWT (Supabase JWKS integration TODO).
2. `loadAuthContext` loads mutable state from DB and attaches `req.authContext`.
3. Authorization checks read only `req.authContext`.

Post-MVP:
- Enable real subscription reads and enforcement in `subscriptionGuard`.
