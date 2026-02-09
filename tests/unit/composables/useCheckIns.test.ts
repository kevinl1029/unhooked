import { describe, expect, it } from 'vitest'
import { buildCheckInResponsePath } from '~/composables/useCheckIns'

describe('buildCheckInResponsePath', () => {
  it('includes prompt and illusionKey query params for evidence-context check-ins', () => {
    const path = buildCheckInResponsePath(
      'checkin-1',
      'What did you observe?',
      'stress_relief'
    )

    expect(path).toBe('/check-in/checkin-1?prompt=What+did+you+observe%3F&illusionKey=stress_relief')
  })

  it('returns bare check-in path when optional params are missing', () => {
    expect(buildCheckInResponsePath('checkin-1')).toBe('/check-in/checkin-1')
  })
})
