<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container">
      <p class="footer-copyright">&copy; {{ currentYear }} Unhooked</p>
      <div class="footer-links">
        <a href="/privacy">Privacy</a>
        <span class="footer-divider">·</span>
        <a href="/terms">Terms</a>
        <span class="footer-divider">·</span>
        <a href="/contact">Contact</a>
      </div>
    </div>
  </footer>
</template>
