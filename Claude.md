# Unhooked - Developer Reference Guide

## Project Overview

**Unhooked** is a nicotine cessation application built to help users break free from nicotine addiction—not through willpower, but by eliminating the desire itself. The app combines AI-powered conversational support with optional text-based reflection journaling.

**Core Philosophy:** Users engage with an AI coach that guides them through the mental reprogramming needed to quit smoking/vaping permanently.

---

## Tech Stack

- **Framework:** Nuxt 3 (Vue 3 with TypeScript)
- **Styling:** Tailwind CSS with custom design tokens
- **Fonts:** Inter (Google Fonts)
- **Deployment:** Vercel
- **Authentication:** Supabase Auth (Phase 1.2+)
- **Database:** Supabase PostgreSQL (Phase 1.2+)
- **AI Providers:** Gemini, Anthropic Claude, OpenAI GPT (Phase 1.3+)

---

## Architecture Decisions

### Repository Structure
- **Standalone repository** (not a monorepo)
- Independent git repository separate from other projects
- Clean separation of concerns: `/components`, `/pages`, `/layouts`, `/server/api`

### TypeScript Configuration
- Relying on **Nuxt 3's default TypeScript setup** (no custom `tsconfig.json`)
- TypeScript used for all server files (`.ts` extension)
- Vue components use `<script setup lang="ts">` syntax

### Error Handling
- Global error page ([error.vue](error.vue)) for graceful degradation
- Friendly error messages with "Go back home" CTA
- Clear error boundary prevents white screens during development

### Future Architecture (Phase 1.3+)
- **Real-time chat:** WebSocket or Server-Sent Events for AI conversations
- **Dual interface:** Real-time chat + optional text-based journaling
- **Multi-provider AI:** Route to Gemini, Claude, or GPT based on context/preferences

---

## Brand Design System

### Color Palette

#### Background
- **Deep teal gradient:** `radial-gradient(circle at top, #104e54 0%, #041f21 100%)`
- Applied globally via `body` in [assets/css/main.css](assets/css/main.css)

#### Tailwind Tokens
```javascript
colors: {
  brand: {
    'bg-light': '#104e54',      // Gradient start
    'bg-dark': '#041f21',        // Gradient end
    'accent': '#fc4a1a',         // Primary orange
    'accent-light': '#f7b733',   // Orange gradient endpoint
    'glass': 'rgba(13, 92, 99, 0.35)',       // Card backgrounds
    'glass-input': 'rgba(31, 108, 117, 0.5)', // Input backgrounds
    'border': 'rgba(255, 255, 255, 0.1)',     // Subtle borders
    'border-strong': 'rgba(255, 255, 255, 0.4)', // Emphasized borders
  },
  'white-85': 'rgba(255, 255, 255, 0.85)',  // Secondary text
  'white-65': 'rgba(255, 255, 255, 0.65)',  // Tertiary text
}
```

### Typography
- **Font Family:** Inter (weights: 400, 500, 600, 700)
- **Headings:** Bold (600+), large sizing
- **Hero H1:** `text-hero` (2.75rem desktop), `text-hero-mobile` (1.9rem mobile)
- **Eyebrow Text:** `.eyebrow` class
  - Uppercase, `letter-spacing: 0.35em`, `font-size: 0.55rem`, `opacity: 0.65`
- **Body Text:** `text-white` for primary, `text-white-85` / `text-white-65` for secondary/tertiary

### UI Components

#### Buttons
- **Shape:** Pill-shaped (`rounded-pill` = `border-radius: 9999px`)
- **Primary Button:** `.btn-primary` class
  - Gradient: `linear-gradient(135deg, #fc4a1a, #f7b733)`
  - Hover: `scale(1.02)` with `ease-out` transition

#### Cards
- **Shape:** `rounded-card` = `border-radius: 24px`
- **Background:** `.glass` class with `backdrop-filter: blur(12px)`
- **Shadow:** `shadow-card` = `0 24px 64px rgba(0, 0, 0, 0.25)`
- **Border:** `border-brand-border` for subtle outline

#### Inputs
- **Shape:** Pill-shaped (`rounded-pill`)
- **Background:** `.glass-input` class with `backdrop-filter: blur(12px)`
- **Text:** White (`text-white`)

#### Animations
- **Fade-in on page load:** `.animate-fade-in-up` class
- **Transition style:** Soft fades, `ease-out` timing
- Defined in [assets/css/main.css](assets/css/main.css)

---

## File Structure Conventions

```
unhooked/
├── .env                    # Environment variables (not committed)
├── .env.example            # Template for environment setup
├── .gitignore              # Git ignore rules
├── nuxt.config.ts          # Nuxt configuration
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind theme customization
├── app.vue                 # Root app component
├── error.vue               # Global error page
├── assets/
│   └── css/
│       └── main.css        # Global styles and utilities
├── pages/
│   ├── index.vue           # Home/landing page
│   └── dashboard.vue       # Main dashboard (chat interface)
├── layouts/
│   └── default.vue         # Default layout with header
├── components/
│   └── AppHeader.vue       # Global header component
├── server/
│   └── api/
│       └── health.get.ts   # Health check endpoint
└── public/
    └── favicon.ico         # Site favicon
```

---

## Coding Standards

### Vue Components
- **Composition API only:** Use `<script setup>` syntax
- **TypeScript:** Always use `<script setup lang="ts">` for type safety
- **No Options API:** Stick to modern Composition API patterns

### Styling
- **Tailwind-first:** Use Tailwind utility classes for all styling
- **No scoped CSS:** Avoid `<style scoped>` tags unless absolutely necessary
- **Design tokens:** Always use `brand-*` tokens or `white-*` opacity variants
- **Global utilities:** Define reusable classes in [assets/css/main.css](assets/css/main.css)

### Component Organization
- **One component per file**
- **Auto-imported:** Components in `/components` are globally available (no imports needed)
- **Naming:** PascalCase for components (e.g., `AppHeader.vue`)

### Server API Routes
- **File-based routing:** `server/api/health.get.ts` → `/api/health`
- **TypeScript:** Use `.ts` extension for all server files
- **Event handlers:** Use `defineEventHandler()` from Nuxt

---

## Environment Variables

Defined in `.env` (not committed) and `.env.example` (committed template):

```bash
# Supabase (Phase 1.2+)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# LLM Providers (Phase 1.3+)
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

### Runtime Config
Server-side secrets are accessed via `useRuntimeConfig()`:
```typescript
const config = useRuntimeConfig()
config.geminiApiKey        // Server-side only
config.anthropicApiKey     // Server-side only
config.openaiApiKey        // Server-side only
config.supabaseUrl         // Server-side only
config.supabaseAnonKey     // Server-side only
config.public.appUrl       // Client-accessible
```

---

## Responsive Design

### Breakpoints
- **Mobile-first approach**
- **Focus on two breakpoints:**
  - Mobile (default)
  - Desktop (`md:` breakpoint and above)
- **No tablet-specific styles** (unless explicitly required later)

### Example Usage
```vue
<h1 class="text-hero-mobile md:text-hero">
  Unhooked
</h1>
```

---

## Development Workflow

### Local Development
```bash
npm run dev
```
Starts dev server at `http://localhost:3000`

### Build
```bash
npm run build
```
Builds for production

### Preview Production Build
```bash
npm run preview
```

### Type Generation
```bash
npm run postinstall
```
Automatically runs after `npm install` to generate Nuxt types

---

## API Endpoints

### Health Check
**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

**Purpose:** Verify server is running correctly (useful for monitoring/debugging)

---

## Git Workflow

### Branch Strategy
- **Main branch:** `main`
- **Development:** Direct commits to `main` (single developer for now)
- **Future:** Feature branches for larger changes

### Commit Style
- Clear, descriptive commit messages
- Focus on "what" and "why" over "how"

### Ignored Files
See [.gitignore](.gitignore):
- `node_modules/`
- `.nuxt/`, `.output/`, `dist/`
- `.env` and variants
- IDE files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`)
- Log files (`*.log`)

---

## Deployment

### Vercel
- **Platform:** Vercel (auto-detects Nuxt 3)
- **Deployment:** Connected to GitHub repository for automatic deploys
- **Preview URLs:** Generated for each commit/PR
- **Production URL:** TBD (custom domain optional)

### Environment Variables on Vercel
Add these in the Vercel dashboard (Settings → Environment Variables):
- `SUPABASE_URL` (Phase 1.2+)
- `SUPABASE_ANON_KEY` (Phase 1.2+)
- `GEMINI_API_KEY` (Phase 1.3+)
- `ANTHROPIC_API_KEY` (Phase 1.3+)
- `OPENAI_API_KEY` (Phase 1.3+)
- `NUXT_PUBLIC_APP_URL` (set to production domain)

---

## Phase Roadmap Summary

### Phase 1.1 (Current)
- Nuxt 3 project setup
- Brand design system implemented
- Home page and dashboard page (placeholder)
- Health check API endpoint
- Deployed to Vercel

### Phase 1.2 (Next)
- Supabase project integration
- User authentication (magic link)
- Protected routes
- User table schema

### Phase 1.3 (Upcoming)
- AI chat interface (real-time)
- LLM provider integrations (Gemini, Claude, GPT)
- Optional text-based journaling mode
- Chat history persistence

---

## Design Philosophy

### Visual Tone
- **Calm and clean:** Minimalist UI, no clutter
- **Trustworthy:** Professional polish with soft animations
- **Focused:** Every element serves the user's quit journey

### UX Principles
- **Clarity over cleverness:** Simple, direct language
- **Accessibility:** High contrast text, readable fonts
- **Performance:** Fast page loads, smooth transitions
- **Mobile-friendly:** Touch targets, readable on small screens

---

## Common Patterns

### Page Structure
```vue
<template>
  <div class="glass rounded-card p-8 shadow-card border border-brand-border animate-fade-in-up">
    <h1 class="text-2xl font-bold text-white mb-4">Page Title</h1>
    <p class="text-white-85">Content goes here</p>
  </div>
</template>
```

### Button Pattern
```vue
<button class="btn-primary text-white px-6 py-3 rounded-pill font-semibold shadow-card">
  Click me
</button>
```

### Navigation Link
```vue
<NuxtLink to="/path" class="text-white-85 hover:text-white transition">
  Link Text
</NuxtLink>
```

### Eyebrow Text
```vue
<p class="eyebrow text-white mb-4">Subtitle Here</p>
```

---

## Troubleshooting

### Build Errors
- Run `npm run postinstall` to regenerate Nuxt types
- Clear `.nuxt` folder: `rm -rf .nuxt` then `npm run dev`

### Style Not Applying
- Check Tailwind content paths in [tailwind.config.js](tailwind.config.js)
- Verify class names match design tokens
- Ensure `main.css` is imported in [nuxt.config.ts](nuxt.config.ts)

### Environment Variables Not Working
- Server-side vars: Use `useRuntimeConfig()` in server files
- Client-side vars: Must be prefixed with `NUXT_PUBLIC_`
- Restart dev server after `.env` changes

---

## Resources

- **Nuxt 3 Docs:** https://nuxt.com/docs
- **Tailwind CSS Docs:** https://tailwindcss.com/docs
- **Vue 3 Docs:** https://vuejs.org/guide/introduction.html
- **Vercel Docs:** https://vercel.com/docs

---

**Last Updated:** Phase 1.1 - Initial setup complete
