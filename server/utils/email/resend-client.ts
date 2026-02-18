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

// Per-type subjects without name prefix
const SUBJECTS_WITHOUT_NAME: Record<string, string> = {
  post_session: 'Quick thought from earlier...',
  evidence_bridge: 'What did you notice?',
  morning: 'Good morning',
  evening: 'How was your day?',
}

// Per-type subjects with name prefix
const SUBJECTS_WITH_NAME: Record<string, string> = {
  post_session: '{name}, quick thought from earlier...',
  evidence_bridge: '{name}, what did you notice?',
  morning: '{name}, good morning',
  evening: '{name}, how was your day?',
}

/**
 * Get the email subject for a check-in, optionally personalized with a name
 */
export function getEmailSubject(type: string, name?: string | null): string {
  if (name) {
    const template = SUBJECTS_WITH_NAME[type]
    if (template) {
      return template.replace('{name}', name)
    }
    return `${name}, your check-in is ready`
  }
  return SUBJECTS_WITHOUT_NAME[type] ?? 'Your check-in is ready'
}
