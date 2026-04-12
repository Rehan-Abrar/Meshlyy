# Frontend Structure & Recent Changes

This document serves as an overview of the "well-mannered" file structure of the Meshlyy Frontend and tracks major organizational cleanups.

## Finalized Architecture
The frontend adheres to a strict 3-layer architecture:

- `src/components/`: Reusable, atomic UI elements (Buttons, Inputs, Cards).
- `src/layouts/`: Structural wrappers that manage the page shell, sidebars, and global backgrounds.
- `src/features/`: Complex, domain-specific modules. This is heavily divided by user role:
  - `brand/`: Dashboards, Campaign Builders, AI Assistant, Discovery.
  - `influencer/`: Dashboards, Campaign Feeds, Analytics, AI Content Tools.
  - `admin/`: Verification queues, System management.
  - `public/`: Landing pages, Authentication, Role selection.

## Organizational Cleanup (Phase 7)
*   **Redundant Components Removed**: Replaced the baseline `AIAssistant.jsx` with the role-specific `BrandAIAssistant.jsx` and `AIContentAssistant.jsx`.
*   **Asset Cleanup**: Removed default Vite and React SVGs.
*   **Project Root Hygiene**: Kept all GSD workflows (`.gsd`, `.agent`, `Skills`, `gsd-template`) and vital documentation (`PRD.md`, `PROJECT_RULES.md`) explicitly at the workspace root to preserve development functionality.
*   **GSD Plans Purged**: Removed implemented `PLAN.md` files from the `.gsd/phases` directory to save space and remove clutter.

> Maintained strict separation between `Frontend/` and `Backend/` directories.
