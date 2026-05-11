# Meshlyy MVP Changelog

## [Production Readiness Release] - April 2026

### 🛡️ Core Stability & Validation
- **Campaign Builder Strict Validation**: Refactored `CampaignBuilder.jsx` to enforce completion of all data fields across Steps 1, 2, and 3 (Target Audience, KPI, Budget, and Dates). The "Launch Campaign" button is actively disabled until every parameter is populated, completely preventing empty campaign creation.
- **Influencer Signup Security Check**: Integrated a `Confirm Password` field into the Influencer onboarding flow (`InfluencerSignupForm.jsx`). Form submission is blocked if passwords do not match, eradicating the risk of account lockouts from typos.
- **Form Error Standardization**: Fully removed brittle `alert()` popup validation across `LoginForm.jsx` and `BrandSignupForm.jsx`, substituting it with robust inline error feedback using the standard Neural Lattice `Input` error properties.

### 💾 Data Persistence & UX
- **Brand Profile Save Integration**: Wired the "Save Brand Profile" button in `BrandDashboard.jsx` to correctly trigger a `PATCH /profile/me` API call to the backend. Previously, this button only updated local React state, resulting in a silent failure.
- **Global Toast Notifications**: Implemented a lightweight, slide-in `Toast` component system to gracefully confirm API successes (like Profile Saves) and handle errors without interrupting user flow.
- **Loading Skeletons**: Standardized animated skeleton loaders across the platform to reduce perceived load times during API data fetching.

### ⚡ Extreme Performance Optimization
- **Image Compression**: Successfully ran deep Sharp optimization on `logo.png` and `element.png`. Assets that were originally ~1.5MB have been decimated to under ~30KB each. This directly removes over 3MB of blocking payload from the initial mobile load.
- **Lazy Routing & Code Splitting**: Overhauled `App.jsx` to dynamically load pages using `React.lazy` and `Suspense`. The Vite bundler now segments code per route, ensuring users only download the specific JS required for the page they land on.
- **Aurora Animation Hardware Throttling**: Wrapped the heavy `AuroraBackground` component with an `IntersectionObserver`. The animation physically stops calculating on the GPU when it scrolls out of view. Furthermore, it halves the CSS render layers for mobile devices and honors `prefers-reduced-motion` settings.

### 🧠 Chatbot & Intent Deflection
- **Expanded Strategy AI Triggers**: Modified the regex in `BrandAIAssistant.jsx`. Natural language inputs like *"create campaign"*, *"start campaign"*, and *"new campaign"* now successfully trigger the AI Strategy generation engine instead of yielding confused fallback messages.
- **Small Talk Suppression**: Both Brand and Influencer AI assistants now actively intercept "small talk" (hi, how are you, thanks) and respond locally. This explicitly guards against wasting expensive Gemini/Groq API credits on non-functional conversational inputs.

### 🛠️ New MVP Features
- **Public Waitlist Capture**: Slipped an integrated Waitlist UI into `LandingPage.jsx`. Connected to a brand new `/v1/waitlist` backend endpoint equipped with duplicate-email conflict resolution and rate limiting.
- **Direct-to-Cloudinary Upload System**: Engineered a custom `<FileUpload>` drag-and-drop component alongside a `useFileUpload` hook. It securely negotiates signed Cloudinary upload tokens from the backend and performs immediate streaming uploads for Brand Logos and Influencer Media Kits.
