export default defineNuxtRouteMiddleware(async (to) => {
  const { appAccessEnabled } = useAppMode()
  const user = useSupabaseUser()

  console.log('[auth-middleware] appAccessEnabled:', appAccessEnabled, 'user:', !!user.value, 'userId:', user.value?.id)

  // If user is not logged in, redirect to login
  if (!user.value) {
    console.log('[auth-middleware] No user, redirecting to /login')
    return navigateTo('/login')
  }

  // If app access is enabled (APP_MODE is enabled), allow access
  if (appAccessEnabled) {
    console.log('[auth-middleware] App access enabled, allowing')
    return
  }

  // If app access is disabled, check if user is a beta user
  // Fail closed: if any error occurs or is_beta is false, redirect to landing
  try {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('is_beta')
      .eq('id', user.value.id)
      .single()

    console.log('[auth-middleware] Beta check result - data:', JSON.stringify(data), 'error:', JSON.stringify(error))

    // If query returned an error, fail closed
    if (error) {
      console.log('[auth-middleware] Query error, redirecting to /')
      return navigateTo('/')
    }

    // If profile doesn't exist or is_beta is false, deny access
    if (!data || !data.is_beta) {
      console.log('[auth-middleware] Not beta user, redirecting to /')
      return navigateTo('/')
    }

    console.log('[auth-middleware] Beta user confirmed, allowing access')
    // Beta user with is_beta=true, allow access
  } catch (e) {
    console.log('[auth-middleware] Exception caught:', e)
    // On any exception, fail closed
    return navigateTo('/')
  }
})
