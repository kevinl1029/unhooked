/**
 * Track which landing page sections are viewed
 *
 * Uses IntersectionObserver to fire analytics events when sections
 * become visible. Each section is only tracked once per page load.
 */

export function useSectionTracking() {
  const { trackEvent, ANALYTICS_EVENTS } = useAnalytics()

  // Track which sections have been recorded (prevent duplicates)
  const trackedSections = new Set<string>()

  // Map section IDs to analytics events
  const sectionEventMap: Record<string, string> = {
    hero: ANALYTICS_EVENTS.SECTION_HERO,
    moment: ANALYTICS_EVENTS.SECTION_MOMENT,
    reason: ANALYTICS_EVENTS.SECTION_REASON,
    'how-it-works': ANALYTICS_EVENTS.SECTION_HOW_IT_WORKS,
    'who-for': ANALYTICS_EVENTS.SECTION_WHO_FOR,
    founder: ANALYTICS_EVENTS.SECTION_FOUNDER,
    pricing: ANALYTICS_EVENTS.SECTION_PRICING,
    faq: ANALYTICS_EVENTS.SECTION_FAQ,
    'final-cta': ANALYTICS_EVENTS.SECTION_FINAL_CTA,
  }

  function initSectionTracking() {
    if (!import.meta.client) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id
            const eventName = sectionEventMap[sectionId]

            // Only track each section once per page load
            if (eventName && !trackedSections.has(sectionId)) {
              trackedSections.add(sectionId)
              trackEvent(eventName)
            }
          }
        })
      },
      {
        // Fire when 30% of section is visible
        threshold: 0.3,
        // Small margin to trigger slightly before section is fully in view
        rootMargin: '0px 0px -10% 0px',
      }
    )

    // Observe all trackable sections
    Object.keys(sectionEventMap).forEach((sectionId) => {
      const element = document.getElementById(sectionId)
      if (element) {
        observer.observe(element)
      }
    })

    // Return cleanup function
    return () => observer.disconnect()
  }

  return {
    initSectionTracking,
  }
}
