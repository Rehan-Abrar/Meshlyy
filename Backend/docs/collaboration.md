# Collaboration State Machine

`PENDING` -> `ACCEPTED` | `DECLINED` | `CLARIFICATION_REQUESTED`

Rules:
- `DECLINED` is terminal for the same campaign.
- `CLARIFICATION_REQUESTED` can return to `PENDING` after brand response.
