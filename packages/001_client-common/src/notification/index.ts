export const upsertNotificationAudience = async (params: {
  appId: string;
  address: string;
  enabled?: boolean;
}) => {
  window.nsdk.setUser(params.appId, params.address, params.enabled ?? true);
};

interface NotificationSDK {
  setUser: (appId: string, address: string, enabled?: boolean) => Promise<void>;
}

declare global {
  interface Window {
    nsdk: NotificationSDK;
  }
}
