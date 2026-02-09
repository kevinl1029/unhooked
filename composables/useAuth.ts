export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const SIGN_OUT_TIMEOUT_MS = 8000

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

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) throw error
    return { success: true }
  }

  const signOut = async () => {
    let signOutError: Error | null = null

    try {
      const { error } = await withTimeout(
        supabase.auth.signOut(),
        SIGN_OUT_TIMEOUT_MS,
        'Global sign out'
      )
      if (error) throw error
    } catch (error: any) {
      signOutError = error instanceof Error ? error : new Error(String(error))
      console.error('[auth] Global sign out failed, trying local scope fallback:', signOutError)

      const { error: localError } = await withTimeout(
        supabase.auth.signOut({ scope: 'local' }),
        SIGN_OUT_TIMEOUT_MS,
        'Local sign out fallback'
      )
      if (localError) {
        throw localError
      }
    }

    // Redirect to home after logout
    await navigateTo('/')

    if (signOutError) {
      console.warn('[auth] Sign out completed via fallback path')
    }
  }

  const getProfile = async () => {
    if (!user.value) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) throw error
    return { success: true }
  }

  return {
    user,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    getProfile,
  }
}
