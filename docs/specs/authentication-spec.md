# Unhooked: Authentication Specification
## (Originally: Phase 1.2)

**Version:** 3.0  
**Last Updated:** 2026-01-11  
**Status:** Complete  
**Document Type:** Technical Specification  
**Legacy Reference:** Phase 1.2

---

## Supabase Integration with Authentication

### Overview

Integrate Supabase for authentication and database, enabling user sign-up/login via magic link and protecting the dashboard route. This builds on the Nuxt 3 foundation from Foundation Setup (Phase 1.1).

**Goal:** Users can sign up, log in via magic link, and access a protected dashboard. You (Kevin) can authenticate and test the app during development.

**Prerequisites:** Foundation Setup (Phase 1.1) complete â€” Nuxt 3 app deployed to Vercel with brand styling.

---

## What We're Building

1. **Supabase project** Ã¢â‚¬â€ Database and auth backend
2. **Magic link authentication** Ã¢â‚¬â€ Passwordless email login
3. **Auth middleware** Ã¢â‚¬â€ Protect routes that require login
4. **Login page** Ã¢â‚¬â€ Branded sign-in experience
5. **User session handling** Ã¢â‚¬â€ Persist login state across page loads
6. **Basic user profile** Ã¢â‚¬â€ Store user data in Supabase

---

## Supabase Project Setup (Manual Steps)

These steps are done in the Supabase dashboard before coding:

### Step A: Create Supabase Account & Project

1. Go to https://supabase.com and sign up (or log in)
2. Click "New Project"
3. Configure:
   - **Name:** `unhooked`
   - **Database Password:** Generate a strong password and save it somewhere secure
   - **Region:** Choose closest to your users (e.g., `us-east-1` for US)
4. Click "Create new project"
5. Wait for project to provision (~2 minutes)

### Step B: Get API Credentials

1. In your Supabase project, go to **Settings** Ã¢â€ â€™ **API**
2. Copy these values (you'll need them for `.env`):
   - **Project URL** Ã¢â€ â€™ `SUPABASE_URL`
   - **anon/public key** Ã¢â€ â€™ `SUPABASE_ANON_KEY`

### Step C: Configure Auth Settings

1. Go to **Authentication** Ã¢â€ â€™ **Providers**
2. Ensure **Email** is enabled
3. Go to **Authentication** Ã¢â€ â€™ **URL Configuration**
4. Set **Site URL** to your Vercel deployment URL (e.g., `https://unhooked-xxx.vercel.app`)
5. Add to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://unhooked-xxx.vercel.app/auth/callback`
   - (Add your custom domain later if you set one up)

### Step D: Create User Profiles Table

1. Go to **SQL Editor**
2. Run this SQL to create a profiles table that extends auth.users:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy: users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## Dependencies

Install in your `unhooked` project:

```bash
npm install @nuxtjs/supabase
```

---

## Environment Variables

Update your `.env` file with Supabase credentials:

```bash
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# LLM Providers (Phase 1.3)
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

Also update `.env.example` with placeholder comments.

**Important:** Add these same environment variables to your Vercel project settings for production deployment.

---

## File Structure (New & Modified Files)

```
unhooked/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .env                          # UPDATE: Add Supabase credentials
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ nuxt.config.ts                # UPDATE: Add Supabase module
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ pages/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ index.vue                 # UPDATE: Add login state awareness
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ dashboard.vue             # UPDATE: Show user info, add logout
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ login.vue                 # NEW: Login page
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ auth/
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ callback.vue          # NEW: Handle magic link redirect
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ middleware/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ auth.ts                   # NEW: Protect routes
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ composables/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ useAuth.ts                # NEW: Auth helper functions
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ components/
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ AppHeader.vue             # UPDATE: Show login state
```

---

## Step-by-Step Implementation

### Step 1: Install Supabase module

```bash
npm install @nuxtjs/supabase
```

---

### Step 2: Update nuxt.config.ts

Add the Supabase module and configure it:

```typescript
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    '@nuxtjs/supabase'
  ],

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/auth/callback',
      exclude: ['/', '/login'],
    }
  },

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

    // Client-side (public)
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }
  },

  compatibilityDate: '2024-11-01'
})
```

Note: `@nuxtjs/supabase` automatically reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from environment variables.

---

### Step 3: Create auth composable

Create `composables/useAuth.ts`:

```typescript
export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) throw error
    return { success: true }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Redirect to home after logout
    await navigateTo('/')
  }

  const getProfile = async () => {
    if (!user.value) return null
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()
    
    if (error) throw error
    return data
  }

  return {
    user,
    signInWithEmail,
    signOut,
    getProfile,
  }
}
```

---

### Step 4: Create auth callback page

Create `pages/auth/callback.vue`:

```vue
<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="glass rounded-card p-8 shadow-card border border-brand-border text-center">
      <div class="animate-pulse">
        <p class="text-white text-lg">Signing you in...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()

// Watch for user to be set, then redirect to dashboard
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/dashboard')
  }
}, { immediate: true })

// Fallback redirect after a few seconds
onMounted(() => {
  setTimeout(() => {
    if (user.value) {
      navigateTo('/dashboard')
    }
  }, 2000)
})
</script>
```

---

### Step 5: Create login page

Create `pages/login.vue`:

```vue
<template>
  <div class="max-w-md mx-auto py-16 animate-fade-in-up">
    <div class="glass rounded-card p-8 shadow-card border border-brand-border">
      <h1 class="text-2xl font-bold text-white mb-2 text-center">Welcome Back</h1>
      <p class="text-white-65 text-center mb-8">
        Enter your email to receive a sign-in link
      </p>

      <!-- Success State -->
      <div v-if="submitted" class="text-center">
        <div class="mb-4">
          <svg class="w-16 h-16 mx-auto text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-white mb-2">Check your email</h2>
        <p class="text-white-65 mb-6">
          We sent a sign-in link to<br>
          <span class="text-white font-medium">{{ email }}</span>
        </p>
        <button
          @click="resetForm"
          class="text-white-65 hover:text-white transition text-sm"
        >
          Use a different email
        </button>
      </div>

      <!-- Form State -->
      <form v-else @submit.prevent="handleSubmit">
        <div class="mb-6">
          <label for="email" class="block text-white-85 text-sm mb-2">
            Email address
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="glass-input w-full px-4 py-3 rounded-pill text-white placeholder-white-65 border border-brand-border focus:border-brand-border-strong focus:outline-none transition"
          />
        </div>

        <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50">
          <p class="text-red-200 text-sm">{{ error }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="btn-primary w-full text-white px-6 py-3 rounded-pill font-semibold shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Sending...</span>
          <span v-else>Send sign-in link</span>
        </button>
      </form>

      <p class="text-white-65 text-sm text-center mt-6">
        Don't have an account? The link will create one for you.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { signInWithEmail, user } = useAuth()

const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const error = ref('')

// Redirect if already logged in
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/dashboard')
  }
}, { immediate: true })

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  
  try {
    await signInWithEmail(email.value)
    submitted.value = true
  } catch (e: any) {
    error.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  submitted.value = false
  email.value = ''
  error.value = ''
}
</script>
```

---

### Step 6: Create auth middleware

Create `middleware/auth.ts`:

```typescript
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  
  // If user is not logged in and trying to access a protected route
  if (!user.value) {
    return navigateTo('/login')
  }
})
```

---

### Step 7: Update dashboard page

Update `pages/dashboard.vue` to use auth and show user info:

```vue
<template>
  <div class="animate-fade-in-up">
    <div class="glass rounded-card p-8 shadow-card border border-brand-border">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-white">Dashboard</h1>
        <button
          @click="handleSignOut"
          class="text-white-65 hover:text-white transition text-sm"
        >
          Sign out
        </button>
      </div>
      
      <div v-if="user" class="mb-6 p-4 rounded-lg bg-brand-glass border border-brand-border">
        <p class="text-white-65 text-sm mb-1">Signed in as</p>
        <p class="text-white font-medium">{{ user.email }}</p>
      </div>

      <p class="text-white-65">
        Chat interface will go here. LLM integration coming in Phase 1.3.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Protect this route - redirect to login if not authenticated
definePageMeta({
  middleware: 'auth'
})

const { user, signOut } = useAuth()

const handleSignOut = async () => {
  try {
    await signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
</script>
```

---

### Step 8: Update header component

Update `components/AppHeader.vue` to show auth state:

```vue
<template>
  <header class="glass border-b border-brand-border">
    <div class="container mx-auto px-4 py-4">
      <nav class="flex items-center justify-between">
        <NuxtLink to="/" class="text-xl font-bold text-white">
          Unhooked
        </NuxtLink>
        <div class="space-x-4">
          <template v-if="user">
            <NuxtLink
              to="/dashboard"
              class="text-white-85 hover:text-white transition"
            >
              Dashboard
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="text-white-85 hover:text-white transition"
            >
              Sign in
            </NuxtLink>
          </template>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
</script>
```

---

### Step 9: Update home page

Update `pages/index.vue` to show different CTA based on auth state:

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
      :to="user ? '/dashboard' : '/login'"
      class="btn-primary inline-block text-white px-8 py-3 rounded-pill font-semibold shadow-card"
    >
      {{ user ? 'Go to Dashboard' : 'Get Started' }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
</script>
```

---

### Step 10: Update environment variables on Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** Ã¢â€ â€™ **Environment Variables**
3. Add:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your Supabase anon key
4. Redeploy the app (or it will pick up on next push)

---

### Step 11: Test locally

```bash
npm run dev
```

Test the following flows:

1. **Home page** Ã¢â‚¬â€ Shows "Get Started" button when logged out
2. **Login page** Ã¢â‚¬â€ Enter email, receive magic link
3. **Check email** Ã¢â‚¬â€ Click magic link, should redirect to dashboard
4. **Dashboard** Ã¢â‚¬â€ Shows your email, protected from unauthenticated access
5. **Sign out** Ã¢â‚¬â€ Redirects to home, header updates
6. **Direct dashboard access** Ã¢â‚¬â€ When logged out, redirects to login

---

### Step 12: Commit and deploy

```bash
git add .
git commit -m "Add Supabase auth with magic link login"
git push origin main
```

Vercel will auto-deploy. Test the same flows in production.

---

## Acceptance Criteria

- [ ] Supabase project created and configured
- [ ] Magic link authentication works (send email, click link, logged in)
- [ ] Dashboard is protected Ã¢â‚¬â€ redirects to login when not authenticated
- [ ] User email displays on dashboard when logged in
- [ ] Sign out works and redirects to home
- [ ] Header shows "Sign in" or "Dashboard" based on auth state
- [ ] Home page CTA changes based on auth state
- [ ] Auth callback handles redirect properly
- [ ] Environment variables configured in Vercel
- [ ] Works in both local development and production

---

## Troubleshooting

### Magic link not arriving
- Check spam folder
- Verify email provider is not blocking Supabase emails
- Check Supabase dashboard Ã¢â€ â€™ Authentication Ã¢â€ â€™ Logs for errors

### Redirect not working after clicking magic link
- Verify callback URL is in Supabase allowed redirect URLs
- Check browser console for errors
- Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly

### "Invalid API key" errors
- Double-check environment variables are set
- Restart dev server after changing `.env`
- Verify you're using the `anon` key, not the `service_role` key

---

## Security Notes

- The `anon` key is safe to expose client-side Ã¢â‚¬â€ it's designed for this
- Row Level Security (RLS) on the profiles table ensures users can only access their own data
- Never expose the `service_role` key Ã¢â‚¬â€ it bypasses RLS

---

## Technical Notes for Implementation

- Use `useSupabaseUser()` composable for reactive user state
- Use `useSupabaseClient()` for direct Supabase operations
- The `@nuxtjs/supabase` module handles session persistence automatically
- Magic links expire after 24 hours by default (configurable in Supabase)

---

## Product Design Decisions (from user interview)

### User Experience Goals
- **Target emotional state:** Users should feel **confident and empowered** when entering dashboard - already winning their quit journey
- **Consistent experience:** Identical experience for new vs returning users - no special onboarding flows
- **Frictionless navigation:** Silent redirects when accessing protected pages (no explanatory messages)

### Authentication Flow
- **Passwordless emphasis:** Explicitly communicate "no password needed" to differentiate from traditional signup
- **Success screen:** Keep it **minimal and instructional** - just tell them to check email, no extra messaging
- **"Use a different email":** Primary use case is **typo correction**
- **Expired magic links:** Show **friendly error with retry** option (clear message + button to request new link)
- **Account messaging:** "Don't have an account? The link will create one for you." stays **always visible** to reduce anxiety

### Header & Navigation
- **Sign in link:** Use inviting language like **"Continue your journey"** instead of neutral "Sign in"
- **Auth state awareness:** Show "Continue your journey" or "Dashboard" based on login state

### Dashboard & Profile
- **Sign out:** Treat as a **standard account feature** - no special quit-journey meaning, just normal logout
- **Profile data relationship:** Defer optimization for **Phase 1.3** - minimal profile for now (email + ID only)
- **Dashboard placeholder:** Keep simple - this is just infrastructure for chat feature coming in Phase 1.3

### Philosophy
- Focus on getting authentication **working seamlessly** without over-designing placeholder UI
- Dashboard details and user journey personalization deferred until chat interface arrives

---

## Next Phase Preview

**Chat Infrastructure (Phase 1.3)** will add:
- LLM provider abstraction (starting with Gemini)
- Chat API endpoint
- Basic chat interface
- Conversation persistence to Supabase

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Original] | Initial Phase 1.2 specification created |
| 2.0 | 2026-01-11 | Changed terminology from "myths" to "illusions" where applicable; Added version control header |
| 3.0 | 2026-01-11 | Renamed from "Phase 1.2" to "Authentication Specification" for feature-based organization; Added legacy reference for git commit traceability; Updated status to Complete; Updated cross-references to use hybrid naming |
