# Notification SDK

A lightweight notification SDK that can be embedded in any website via a script tag.

## Features

- 🚀 Lightweight and easy to integrate
- 🎨 Customizable themes (light/dark)
- 📱 Mobile responsive
- ⚡ React-based UI with smooth animations
- 🔧 TypeScript support
- 🌐 Cloudflare Pages deployment ready

## Usage

### Basic Integration

Add the script tag to your HTML (CSS is included inline):

```html
<script src="https://your-domain.pages.dev/notification-sdk.iife.js"></script>
```

### API

The SDK exposes a global `window.NotificationSDK` object with the following methods:

#### `setAddress(address: string)`

Sets the user's wallet address for notifications.

```javascript
window.NotificationSDK.setAddress("0x1234...5678");
```

#### `showNotification(message)`

Shows a notification to the user.

```javascript
window.NotificationSDK.showNotification({
  title: "Transaction Complete",
  message: "Your transaction has been confirmed!",
  type: "success", // 'info', 'success', 'warning', 'error'
  duration: 5000, // Optional: auto-hide after 5 seconds
});
```

#### `hideNotification(id)`

Hides a specific notification by ID.

```javascript
window.NotificationSDK.hideNotification("notification-id");
```

#### `clearAll()`

Clears all notifications.

```javascript
window.NotificationSDK.clearAll();
```

#### `getConfig()`

Gets the current configuration.

```javascript
const config = window.NotificationSDK.getConfig();
console.log(config); // { address: '0x...', theme: 'dark', position: 'top-right' }
```

#### `updateConfig(config)`

Updates the SDK configuration.

```javascript
window.NotificationSDK.updateConfig({
  theme: "light",
  position: "bottom-left",
});
```

### Development Mode

To see the notification UI during development, add `?v=nsdk` to your URL:

```
https://your-site.com?v=nsdk
```

## Configuration Options

- `address`: User's wallet address
- `theme`: 'light' or 'dark' (default: 'dark')
- `position`: 'top-right', 'top-left', 'bottom-right', 'bottom-left' (default: 'top-right')

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Deploy to Cloudflare Pages
pnpm deploy
```

## Deployment

The SDK is configured to deploy to Cloudflare Pages. After building, the `dist` folder contains the production-ready files that can be served from any CDN.

The main file to serve is `notification-sdk.iife.js` which contains the entire SDK bundle with inline CSS.
