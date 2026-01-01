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
