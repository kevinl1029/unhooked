export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()

  // If app is disabled, redirect all protected routes to landing page
  if (!config.public.appEnabled) {
    return navigateTo('/')
  }

  const user = useSupabaseUser()

  // If user is not logged in and trying to access a protected route
  if (!user.value) {
    return navigateTo('/login')
  }
})
