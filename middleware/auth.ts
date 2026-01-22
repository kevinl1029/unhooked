export default defineNuxtRouteMiddleware((to) => {
  const { appAccessEnabled } = useAppMode()

  // If app access is disabled (validation or disabled mode), redirect all protected routes to landing page
  if (!appAccessEnabled) {
    return navigateTo('/')
  }

  const user = useSupabaseUser()

  // If user is not logged in and trying to access a protected route
  if (!user.value) {
    return navigateTo('/login')
  }
})
