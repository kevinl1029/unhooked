<template>
  <div class="animate-fade-in-up">
    <!-- User info bar -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-white-65 text-sm">Signed in as</p>
        <p class="text-white font-medium">{{ user?.email }}</p>
      </div>
      <button
        @click="handleSignOut"
        class="text-white-65 hover:text-white transition text-sm"
      >
        Sign out
      </button>
    </div>

    <!-- Chat interface -->
    <ChatWindow
      :messages="messages"
      :is-loading="isLoading"
      :error="error"
      @send="handleSend"
      @new-chat="handleNewChat"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { user, signOut } = useAuth()
const { messages, isLoading, error, sendMessage, startNewConversation } = useChat()

const handleSignOut = async () => {
  try {
    await signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

const handleSend = (message: string) => {
  sendMessage(message)
}

const handleNewChat = () => {
  startNewConversation()
}
</script>
