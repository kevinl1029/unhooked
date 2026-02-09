const OBSERVATION_ASSIGNMENT_CAPTURE_REGEX = /\[OBSERVATION_ASSIGNMENT:\s*([\s\S]*?)\]/i
const OBSERVATION_ASSIGNMENT_REMOVE_REGEX = /\[OBSERVATION_ASSIGNMENT:\s*[\s\S]*?\]/g

const CONTROL_TOKENS = [
  '[SESSION_COMPLETE]',
  '[RECORDING_PROMPT]',
  '[JOURNEY_GENERATE]',
] as const

export function stripChatControlTokens(text: string): string {
  let stripped = text

  for (const token of CONTROL_TOKENS) {
    stripped = stripped.replaceAll(token, '')
  }

  stripped = stripped.replace(OBSERVATION_ASSIGNMENT_REMOVE_REGEX, '')

  return stripped
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function extractObservationAssignment(text: string): string | null {
  const match = text.match(OBSERVATION_ASSIGNMENT_CAPTURE_REGEX)
  const assignment = match?.[1]?.trim()
  return assignment ? assignment : null
}
