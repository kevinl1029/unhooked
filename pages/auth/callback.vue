<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()

const isLoading = ref(true)
const errorMessage = ref('')

const CALLBACK_MAX_WAIT_MS = 15000
const CALLBACK_POLL_MS = 250
const GET_SESSION_TIMEOUT_MS = 2000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

function normalizeAuthError(raw: unknown): string {
  if (!raw) return ''
  try {
    return decodeURIComponent(String(raw)).replace(/\+/g, ' ')
  } catch {
    return String(raw)
  }
}

function getCallbackError(): string {
  const queryError = route.query.error_description || route.query.error
  if (queryError) return normalizeAuthError(queryError)

  if (!process.client || !window.location.hash) return ''

  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  return normalizeAuthError(hashParams.get('error_description') || hashParams.get('error'))
}

async function waitForSession(): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < CALLBACK_MAX_WAIT_MS) {
    if (user.value) return true

    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        GET_SESSION_TIMEOUT_MS,
        'getSession'
      )

      if (error) {
        console.error('[auth/callback] getSession error:', error)
      }

      if (data.session?.user) {
        return true
      }
    } catch (error) {
      console.warn('[auth/callback] getSession attempt failed:', error)
    }

    await sleep(CALLBACK_POLL_MS)
  }

  return false
}

async function completeCallbackFlow() {
  isLoading.value = true
  errorMessage.value = ''

  const callbackError = getCallbackError()
  if (callbackError) {
    console.error('[auth/callback] Provider returned error:', callbackError)
    isLoading.value = false
    errorMessage.value = callbackError
    return
  }

  const hasSession = await waitForSession()
  if (hasSession) {
    await navigateTo('/dashboard', { replace: true })
    return
  }

  isLoading.value = false
  errorMessage.value = 'Sign-in is taking longer than expected. Please try again.'
  console.error('[auth/callback] Timed out waiting for session')
}

onMounted(() => {
  void completeCallbackFlow()
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="glass rounded-card p-8 shadow-card border border-brand-border text-center max-w-md mx-4">
      <p v-if="isLoading" class="text-white-85">Signing you in...</p>

      <template v-else>
        <p class="text-red-300 mb-4">{{ errorMessage }}</p>
        <div class="flex items-center justify-center gap-3">
          <button
            class="btn-primary text-white px-5 py-2 rounded-pill font-medium"
            @click="completeCallbackFlow"
          >
            Try again
          </button>
          <NuxtLink to="/login" class="text-white-65 hover:text-white transition text-sm">
            Back to login
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>
