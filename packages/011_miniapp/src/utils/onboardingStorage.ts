const ONBOARDING_STORAGE_KEY = 'receipto:onboardingComplete'

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const hasCompletedOnboarding = () => {
  if (!canUseStorage()) {
    return false
  }
  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
}

export const setOnboardingCompleted = () => {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
}

export const resetOnboardingFlag = () => {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEY)
}

