import { MiniKit } from '@worldcoin/minikit-js'

const isIOS = MiniKit.deviceProperties.deviceOS === 'ios'

export const getSafeAreaInsets = () => {
  return MiniKit.deviceProperties.safeAreaInsets
}

export const getSafeAreaInsetsBottom = () => {
  const bottomInset = MiniKit.deviceProperties.safeAreaInsets?.bottom ?? 0
  console.log('bottomInset', Math.max(bottomInset, isIOS ? 34 : 0))
  // TODO: remove this after testing
//   return Math.max(bottomInset, isIOS ? 34 : 0)
  return 34
}


