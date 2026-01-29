# error-monitor-core

Core module for error monitoring SDK - A powerful, flexible error tracking solution for JavaScript applications.

## Features

- 🎯 **Error Capture**: Automatically capture JavaScript errors, Promise rejections, and custom errors
- 🍞 **Breadcrumbs**: Track user actions and application events leading up to errors
- 🔌 **Plugin System**: Extensible architecture with lifecycle hooks
- 📊 **Context Management**: Rich context information including user data, tags, and custom metadata
- 🎛️ **Sampling**: Configurable sampling rates for optimal performance
- 🚫 **Filtering**: Filter out unwanted errors by pattern or URL
- 📦 **Zero Dependencies**: Lightweight core with minimal footprint

## Installation

```bash
npm install error-monitor-core
# or
pnpm install error-monitor-core
# or
yarn add error-monitor-core
```

## Quick Start

```typescript
import { ErrorMonitor } from 'error-monitor-core'

// Initialize the monitor
const monitor = new ErrorMonitor({
  appId: 'your-app-id',
  dsn: 'https://your-error-server.com/collect',
  enabled: true
})

// Start monitoring
monitor.init()

// Capture errors manually
try {
  // Your code
} catch (error) {
  monitor.captureError(error)
}

// Capture custom messages
monitor.captureMessage('User clicked button', 'info', {
  extra: { buttonId: 'submit' }
})

// Add breadcrumbs
monitor.addBreadcrumb({
  type: 'navigation',
  message: 'User navigated to /dashboard',
  data: { from: '/home' }
})

// Set user information
monitor.setUser({
  id: 'user-123',
  username: 'john_doe',
  email: 'john@example.com'
})

// Add tags
monitor.setTags({ environment: 'production', version: '1.0.0' })
```

## Configuration

```typescript
interface Config {
  // Basic
  appId: string                    // Your application ID
  dsn: string                      // Error collection server URL
  environment?: string             // Environment name (development, production, etc.)
  release?: string                 // Release version
  userId?: string                  // User ID
  tags?: Record<string, string>    // Custom tags

  // Sampling
  sampleRate?: number              // Overall sampling rate (0-1)
  errorSampleRate?: number         // Error-specific sampling rate (0-1)

  // Auto-capture options
  autoCapture?: {
    js?: boolean                   // Auto-capture JavaScript errors
    promise?: boolean              // Auto-capture Promise rejections
    network?: boolean              // Auto-capture network errors
    resource?: boolean             // Auto-capture resource loading errors
    console?: boolean              // Auto-capture console errors
  }

  // Filtering
  filter?: {
    ignoreErrors?: RegExp[]        // Error message patterns to ignore
    ignoreUrls?: RegExp[]           // URL patterns to ignore
    minLevel?: LogLevel             // Minimum error level to capture
  }

  // Reporting
  report?: {
    delay?: number                  // Batch reporting delay (ms)
    batchSize?: number              // Batch reporting size
    customReporter?: (data: ErrorReport) => void | Promise<void>
  }

  // Debug
  debug?: boolean                  // Enable debug logging
  enabled?: boolean                // Enable/disable monitoring
}
```

## API

### Constructor

```typescript
new ErrorMonitor(config: Config)
```

### Methods

#### `init(): void`
Initialize the error monitor.

#### `capture(error: ErrorType | Error, options?: CaptureOptions): void`
Capture an error or custom message.

#### `captureError(error: Error, options?: CaptureOptions): void`
Convenience method for capturing Error objects.

#### `captureMessage(message: string, level?: LogLevel, options?: CaptureOptions): void`
Capture a custom message with optional level.

#### `addBreadcrumb(crumb: Breadcrumb): void`
Add a breadcrumb to the tracking timeline.

#### `setUser(user: User): void`
Set user information for all future error reports.

#### `setTags(tags: Record<string, string>): void`
Set tags for all future error reports.

#### `setSampleRate(rate: number): void`
Set the overall sampling rate (0-1).

#### `setErrorSampleRate(rate: number): void`
Set the error-specific sampling rate (0-1).

#### `addFilter(pattern: RegExp): void`
Add an error filter pattern.

#### `enable(): void`
Enable error monitoring.

#### `disable(): void`
Disable error monitoring.

#### `use(plugin: Plugin): void`
Register a plugin.

#### `destroy(): void`
Cleanup and destroy the monitor instance.

## Error Report Format

```typescript
interface ErrorReport {
  appId: string
  timestamp: number
  sessionId: string
  eventId: string

  type: string
  level: string
  message: string
  stack?: string

  context: {
    userAgent: string
    url: string
    viewport: { width: number; height: number }
    userId?: string
    tags?: Record<string, string>
  }

  breadcrumbs: Breadcrumb[]
  extra?: Record<string, any>
}
```

## Plugins

Create custom plugins to extend functionality:

```typescript
const myPlugin = {
  name: 'my-plugin',

  setup(core) {
    // Called when plugin is registered
  },

  beforeCapture(error) {
    // Modify error before capture
    // Return null to skip capturing
    return error
  },

  afterCapture(report) {
    // Modify report after capture
    return report
  },

  beforeReport(report) {
    // Modify report before sending to server
    return report
  },

  teardown() {
    // Cleanup when monitor is destroyed
  }
}

monitor.use(myPlugin)
```

## License

MIT

## Support

For issues and questions, please visit our GitHub repository.
