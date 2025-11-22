import type { NotificationSDK } from "./types";

// let notificationContainer: HTMLDivElement | null = null;
// let root: any = null;

// // Check if we should show the UI based on query parameter
// function shouldShowUI(): boolean {
//   const urlParams = new URLSearchParams(window.location.search);
//   return urlParams.get("v") === "nsdk";
// }

// // Create notification container
// function createNotificationContainer(): void {
//   if (notificationContainer) return;

//   notificationContainer = document.createElement("div");
//   notificationContainer.id = "notification-sdk-container";
//   notificationContainer.style.cssText = `
//     position: fixed;
//     z-index: 999999;
//     pointer-events: none;
//     top: 20px;
//     right: 20px;
//   `;

//   document.body.appendChild(notificationContainer);

//   // Create React root and render the notification provider
//   root = createRoot(notificationContainer);
//   root.render(React.createElement(NotificationProvider));
// }

// Initialize the SDK
export function initializeSDK(): void {
  // Create the SDK object and attach it to window
  const sdk: NotificationSDK = {
    setUser: async (appId: string, address: string, enabled?: boolean) => {
      const baseUrl = `https://${import.meta.env.VITE_NOTIFICATION_DOMAIN}`;

      console.log(`Upserting Notification Audience`);

      const response = await fetch(`${baseUrl}/api/upsert-audience`, {
        method: "POST",
        body: JSON.stringify({ appId, address, enabled }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to upsert notification audience: ${response.statusText}`
        );
      }

      return await response.json();
    },
  };

  window.nsdk = sdk;

  //   if (shouldShowUI()) {
  //     createNotificationContainer();
  //   }

  console.log("NotificationSDK initialized");
}
