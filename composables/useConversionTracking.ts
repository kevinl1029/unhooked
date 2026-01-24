/**
 * Conversion Tracking Composable
 * Placeholder for future analytics integration (Google Analytics, Meta Pixel, TikTok Pixel)
 */

type ConversionEvent =
  | 'page_view'
  | 'cta_click'
  | 'checkout_started'
  | 'checkout_completed'
  | 'email_captured'
  | 'faq_expanded'

interface EventProperties {
  location?: string
  value?: number
  currency?: string
  [key: string]: unknown
}

export function useConversionTracking() {
  /**
   * Track a conversion event
   * Currently logs to console in debug mode
   * Ready for future analytics provider integration
   */
  function trackEvent(event: ConversionEvent, properties?: EventProperties) {
    if (import.meta.client) {
      // Debug logging in development
      if (import.meta.dev) {
        console.debug('[Conversion]', event, properties)
      }

      // Future: Google Analytics 4
      // if (typeof gtag !== 'undefined') {
      //   gtag('event', event, properties)
      // }

      // Future: Meta Pixel
      // if (typeof fbq !== 'undefined') {
      //   fbq('track', event, properties)
      // }

      // Future: TikTok Pixel
      // if (typeof ttq !== 'undefined') {
      //   ttq.track(event, properties)
      // }
    }
  }

  /**
   * Track page view
   */
  function trackPageView(pageName?: string) {
    trackEvent('page_view', { page: pageName || window?.location?.pathname })
  }

  /**
   * Track CTA click
   */
  function trackCtaClick(location: string) {
    trackEvent('cta_click', { location })
  }

  /**
   * Track checkout started
   */
  function trackCheckoutStarted(value?: number) {
    trackEvent('checkout_started', { value, currency: 'USD' })
  }

  /**
   * Track checkout completed
   */
  function trackCheckoutCompleted(value?: number) {
    trackEvent('checkout_completed', { value, currency: 'USD' })
  }

  /**
   * Track email capture
   */
  function trackEmailCaptured(source: string) {
    trackEvent('email_captured', { source })
  }

  return {
    trackEvent,
    trackPageView,
    trackCtaClick,
    trackCheckoutStarted,
    trackCheckoutCompleted,
    trackEmailCaptured
  }
}
