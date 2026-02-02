export type AppMode = 'disabled' | 'validation' | 'enabled'

export function useAppMode() {
  const config = useRuntimeConfig()
  const mode = config.public.appMode as AppMode

  return {
    mode,
    isDisabled: mode === 'disabled',
    isValidation: mode === 'validation',
    isEnabled: mode === 'enabled',
    // Checkout is available in validation + enabled modes
    checkoutEnabled: mode === 'validation' || mode === 'enabled',
    // App access is only available in enabled mode
    appAccessEnabled: mode === 'enabled',
    isStaging: config.public.isStaging as boolean,
  }
}
