export interface IntakeData {
  productTypes: string[]
  usageFrequency: string
  yearsUsing?: number
  previousAttempts?: number
  longestQuitDuration?: string
  primaryReason: string
  triggers?: string[]
}

export interface IntakeResponse {
  id: string
  user_id: string
  product_types: string[]
  usage_frequency: string
  years_using?: number
  previous_attempts?: number
  longest_quit_duration?: string
  primary_reason: string
  triggers?: string[]
  created_at: string
  updated_at: string
}

export const useIntake = () => {
  const intake = ref<IntakeResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchIntake = async () => {
    isLoading.value = true
    error.value = null

    try {
      const data = await $fetch<IntakeResponse | null>('/api/intake', {
        method: 'GET',
      })
      intake.value = data
    } catch (err: any) {
      console.error('Error fetching intake:', err)
      error.value = err.data?.message || 'Failed to load intake data'
    } finally {
      isLoading.value = false
    }
  }

  const saveIntake = async (data: IntakeData) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ intake: IntakeResponse }>('/api/intake', {
        method: 'POST',
        body: data,
      })
      intake.value = response.intake
      return response
    } catch (err: any) {
      console.error('Error saving intake:', err)
      error.value = err.data?.message || 'Failed to save intake data'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    intake,
    isLoading,
    error,
    fetchIntake,
    saveIntake,
  }
}
