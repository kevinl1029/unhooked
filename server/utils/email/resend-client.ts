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
 * Email subject for check-ins
 * Using clear branded subject to avoid spam filters
 */
export const EMAIL_SUBJECT = 'Unhooked: Your check-in is ready'

/**
 * Get the email subject for check-ins
 */
export function getEmailSubject(): string {
  return EMAIL_SUBJECT
}
