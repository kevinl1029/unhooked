import { describe, it, expect } from 'vitest'
import type { IllusionLayer } from '~/server/utils/llm/task-types'
import { buildCrossLayerContext, formatCrossLayerContext } from '~/server/utils/personalization/cross-layer-context'

type MockDataConfig = {
  previousMoments?: Array<Record<string, any>>
  convictionAssessments?: Array<Record<string, any>>
  conversations?: Array<Record<string, any>>
}

function createMockSupabase(config: MockDataConfig = {}) {
  const filters: Array<{ table: string; field: string; value: unknown }> = []
  let conversationQueries = 0

  const previousMoments = config.previousMoments || []
  const convictionAssessments = config.convictionAssessments || []
  const conversations = config.conversations || []

  const supabase = {
    from: (table: string) => {
      if (table === 'captured_moments') {
        return {
          select: () => ({
            eq: (field1: string, value1: unknown) => {
              filters.push({ table, field: field1, value: value1 })
              return {
                eq: (field2: string, value2: unknown) => {
                  filters.push({ table, field: field2, value: value2 })
                  return {
                    order: () => Promise.resolve({ data: previousMoments }),
                  }
                },
              }
            },
          }),
        }
      }

      if (table === 'conviction_assessments') {
        return {
          select: () => ({
            eq: (field1: string, value1: unknown) => {
              filters.push({ table, field: field1, value: value1 })
              return {
                eq: (field2: string, value2: unknown) => {
                  filters.push({ table, field: field2, value: value2 })
                  return {
                    order: () => Promise.resolve({ data: convictionAssessments }),
                  }
                },
              }
            },
          }),
        }
      }

      if (table === 'conversations') {
        return {
          select: () => {
            conversationQueries += 1
            return {
              eq: (field1: string, value1: unknown) => {
                filters.push({ table, field: field1, value: value1 })
                return {
                  eq: (field2: string, value2: unknown) => {
                    filters.push({ table, field: field2, value: value2 })
                    return {
                      eq: (field3: string, value3: unknown) => {
                        filters.push({ table, field: field3, value: value3 })
                        return {
                          not: () => ({
                            order: () => ({
                              limit: () => Promise.resolve({ data: conversations }),
                            }),
                          }),
                        }
                      },
                    }
                  },
                }
              },
            }
          },
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }

  return {
    supabase: supabase as any,
    filters,
    getConversationQueries: () => conversationQueries,
  }
}

describe('buildCrossLayerContext observation assignment injection', () => {
  it.each([
    ['emotional', 'intellectual'],
    ['identity', 'emotional'],
  ] as Array<[IllusionLayer, IllusionLayer]>)(
    'includes previous layer observation assignment for %s sessions',
    async (currentLayer, expectedPriorLayer) => {
      const observationAssignment = 'Notice when stress shows up and ask: is it the situation or withdrawal?'
      const { supabase, filters } = createMockSupabase({
        conversations: [{ observation_assignment: observationAssignment }],
      })

      const context = await buildCrossLayerContext(
        supabase,
        'user-1',
        'stress_relief',
        currentLayer
      )

      const formatted = formatCrossLayerContext(context)

      expect(context.previousLayerObservationAssignment).toBe(observationAssignment)
      expect(formatted).toContain('OBSERVATION ASSIGNMENT FROM LAST SESSION')
      expect(formatted).toContain(observationAssignment)
      expect(filters).toContainEqual({
        table: 'conversations',
        field: 'illusion_layer',
        value: expectedPriorLayer,
      })
    }
  )

  it('omits observation assignment section when previous layer assignment is null', async () => {
    const { supabase } = createMockSupabase({
      conversations: [{ observation_assignment: null }],
    })

    const context = await buildCrossLayerContext(
      supabase,
      'user-1',
      'stress_relief',
      'emotional'
    )
    const formatted = formatCrossLayerContext(context)

    expect(context.previousLayerObservationAssignment).toBeNull()
    expect(formatted).not.toContain('OBSERVATION ASSIGNMENT FROM LAST SESSION')
  })

  it('does not query conversations for Layer 1 sessions', async () => {
    const { supabase, getConversationQueries } = createMockSupabase({
      conversations: [{ observation_assignment: 'should not be queried' }],
    })

    const context = await buildCrossLayerContext(
      supabase,
      'user-1',
      'stress_relief',
      'intellectual'
    )

    expect(context.previousLayerObservationAssignment).toBeNull()
    expect(getConversationQueries()).toBe(0)
  })

  it('includes real_world_observation moments in previous session context output', async () => {
    const realWorldObservation = 'I noticed my stress spike was strongest right before withdrawal cravings.'
    const { supabase } = createMockSupabase({
      previousMoments: [
        {
          moment_type: 'real_world_observation',
          transcript: realWorldObservation,
          illusion_layer: 'intellectual',
        },
      ],
    })

    const context = await buildCrossLayerContext(
      supabase,
      'user-1',
      'stress_relief',
      'emotional'
    )
    const formatted = formatCrossLayerContext(context)

    expect(context.realWorldObservations).toEqual([realWorldObservation])
    expect(formatted).toContain('REAL-WORLD OBSERVATION THEY REPORTED')
    expect(formatted).toContain(realWorldObservation)
  })

  it('omits real-world observation section when no observation moments exist', async () => {
    const { supabase } = createMockSupabase({
      previousMoments: [],
    })

    const context = await buildCrossLayerContext(
      supabase,
      'user-1',
      'stress_relief',
      'emotional'
    )
    const formatted = formatCrossLayerContext(context)

    expect(context.realWorldObservations).toEqual([])
    expect(formatted).not.toContain('REAL-WORLD OBSERVATION THEY REPORTED')
  })
})
