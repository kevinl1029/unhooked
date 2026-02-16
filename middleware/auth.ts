export default defineNuxtRouteMiddleware(async (to) => {
  const { appAccessEnabled } = useAppMode()
  const user = useSupabaseUser()

  // If user is not logged in, redirect to login
  if (!user.value) {
    return navigateTo('/login')
  }

  // If app access is enabled (APP_MODE is enabled), allow access
  if (appAccessEnabled) {
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

    // If query returned an error, fail closed
    if (error) {
      return navigateTo('/')
    }

    // If profile doesn't exist or is_beta is false, deny access
    if (!data || !data.is_beta) {
      return navigateTo('/')
    }

    // Beta user with is_beta=true, allow access
  } catch (e) {
    // On any exception, fail closed
    return navigateTo('/')
  }
})
