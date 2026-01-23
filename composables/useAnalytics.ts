/**
 * Analytics composable for tracking custom events
 *
 * Uses Plausible Analytics for privacy-respecting tracking.
 * Events are only sent in production (Plausible script won't exist in dev).
 */

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string | number | boolean>; revenue?: { currency: string; amount: number } }
    ) => void
  }
}

// Event names as constants for type safety
export const ANALYTICS_EVENTS = {
  // CTA interactions
  CTA_CLICK_HERO: 'CTA Click: Hero',
  CTA_CLICK_PRICING: 'CTA Click: Pricing',
  CTA_CLICK_FINAL: 'CTA Click: Final CTA',
  CTA_CLICK_STICKY: 'CTA Click: Sticky',
  CTA_CLICK_LISTEN: 'CTA Click: Listen',

  // Audio events (listen page)
  AUDIO_STARTED: 'Audio Started',
  AUDIO_COMPLETED: 'Audio Completed',
  SECONDARY_CTA_CLICK: 'Secondary CTA Click',

  // Conversion events
  CHECKOUT_STARTED: 'Checkout Started',
  EMAIL_SUBMITTED: 'Email Submitted',
  PURCHASE_COMPLETE: 'Purchase Complete',

  // Engagement events
  SCROLL_25: 'Scroll: 25%',
  SCROLL_50: 'Scroll: 50%',
  SCROLL_75: 'Scroll: 75%',
  SCROLL_100: 'Scroll: 100%',

  // Section visibility (aggregate tracking)
  SECTION_HERO: 'Section Viewed: Hero',
  SECTION_MOMENT: 'Section Viewed: Moment',
  SECTION_REASON: 'Section Viewed: Reason',
  SECTION_HOW_IT_WORKS: 'Section Viewed: How It Works',
  SECTION_WHO_FOR: 'Section Viewed: Who For',
  SECTION_FOUNDER: 'Section Viewed: Founder',
  SECTION_PRICING: 'Section Viewed: Pricing',
  SECTION_FAQ: 'Section Viewed: FAQ',
  SECTION_FINAL_CTA: 'Section Viewed: Final CTA',
} as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

export function useAnalytics() {
  /**
   * Track a custom event
   *
   * @param eventName - The name of the event (use ANALYTICS_EVENTS constants)
   * @param props - Optional properties to attach to the event
   */
  function trackEvent(eventName: AnalyticsEvent | string, props?: Record<string, string | number | boolean>) {
    if (import.meta.client && window.plausible) {
      window.plausible(eventName, props ? { props } : undefined)
    } else if (import.meta.dev) {
      console.log('[Analytics]', eventName, props)
    }
  }

  /**
   * Track a revenue-generating event (e.g., successful purchase)
   *
   * @param eventName - The name of the event
   * @param amount - Revenue amount in dollars
   * @param props - Optional additional properties
   */
  function trackRevenue(eventName: string, amount: number, props?: Record<string, string | number | boolean>) {
    if (import.meta.client && window.plausible) {
      window.plausible(eventName, {
        revenue: { currency: 'USD', amount },
        ...(props ? { props } : {}),
      })
    } else if (import.meta.dev) {
      console.log('[Analytics Revenue]', eventName, { amount, props })
    }
  }

  return {
    trackEvent,
    trackRevenue,
    ANALYTICS_EVENTS,
  }
}
