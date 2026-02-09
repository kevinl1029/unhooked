<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()

const isLoading = ref(true)
const errorMessage = ref('')
const debugDump = ref('')
const showDebugDump = ref(false)

const CALLBACK_MAX_WAIT_MS = 15000
const CALLBACK_POLL_MS = 250
const GET_SESSION_TIMEOUT_MS = 2000
const DEBUG_STORAGE_KEY = 'auth_callback_debug_last'
const traceLines = ref<string[]>([])

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function addTrace(message: string) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}`
  traceLines.value.push(line)
  if (traceLines.value.length > 120) {
    traceLines.value.shift()
  }
  console.log('[auth/callback]', message)
}

function getHashKeyList(): string[] {
  if (!process.client || !window.location.hash) return []
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  return Array.from(hashParams.keys())
}

function buildDebugDump() {
  const payload = {
    capturedAt: new Date().toISOString(),
    path: route.path,
    queryKeys: Object.keys(route.query),
    hashKeys: getHashKeyList(),
    userAgent: process.client ? navigator.userAgent : 'server',
    trace: traceLines.value,
  }
  debugDump.value = JSON.stringify(payload, null, 2)

  if (process.client) {
    try {
      localStorage.setItem(DEBUG_STORAGE_KEY, debugDump.value)
    } catch (error) {
      console.warn('[auth/callback] Failed to persist debug payload', error)
    }
  }
}

async function copyDebugDump() {
  if (!process.client || !debugDump.value) return

  try {
    await navigator.clipboard.writeText(debugDump.value)
    addTrace('Debug dump copied to clipboard')
  } catch (error) {
    addTrace(`Clipboard copy failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

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
  if (queryError) {
    addTrace('Provider returned error via query params')
    return normalizeAuthError(queryError)
  }

  if (!process.client || !window.location.hash) return ''

  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const hashError = hashParams.get('error_description') || hashParams.get('error')
  if (hashError) {
    addTrace('Provider returned error via hash params')
  }
  return normalizeAuthError(hashError)
}

async function waitForSession(): Promise<boolean> {
  const startTime = Date.now()
  let attempt = 0

  while (Date.now() - startTime < CALLBACK_MAX_WAIT_MS) {
    if (user.value) return true

    attempt += 1
    addTrace(`Session polling attempt ${attempt} started`)

    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        GET_SESSION_TIMEOUT_MS,
        'getSession'
      )

      if (error) {
        addTrace(`getSession error on attempt ${attempt}: ${error.message}`)
      }

      if (data.session?.user) {
        addTrace(`Session detected on attempt ${attempt}`)
        return true
      }
      addTrace(`No session yet on attempt ${attempt}`)
    } catch (error) {
      addTrace(`getSession attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    await sleep(CALLBACK_POLL_MS)
  }

  return false
}

async function completeCallbackFlow() {
  isLoading.value = true
  errorMessage.value = ''
  showDebugDump.value = false
  traceLines.value = []

  addTrace(`Callback flow started for path ${route.fullPath}`)
  if (process.client) {
    const navWithStandalone = window.navigator as Navigator & { standalone?: boolean }
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navWithStandalone.standalone === true
    addTrace(`Client context: standalone=${standalone}`)
    addTrace(`Query keys: ${Object.keys(route.query).join(', ') || '(none)'}`)
    addTrace(`Hash keys: ${getHashKeyList().join(', ') || '(none)'}`)
  }

  const callbackError = getCallbackError()
  if (callbackError) {
    addTrace(`Provider callback error: ${callbackError}`)
    isLoading.value = false
    errorMessage.value = callbackError
    buildDebugDump()
    return
  }

  const hasSession = await waitForSession()
  if (hasSession) {
    addTrace('Callback flow succeeded, navigating to /dashboard')
    await navigateTo('/dashboard', { replace: true })
    return
  }

  isLoading.value = false
  errorMessage.value = 'Sign-in is taking longer than expected. Please try again.'
  addTrace('Timed out waiting for session')
  buildDebugDump()
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
        <button
          class="mt-4 text-xs text-white-65 hover:text-white transition underline"
          @click="showDebugDump = !showDebugDump"
        >
          {{ showDebugDump ? 'Hide debug details' : 'Show debug details' }}
        </button>
        <div v-if="showDebugDump" class="mt-3 text-left">
          <button
            class="mb-2 text-xs text-white-65 hover:text-white transition underline"
            @click="copyDebugDump"
          >
            Copy debug details
          </button>
          <pre class="text-[10px] leading-4 text-white-65 bg-black/30 rounded-lg p-3 overflow-auto max-h-64">{{ debugDump }}</pre>
        </div>
      </template>
    </div>
  </div>
</template>
