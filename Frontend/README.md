# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


// Placeholder for UI/UX analysis notes
// Major Issues:
// 1. Navigation inconsistencies:
//    - Broken Links:
//      - `index.html`:
//        - Line 9: `<link rel="preconnect" href="https://fonts.googleapis.com" />` (Verify if this is functional).
//        - Line 12: `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` (Check if the favicon path is valid).
//      - `src/components/layout/Sidebar.jsx`:
//        - Line 48: `<NavLink>` (Inspect if the `to` attribute leads to the correct route).
//      - `src/components/layout/Header.jsx`:
//        - Line 29: `<Link to="/login">Log in</Link>` (Ensure the `/login` route exists and works).
//    - Unexpected Pages:
//      - `src/utils/constants.js`:
//        - Line 41: `PLATFORMS` array (Check if all platform links are functional).
// 2. Poor Mobile Responsiveness:
//    - No specific files identified yet, but layouts in `Sidebar.jsx` and `Header.jsx` should be tested on smaller screens.
// 3. Lack of Accessibility:
//    - Missing ARIA labels:
//      - `src/components/layout/Sidebar.jsx`:
//        - Line 32: `<aside>` (Ensure `aria-label` is descriptive).
//      - `src/components/layout/Header.jsx`:
//        - Line 26: `<nav>` (Check `aria-label` for clarity).

// Minor Issues:
// 1. Misaligned Buttons:
//    - `src/styles/theme.js`:
//      - Line 56: `button` shadow styles (Check alignment consistency).
//    - `src/components/common/Button.jsx`:
//      - Line 1: Button styles (Inspect for alignment issues).
// 2. Inconsistent Font Sizes:
//    - `src/styles/globals.css`:
//      - Line 95: `font-size: 16px;` (Ensure consistency across components).
//      - Line 138-140: Font sizes for `h1`, `h2`, `h3` (Verify uniformity).
//    - `src/components/common/Badge.module.css`:
//      - Line 6: `font-size: var(--text-micro);` (Check if it matches design specs).
// 3. Missing Hover States:
//    - `src/styles/globals.css`:
//      - Line 155: `a:hover` (Ensure hover color is visible).
//      - Line 220: `::-webkit-scrollbar-thumb:hover` (Check hover effect visibility).
//    - `src/styles/theme.js`:
//      - Line 57: `buttonHover` shadow styles (Ensure hover feedback is noticeable).
