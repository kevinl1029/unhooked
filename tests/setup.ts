import { vi } from 'vitest'

// Mock useAuth composable
vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    signOut: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn().mockResolvedValue(undefined),
  }),
}))
