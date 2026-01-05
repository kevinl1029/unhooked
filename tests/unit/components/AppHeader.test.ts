import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppHeader from '~/components/AppHeader.vue'

// Mocks are configured in tests/setup.ts

describe('AppHeader', () => {
  it('renders the brand name', async () => {
    const wrapper = await mountSuspended(AppHeader)
    expect(wrapper.text()).toContain('Unhooked')
  })

  it('shows login link when user is not authenticated', async () => {
    const wrapper = await mountSuspended(AppHeader)
    expect(wrapper.text()).toContain('Continue your journey')
  })

  it('has a link to the home page', async () => {
    const wrapper = await mountSuspended(AppHeader)
    const homeLink = wrapper.find('a[href="/"]')
    expect(homeLink.exists()).toBe(true)
  })
})
