import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SessionCompleteCard from '~/components/SessionCompleteCard.vue'

describe('SessionCompleteCard', () => {
  describe('CTA Priority', () => {
    it('renders Return to Dashboard as the primary button (first, with btn-primary class)', async () => {
      const wrapper = await mountSuspended(SessionCompleteCard, {
        props: {
          nextIllusion: 2
        }
      })

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)

      // First button should be "Return to Dashboard" with primary styling
      const dashboardButton = buttons[0]
      expect(dashboardButton.text()).toBe('Return to Dashboard')
      expect(dashboardButton.classes()).toContain('btn-primary')
    })

    it('renders Continue to Next Session as secondary button when nextIllusion exists', async () => {
      const wrapper = await mountSuspended(SessionCompleteCard, {
        props: {
          nextIllusion: 2
        }
      })

      const buttons = wrapper.findAll('button')

      // Second button should be "Continue to Next Session" with secondary styling (no btn-primary)
      const continueButton = buttons[1]
      expect(continueButton.text()).toBe('Continue to Next Session')
      expect(continueButton.classes()).not.toContain('btn-primary')
      expect(continueButton.classes()).toContain('border')
    })

    it('renders Complete the Program as secondary button when nextIllusion is null', async () => {
      const wrapper = await mountSuspended(SessionCompleteCard, {
        props: {
          nextIllusion: null
        }
      })

      const buttons = wrapper.findAll('button')

      // Second button should be "Complete the Program" with secondary styling
      const completeButton = buttons[1]
      expect(completeButton.text()).toBe('Complete the Program')
      expect(completeButton.classes()).not.toContain('btn-primary')
    })
  })

  describe('Event Emissions', () => {
    it('emits dashboard event when Return to Dashboard is clicked', async () => {
      const wrapper = await mountSuspended(SessionCompleteCard, {
        props: {
          nextIllusion: 2
        }
      })

      const dashboardButton = wrapper.findAll('button')[0]
      await dashboardButton.trigger('click')

      expect(wrapper.emitted('dashboard')).toBeTruthy()
      expect(wrapper.emitted('dashboard')?.length).toBe(1)
    })

    it('emits continue event with illusion number when Continue is clicked', async () => {
      const wrapper = await mountSuspended(SessionCompleteCard, {
        props: {
          nextIllusion: 3
        }
      })

      const continueButton = wrapper.findAll('button')[1]
      await continueButton.trigger('click')

      expect(wrapper.emitted('continue')).toBeTruthy()
      expect(wrapper.emitted('continue')?.[0]).toEqual([3])
    })

    it('emits finish event when Complete the Program is clicked', async () => {
      const wrapper = await mountSuspended(SessionCompleteCard, {
        props: {
          nextIllusion: null
        }
      })

      const completeButton = wrapper.findAll('button')[1]
      await completeButton.trigger('click')

      expect(wrapper.emitted('finish')).toBeTruthy()
      expect(wrapper.emitted('finish')?.length).toBe(1)
    })
  })

  describe('Content', () => {
    it('displays session complete heading and encouragement message', async () => {
      const wrapper = await mountSuspended(SessionCompleteCard, {
        props: {
          nextIllusion: 2
        }
      })

      expect(wrapper.text()).toContain('Session Complete')
      expect(wrapper.text()).toContain('Great work')
    })
  })
})
