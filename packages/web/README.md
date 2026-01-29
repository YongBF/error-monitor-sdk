# error-monitor-web

Web error monitoring SDK - Browser-specific error tracking capabilities built on top of error-monitor-core.

## Features

- 🌐 **Browser Error Capture**: Automatically captures JavaScript errors, Promise rejections, network errors, and resource loading errors
- 🖥️ **Blank Screen Detection**: Intelligent detection of white screen issues
- 📡 **Request Interception**: Built-in fetch and XMLHttpRequest interception
- 🎨 **Context Collection**: Automatic collection of browser context information (user agent, URL, viewport)
- 🔗 **Easy Integration**: Simple setup with automatic browser API hooking

## Installation

```bash
npm install error-monitor-web
# or
pnpm install error-monitor-web
# or
yarn add error-monitor-web
```

## Quick Start

```typescript
import { ErrorMonitorWeb } from 'error-monitor-web'

// Initialize the monitor
const monitor = new ErrorMonitorWeb({
  appId: 'your-app-id',
  dsn: 'https://your-error-server.com/collect',
  enabled: true,

  // Auto-capture options (all enabled by default)
  autoCapture: {
    js: true,        // JavaScript errors
    promise: true,   // Promise rejections
    network: true,   // Network errors (fetch/XHR)
    resource: true   // Resource loading errors
  }
})

// Start monitoring
monitor.init()

// The monitor will now automatically capture:
// - Unhandled JavaScript errors
// - Unhandled Promise rejections
// - Failed fetch requests
// - Failed XMLHttpRequests
// - Failed resource loading (images, scripts, stylesheets, etc.)
```

## Configuration

All options from `error-monitor-core` plus web-specific options:

```typescript
interface WebConfig extends Config {
  // Auto-capture switches
  autoCapture?: {
    js?: boolean                   // JavaScript errors (default: true)
    promise?: boolean              // Promise rejections (default: true)
    network?: boolean              // Network errors (default: true)
    resource?: boolean             // Resource loading errors (default: true)
  }

  // Blank screen detection
  blankScreenDetection?: {
    enabled?: boolean              // Enable blank screen detection (default: false)
    detectionDelay?: number        // Delay before first check (ms, default: 3000)
    minElements?: number           // Minimum DOM elements to consider not blank (default: 10)
    checkInterval?: number          // Check interval (ms, default: 1000)
    maxChecks?: number              // Maximum number of checks (default: 5)
  }
}
```

## Automatic Error Capture

### JavaScript Errors

```typescript
// Automatically captured when enabled
// Error includes:
// - Error message and stack trace
// - File name, line number, column number
// - Browser context (user agent, URL, viewport)
```

### Promise Rejections

```typescript
// Automatically captured when enabled
// Captures unhandled promise rejections
// Includes rejection reason and stack trace
```

### Network Errors

```typescript
// Fetch errors are automatically intercepted
fetch('https://api.example.com/data')
  .then(res => res.json())
  .catch(error => {
    // Error is captured automatically
  })

// XMLHttpRequest errors are also intercepted
const xhr = new XMLHttpRequest()
xhr.open('GET', 'https://api.example.com/data')
xhr.send()
// If this fails, the error is captured
```

### Resource Loading Errors

```typescript
// Resource loading failures are captured
// <img src="missing-image.png" />
// If this fails to load, the error is captured
```

## Manual Error Capture

```typescript
// Capture errors manually
try {
  // Your code
} catch (error) {
  monitor.captureError(error, {
    level: 'error',
    tags: { module: 'checkout' },
    extra: { cartId: '12345' }
  })
}

// Capture custom messages
monitor.captureMessage('Payment failed', 'warning', {
  extra: { reason: 'Insufficient funds', amount: 100 }
})
```

## Blank Screen Detection

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'your-app-id',
  dsn: 'https://your-error-server.com/collect',
  blankScreenDetection: {
    enabled: true,
    detectionDelay: 5000,    // Start checking after 5 seconds
    minElements: 15,         // Need at least 15 DOM elements
    checkInterval: 1000,      // Check every second
    maxChecks: 5             // Check 5 times max
  }
})

monitor.init()

// Blank screen detection will:
// - Monitor DOM element count
// - Check if body has content
// - Use Performance API for additional metrics
// - Report blank screen if detected
```

## Breadcrumbs

Track user actions leading up to errors:

```typescript
// Add navigation breadcrumbs
monitor.addBreadcrumb({
  type: 'navigation',
  message: 'User navigated to checkout',
  data: { from: '/cart', to: '/checkout' }
})

// Add user action breadcrumbs
monitor.addBreadcrumb({
  type: 'user',
  message: 'User clicked submit button',
  data: { buttonId: 'submit-payment' }
})

// Add custom breadcrumbs
monitor.addBreadcrumb({
  type: 'custom',
  message: 'API call started',
  data: { endpoint: '/api/payment' }
})
```

## User Information

```typescript
// Set user information
monitor.setUser({
  id: 'user-123',
  username: 'john_doe',
  email: 'john@example.com',
  plan: 'premium'
})

// User info is included in all error reports
```

## Tags

```typescript
// Add tags to categorize errors
monitor.setTags({
  environment: 'production',
  version: '1.0.0',
  framework: 'react',
  build: '2024-01-29'
})
```

## Context Information

Automatically collected context:

```typescript
{
  userAgent: string          // Browser user agent
  url: string                 // Current page URL
  viewport: {
    width: number            // Viewport width
    height: number           // Viewport height
  }
}
```

## Sampling

Control error reporting rate:

```typescript
// Set overall sampling rate (capture 10% of all events)
monitor.setSampleRate(0.1)

// Set error-specific sampling rate
monitor.setErrorSampleRate(0.5)  // Capture 50% of errors
```

## Filtering

Filter out unwanted errors:

```typescript
// Filter by error message pattern
monitor.addFilter(/Script error/i)  // Ignore all script errors
monitor.addFilter(/_追踪/)          // Ignore errors containing "_追踪"

// Errors matching patterns won't be captured
```

## Error Report Format

```typescript
{
  appId: 'your-app-id',
  timestamp: 1234567890,
  sessionId: 'session-123',
  eventId: 'event-456',

  type: 'js',  // 'js', 'promise', 'network', 'resource', 'custom'
  level: 'error',
  message: 'Uncaught Error: Something went wrong',
  stack: 'Error: Something went wrong\\n    at...',

  context: {
    userAgent: 'Mozilla/5.0...',
    url: 'https://example.com/page',
    viewport: { width: 1920, height: 1080 },
    userId: 'user-123',
    tags: { environment: 'production', version: '1.0.0' }
  },

  breadcrumbs: [
    {
      timestamp: 1234567880,
      type: 'navigation',
      message: 'User navigated to /checkout',
      data: { from: '/cart' }
    }
  ],

  extra: {
    customField: 'custom value'
  }
}
```

## Cleanup

```typescript
// When your app is unmounting or cleaning up
monitor.destroy()

// This will:
// - Remove all event listeners
// - Restore original fetch and XMLHttpRequest
// - Stop blank screen detection
// - Clear all timers
```

## Browser Support

- Chrome/Edge: ✅ Latest
- Firefox: ✅ Latest
- Safari: ✅ Latest
- Opera: ✅ Latest

## License

MIT

## Support

For issues and questions, please visit our GitHub repository.
