/**
 * Resend Email Client
 * Handles email delivery for check-ins via Resend
 */

import { Resend } from 'resend'

let resendClient: Resend | null = null

/**
 * Get the Resend client (singleton)
 */
export function getResendClient(): Resend {
  if (!resendClient) {
    const config = useRuntimeConfig()
    const apiKey = config.resendApiKey

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    resendClient = new Resend(apiKey)
  }

  return resendClient
}

/**
 * Email templates for different check-in types
 */
export const EMAIL_SUBJECTS: Record<string, string> = {
  morning: 'Good morning — quick check-in',
  evening: "Day's winding down — how did it go?",
  post_session: 'Quick thought from earlier...',
  default: 'Checking in with you',
}

/**
 * Get the email subject for a check-in type
 */
export function getEmailSubject(checkInType: string): string {
  return EMAIL_SUBJECTS[checkInType] || EMAIL_SUBJECTS.default
}
