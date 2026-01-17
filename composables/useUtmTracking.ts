const UTM_STORAGE_KEY = 'utm_params'
const UTM_TTL_DAYS = 7

interface StoredUtmParams {
  params: {
    utm_source: string
    utm_medium: string
    utm_campaign: string
    utm_term: string
    utm_content: string
    referrer: string
  }
  expiresAt: number
}

export function useUtmTracking() {
  const route = useRoute()

  // UTM params to track
  const utmParams = ref({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    referrer: '',
  })

  // Capture UTMs on page load
  onMounted(() => {
    // Get from URL query params
    const urlUtms = {
      utm_source: (route.query.utm_source as string) || '',
      utm_medium: (route.query.utm_medium as string) || '',
      utm_campaign: (route.query.utm_campaign as string) || '',
      utm_term: (route.query.utm_term as string) || '',
      utm_content: (route.query.utm_content as string) || '',
      referrer: '',
    }

    // Capture external referrer only
    if (document.referrer && !document.referrer.includes(window.location.hostname)) {
      urlUtms.referrer = document.referrer
    }

    // If we have new UTM params from URL, store them with TTL
    if (Object.values(urlUtms).some(v => v)) {
      utmParams.value = urlUtms
      const stored: StoredUtmParams = {
        params: urlUtms,
        expiresAt: Date.now() + (UTM_TTL_DAYS * 24 * 60 * 60 * 1000)
      }
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(stored))
    } else {
      // Try to recover from localStorage if not expired
      try {
        const storedJson = localStorage.getItem(UTM_STORAGE_KEY)
        if (storedJson) {
          const stored: StoredUtmParams = JSON.parse(storedJson)
          if (stored.expiresAt > Date.now()) {
            utmParams.value = stored.params
          } else {
            // Expired, clean up
            localStorage.removeItem(UTM_STORAGE_KEY)
          }
        }
      } catch {
        // Invalid stored data, ignore
      }
    }
  })

  return {
    utmParams
  }
}
