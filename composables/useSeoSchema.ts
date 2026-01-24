/**
 * SEO Schema Composable
 * Generates JSON-LD structured data for search engine optimization
 */

interface FaqItem {
  question: string
  answer: string
}

export function useSeoSchema() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.appUrl || 'https://getunhooked.app'

  // Organization Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Unhooked',
    url: baseUrl,
    logo: `${baseUrl}/og-image.png`,
    description: 'AI-powered nicotine cessation program helping people quit vaping and smoking permanently.',
    foundingDate: '2025',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'kevin@getunhooked.app',
      contactType: 'customer support'
    }
  }

  // WebSite Schema
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Unhooked',
    url: baseUrl,
    description: 'Quit vaping and smoking permanently with AI-powered nicotine cessation.',
    publisher: {
      '@type': 'Organization',
      name: 'Unhooked'
    }
  }

  // SoftwareApplication Schema
  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Unhooked',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    description: 'AI-powered nicotine cessation program that helps you quit vaping and smoking by eliminating the desire for nicotine.',
    offers: {
      '@type': 'Offer',
      price: '199',
      priceCurrency: 'USD',
      availability: 'https://schema.org/PreOrder',
      priceValidUntil: '2026-04-30',
      description: 'Founding member pricing - includes full program, check-ins, and 90-day support'
    }
  }

  return {
    organizationSchema,
    websiteSchema,
    softwareAppSchema
  }
}

/**
 * Generate FAQPage schema from FAQ items
 */
export function generateFaqSchema(faqItems: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }
}
