export interface NotificationSDKConfig {
  address?: string;
}

export interface NotificationSDK {
  setUser: (appId: string, address: string, enabled?: boolean) => Promise<void>;
}

declare global {
  interface Window {
    nsdk: NotificationSDK;
  }
}
