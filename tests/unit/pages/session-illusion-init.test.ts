import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { IllusionLayer } from '~/server/utils/llm/task-types'
import SessionIllusionPage from '~/pages/session/[illusion].vue'

const {
  useRouteMock,
  useProgressMock,
  fetchProgressMock,
  currentLayerRef,
} = vi.hoisted(() => {
  const fetchProgressMock = vi.fn()
  const currentLayerRef = { value: 'intellectual' as IllusionLayer }

  return {
    useRouteMock: vi.fn(),
    useProgressMock: vi.fn(),
    fetchProgressMock,
    currentLayerRef,
  }
})

mockNuxtImport('useRoute', () => useRouteMock)
mockNuxtImport('useProgress', () => useProgressMock)

describe('session page layer initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRouteMock.mockReturnValue({
      params: { illusion: 'focus' },
      query: {},
    })
    currentLayerRef.value = 'intellectual'
    useProgressMock.mockReturnValue({
      completeSession: vi.fn(),
      fetchProgress: fetchProgressMock,
      currentLayer: currentLayerRef,
    })
  })

  it('passes resolved progress layer to voice session initialization', async () => {
    fetchProgressMock.mockResolvedValueOnce(undefined)
    currentLayerRef.value = 'emotional'

    const VoiceSessionViewStub = defineComponent({
      props: {
        illusionLayer: { type: String, default: 'intellectual' },
      },
      template: '<div data-testid="voice-view" :data-layer="illusionLayer" />',
    })

    const wrapper = await mountSuspended(SessionIllusionPage, {
      route: '/session/focus',
      global: {
        stubs: {
          VoiceSessionView: VoiceSessionViewStub,
          NuxtLink: { template: '<a><slot /></a>' },
          ChatWindow: { template: '<div data-testid="chat-window" />' },
          SessionCompleteCard: { template: '<div data-testid="session-complete-card" />' },
        },
      },
    })

    await flushPromises()

    const voiceView = wrapper.find('[data-testid="voice-view"]')
    expect(voiceView.exists()).toBe(true)
    expect(voiceView.attributes('data-layer')).toBe('emotional')
  })

  it('does not stay stuck on preparing session when fetchProgress fails', async () => {
    fetchProgressMock.mockRejectedValueOnce(new Error('progress failed'))

    const wrapper = await mountSuspended(SessionIllusionPage, {
      route: '/session/focus',
      global: {
        stubs: {
          VoiceSessionView: { template: '<div data-testid="voice-view" />' },
          NuxtLink: { template: '<a><slot /></a>' },
          ChatWindow: { template: '<div data-testid="chat-window" />' },
          SessionCompleteCard: { template: '<div data-testid="session-complete-card" />' },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).not.toContain('Preparing session...')
    expect(wrapper.find('[data-testid="voice-view"]').exists()).toBe(true)
  })
})
