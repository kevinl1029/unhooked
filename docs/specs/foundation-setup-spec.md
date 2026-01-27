# Unhooked: Foundation Setup Specification
## (Originally: Phase 1.1)

**Version:** 3.0  
**Last Updated:** 2026-01-11  
**Status:** Complete  
**Document Type:** Technical Specification  
**Legacy Reference:** Phase 1.1

---

## Nuxt 3 Project Setup with Brand Configuration

### Overview

Initialize a Nuxt 3 project as a **standalone repository** (not a monorepo), configured for Vercel deployment with the Unhooked brand design system and environment variable structure for future API integrations.

**Goal:** A deployed, brand-consistent foundation ready for authentication and chat features.

**Repository Structure:** This project is its own independent git repository, separate from any existing projects. Create it in your projects directory alongside (not inside) other project folders.

---

## Brand Design System

### Typography
- **Font Family:** Inter (via Google Fonts)
- **Headings:** Bold weights (600+), large sizing
- **Hero H1:** 2.75rem desktop, 1.9rem mobile
- **Eyebrow Text:** Uppercase, letter-spacing 0.35em, size 0.55rem, 65% opacity
- **Body Text:** White (#ffffff), secondary text at 85% or 65% opacity

### Color Palette
- **Background:** Deep teal radial gradient
  - CSS: `radial-gradient(circle at top, #104e54 0%, #041f21 100%)`
- **Primary Accent (Buttons):** Vibrant orange
  - Gradient: `linear-gradient(135deg, #fc4a1a, #f7b733)`
  - Solid: `#fc4a1a`
- **Glass Elements:** Translucent teal
  - Card: `rgba(13, 92, 99, 0.35)` with `backdrop-filter: blur(12px)`
  - Input: `rgba(31, 108, 117, 0.5)` with `backdrop-filter: blur(12px)`
- **Borders:** `rgba(255, 255, 255, 0.1)` or `rgba(255, 255, 255, 0.4)`

### UI Components
- **Buttons:** Pill-shaped (`border-radius: 9999px`), hover scale 1.02
- **Cards:** Large rounded corners (`border-radius: 24px`), deep shadows
- **Inputs:** Pill-shaped, semi-transparent background, white text
- **Animations:** Soft fades, ease-out transitions

---

## Dependencies

```json
{
  "dependencies": {},
  "devDependencies": {
    "@nuxtjs/tailwindcss": "^6",
    "@nuxtjs/google-fonts": "^3"
  }
}
```

---

## Environment Variables

Create `.env` file:

```bash
# Supabase (Phase 1.2)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# LLM Providers (Phase 1.3)
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## File Structure

```
unhooked/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .env
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .env.example
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .gitignore
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ nuxt.config.ts
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ package.json
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ tailwind.config.js
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ app.vue
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ assets/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ css/
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ main.css
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ pages/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ index.vue
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ dashboard.vue
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ layouts/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ default.vue
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ components/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ AppHeader.vue
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ server/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ api/
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ health.get.ts
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ public/
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ favicon.ico
```

---

## Step-by-Step Implementation

### Step 1: Initialize the project

Navigate to your projects directory (the folder where you keep your code projects, **not** inside any existing project):

```bash
cd ~/projects  # or wherever you keep your projects
npx nuxi@latest init unhooked
cd unhooked
npm install
```

When prompted, select npm as package manager.

This creates a new `unhooked` folder as a sibling to your other projects (e.g., `ASCEND-AI`).

---

### Step 2: Install dependencies

```bash
npm install -D @nuxtjs/tailwindcss @nuxtjs/google-fonts
npx tailwindcss init
```

---

### Step 3: Configure tailwind.config.js

Replace the contents of `tailwind.config.js` with:

```javascript
import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          // Background gradient endpoints
          'bg-light': '#104e54',
          'bg-dark': '#041f21',
          
          // Primary accent (orange)
          'accent': '#fc4a1a',
          'accent-light': '#f7b733',
          
          // Glass/card backgrounds
          'glass': 'rgba(13, 92, 99, 0.35)',
          'glass-input': 'rgba(31, 108, 117, 0.5)',
          
          // Borders
          'border': 'rgba(255, 255, 255, 0.1)',
          'border-strong': 'rgba(255, 255, 255, 0.4)',
        },
        // Text opacity variants
        'white-85': 'rgba(255, 255, 255, 0.85)',
        'white-65': 'rgba(255, 255, 255, 0.65)',
      },
      borderRadius: {
        'card': '24px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 24px 64px rgba(0, 0, 0, 0.25)',
      },
      letterSpacing: {
        'eyebrow': '0.35em',
      },
      fontSize: {
        'eyebrow': ['0.55rem', { lineHeight: '1.2' }],
        'hero': ['2.75rem', { lineHeight: '1.1' }],
        'hero-mobile': ['1.9rem', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
}
```

---

### Step 4: Configure nuxt.config.ts

Replace the contents of `nuxt.config.ts` with:

```typescript
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts'
  ],

  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
    },
    display: 'swap',
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-side only (not exposed to client)
    geminiApiKey: process.env.GEMINI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

    // Client-side (public)
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }
  },

  compatibilityDate: '2024-11-01'
})
```

---

### Step 5: Create global styles

Create directory and file `assets/css/main.css`:

```css
/* Base background gradient */
body {
  background: radial-gradient(circle at top, #104e54 0%, #041f21 100%);
  min-height: 100vh;
}

/* Glass effect utilities */
.glass {
  background: rgba(13, 92, 99, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.glass-input {
  background: rgba(31, 108, 117, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Primary gradient button */
.btn-primary {
  background: linear-gradient(135deg, #fc4a1a, #f7b733);
  transition: transform 0.2s ease-out;
}

.btn-primary:hover {
  transform: scale(1.02);
}

/* Eyebrow text style */
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.35em;
  font-size: 0.55rem;
  opacity: 0.65;
}

/* Smooth fade-in animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out forwards;
}
```

---

### Step 6: Create app.vue

Replace the contents of `app.vue` with:

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

---

### Step 7: Create default layout

Create `layouts/default.vue`:

```vue
<template>
  <div class="min-h-screen text-white">
    <AppHeader />
    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
</template>
```

---

### Step 8: Create header component

Create `components/AppHeader.vue`:

```vue
<template>
  <header class="glass border-b border-brand-border">
    <div class="container mx-auto px-4 py-4">
      <nav class="flex items-center justify-between">
        <NuxtLink to="/" class="text-xl font-bold text-white">
          Unhooked
        </NuxtLink>
        <div class="space-x-4">
          <NuxtLink
            to="/dashboard"
            class="text-white-85 hover:text-white transition"
          >
            Dashboard
          </NuxtLink>
        </div>
      </nav>
    </div>
  </header>
</template>
```

---

### Step 9: Create home page

Create `pages/index.vue`:

```vue
<template>
  <div class="max-w-2xl mx-auto text-center py-16 animate-fade-in-up">
    <p class="eyebrow text-white mb-4">Break Free Forever</p>
    <h1 class="text-hero-mobile md:text-hero font-bold text-white mb-6">
      Unhooked
    </h1>
    <p class="text-xl text-white-85 mb-8 leading-relaxed">
      Break free from nicotine Ã¢â‚¬â€ not through willpower, but by eliminating the desire.
    </p>
    <NuxtLink
      to="/dashboard"
      class="btn-primary inline-block text-white px-8 py-3 rounded-pill font-semibold shadow-card"
    >
      Get Started
    </NuxtLink>
  </div>
</template>
```

---

### Step 10: Create dashboard page

Create `pages/dashboard.vue`:

```vue
<template>
  <div class="glass rounded-card p-8 shadow-card border border-brand-border animate-fade-in-up">
    <h1 class="text-2xl font-bold text-white mb-4">Dashboard</h1>
    <p class="text-white-65">
      Chat interface will go here. Authentication coming in Phase 1.2.
    </p>
  </div>
</template>
```

---

### Step 11: Create health check endpoint

Create `server/api/health.get.ts`:

```typescript
export default defineEventHandler(() => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
})
```

---

### Step 12: Create .env.example

Create `.env.example`:

```bash
# Copy this file to .env and fill in values

# Supabase (Phase 1.2)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# LLM Providers (Phase 1.3)
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### Step 13: Update .gitignore

Ensure `.gitignore` includes:

```
# Dependencies
node_modules

# Build
.nuxt
.output
dist

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
```

---

### Step 14: Create empty .env file

Create `.env` with the same structure as `.env.example` (values can be empty for now).

---

### Step 15: Initialize git repository

Initialize this project as its own git repository:

```bash
git init
git add .
git commit -m "Initial commit: Nuxt 3 project setup with Unhooked branding"
```

---

### Step 16: Create GitHub repository

Create a new repository on GitHub:

1. Go to https://github.com/new
2. Repository name: `unhooked` (or `getunhooked`)
3. Keep it private (recommended during development)
4. Do NOT initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

Then connect your local repo to GitHub:

```bash
git remote add origin git@github.com:YOUR_USERNAME/unhooked.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

### Step 17: Test locally

```bash
npm run dev
```

Verify:
- Home page renders at `http://localhost:3000`
- Dashboard page renders at `http://localhost:3000/dashboard`
- Health endpoint returns JSON at `http://localhost:3000/api/health`
- Brand colors and fonts are applied correctly
- Glass effects and gradients display properly

---

### Step 18: Deploy to Vercel

You can deploy either via CLI or by connecting your GitHub repo:

**Option A: Via GitHub (Recommended)**

1. Go to https://vercel.com/new
2. Import your `unhooked` repository from GitHub
3. Vercel auto-detects Nuxt 3 Ã¢â‚¬â€ accept defaults
4. Click "Deploy"

**Option B: Via CLI**

```bash
npm install -g vercel
vercel
```

Follow prompts and accept defaults.

---

After deployment:
- Note your preview URL (e.g., `unhooked-xxx.vercel.app`)
- Verify the app works in production
- Optionally configure a custom domain later

---

## Acceptance Criteria

- [ ] `npm run dev` starts app without errors
- [ ] Home page renders with brand styling (teal gradient background, orange button, Inter font)
- [ ] Dashboard page renders with glass card effect
- [ ] Header displays with glass effect and navigation
- [ ] Eyebrow text displays correctly (uppercase, wide letter-spacing)
- [ ] Button has gradient and hover scale effect
- [ ] Health endpoint returns JSON at `/api/health`
- [ ] Git repository initialized with initial commit
- [ ] GitHub repository created and code pushed
- [ ] App is deployed to Vercel and accessible via preview URL
- [ ] All pages are responsive (hero text scales on mobile)
- [ ] No API keys or secrets committed to git (`.env` is in `.gitignore`)
- [ ] Fade-in animation plays on page load

---

## Technical Notes for Implementation

- Use **Composition API** and `<script setup>` syntax for all Vue components
- Use **TypeScript** for server files (`.ts` extension)
- Use **Tailwind classes** for styling Ã¢â‚¬â€ avoid separate CSS files except for `main.css`
- All colors should use the defined `brand-*` tokens or `white-*` opacity variants
- Maintain the calm, clean visual tone throughout

---

## Next Phase Preview

**Authentication (Phase 1.2)** will add:
- Supabase project connection
- User authentication (magic link)
- Protected routes
- Basic user table schema

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Original] | Initial Phase 1.1 specification created |
| 2.0 | 2026-01-11 | Changed terminology from "myths" to "illusions" where applicable; Added version control header |
| 3.0 | 2026-01-11 | Renamed from "Phase 1.1" to "Foundation Setup Specification" for feature-based organization; Added legacy reference for git commit traceability; Updated status to Complete |
