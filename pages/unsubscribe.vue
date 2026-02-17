<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const status = route.query.status as string
const uid = route.query.uid as string
const sig = route.query.sig as string

const isSuccess = status === 'success'
const isResubscribed = ref(false)
const isLoading = ref(false)

async function resubscribe() {
  isLoading.value = true
  try {
    await $fetch(`/api/check-ins/resubscribe?uid=${uid}&sig=${sig}`, { method: 'POST' })
    isResubscribed.value = true
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center text-white px-4">
    <div class="glass rounded-card p-8 shadow-card border border-brand-border max-w-md w-full text-center animate-fade-in-up">
      <p class="eyebrow text-white mb-6">UNHOOKED</p>

      <template v-if="isSuccess">
        <template v-if="isResubscribed">
          <h1 class="text-2xl font-bold mb-3">You're subscribed to check-in emails again.</h1>
        </template>
        <template v-else>
          <h1 class="text-2xl font-bold mb-3">You've been unsubscribed from check-in emails.</h1>
          <p class="text-white-85 mb-6">You'll still see check-ins when you open the app.</p>
          <button
            @click="resubscribe"
            :disabled="isLoading"
            class="btn-primary inline-block text-white px-6 py-3 rounded-pill font-semibold"
          >
            {{ isLoading ? 'Resubscribing...' : 'Re-subscribe' }}
          </button>
        </template>
      </template>

      <template v-else>
        <h1 class="text-2xl font-bold mb-3">This link doesn't seem to be working.</h1>
        <p class="text-white-85">Try clicking the unsubscribe link in a more recent email.</p>
      </template>
    </div>
  </div>
</template>
