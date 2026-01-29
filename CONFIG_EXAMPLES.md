# Error Monitor SDK - 配置示例

## 完整配置示例

### 1. 基础配置（自动捕获所有错误）

```typescript
import ErrorMonitorWeb from 'error-monitor-web'

const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.your-server.com/collect',
  environment: 'production',
  release: '1.0.0'
})

monitor.init()
```

**默认行为：**
- ✅ 自动捕获JavaScript错误
- ✅ 自动捕获Promise rejection
- ✅ 自动捕获网络错误
- ✅ 自动捕获资源加载错误
- ✅ 100%采样率

---

### 2. 自定义自动捕获配置

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.your-server.com/collect',

  // 自动捕获配置
  autoCapture: {
    js: true,           // 捕获JS错误
    promise: true,      // 捕获Promise错误
    network: true,      // 捕获网络错误
    resource: true,     // 捕获资源错误
    console: false      // 不捕获console错误
  }
})

monitor.init()
```

---

### 3. 添加错误过滤（忽略特定错误）

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.your-server.com/collect',

  // 过滤配置
  filter: {
    // 忽略包含特定文本的错误
    ignoreErrors: [
      /ResizeObserver loop limit exceeded/,
      /Script error/,
      /Non-Error promise rejection captured/
    ],

    // 忽略特定URL的错误
    ignoreUrls: [
      /https:\/\/cdn\.third-party\.com/
    ],

    // 最小错误级别（只上报warn及以上）
    minLevel: 'warn'
  }
})

monitor.init()
```

---

### 4. 配置采样率

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.your-server.com/collect',

  // 采样配置
  sampleRate: 0.1,          // 总体采样10%
  errorSampleRate: 0.5      // 错误采样50%
})

monitor.init()
```

---

### 5. 使用自定义上报函数

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.your-server.com/collect',

  // 自定义上报
  report: {
    // 使用自己的上报逻辑
    customReporter: (data) => {
      // 发送到自己的服务器
      fetch('/api/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      // 或者发送到多个服务
      console.log('Error reported:', data)
    }
  }
})

monitor.init()
```

---

### 6. 调试模式

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.your-server.com/collect',

  debug: true  // 启用调试日志
})

monitor.init()
```

启用后会在控制台输出详细日志：
```
[ErrorMonitor] Config updated: {...}
[ErrorMonitor] Error filtered: Some error message
[ErrorMonitor] SDK enabled
```

---

## 动态配置API

### 更新配置

```typescript
// 运行时更新配置
monitor.updateConfig({
  sampleRate: 0.5,
  userId: 'user-123'
})
```

### 启用/禁用SDK

```typescript
// 临时禁用SDK
monitor.disable()

// 重新启用
monitor.enable()
```

### 动态添加过滤器

```typescript
// 添加错误过滤器
monitor.addFilter(/Known harmless error/)

// 移除过滤器
monitor.removeFilter(/Known harmless error/)
```

### 调整采样率

```typescript
// 设置总体采样率
monitor.setSampleRate(0.3)

// 设置错误采样率
monitor.setErrorSampleRate(0.8)
```

---

## 手动上报API

### 手动上报错误（带选项）

```typescript
// 基础用法
monitor.captureError(new Error('Something went wrong'))

// 带选项
monitor.captureError(error, {
  level: 'fatal',
  tags: {
    module: 'checkout',
    action: 'payment'
  },
  extra: {
    cartValue: 99.99,
    items: 3
  },
  user: {
    id: 'user-123',
    plan: 'premium'
  }
})
```

### 手动上报消息

```typescript
// 信息级别
monitor.captureMessage('User completed onboarding', 'info')

// 警告级别
monitor.captureMessage('API rate limit approaching', 'warn', {
  tags: { endpoint: '/api/search' }
})

// 错误级别
monitor.captureMessage('Payment failed', 'error', {
  extra: { orderId: '12345', amount: 99.99 }
})
```

### 跳过采样和过滤

```typescript
// 重要错误：跳过采样检查
monitor.captureError(criticalError, {
  skipSampling: true
})

// 被过滤规则匹配的错误：强制上报
monitor.captureError(error, {
  skipFilter: true
})
```

---

## 实际应用场景

### 场景1：生产环境（低采样率）

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.your-server.com/collect',
  environment: 'production',
  release: '1.0.0',

  // 生产环境配置
  sampleRate: 0.1,           // 只采样10%
  errorSampleRate: 0.1,

  // 忽略已知的无害错误
  filter: {
    ignoreErrors: [
      /ResizeObserver/,
      /Non-Error promise rejection/
    ]
  },

  // 关闭console捕获
  autoCapture: {
    js: true,
    promise: true,
    network: true,
    resource: true,
    console: false
  }
})

monitor.init()
```

### 场景2：开发环境（全部捕获，高采样率）

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.your-server.com/collect',
  environment: 'development',
  release: '1.0.0-dev',

  // 开发环境配置
  sampleRate: 1.0,           // 全部采样
  errorSampleRate: 1.0,
  debug: true,                // 启用调试

  // 开发环境捕获更多
  autoCapture: {
    js: true,
    promise: true,
    network: true,
    resource: true,
    console: true            // 捕获console错误
  }
})

monitor.init()
```

### 场景3：电商应用（高优先级错误）

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'ecommerce-app',
  dsn: 'https://report.your-server.com/collect',

  // 过滤无关紧要的错误
  filter: {
    ignoreErrors: [
      /adblock/,              // 广告拦截器相关
      /hotjar/,               // 分析工具相关
    ]
  }
})

monitor.init()

// 支付失败 - 最高优先级
monitor.captureError(paymentError, {
  level: 'fatal',
  tags: {
    module: 'payment',
    critical: 'true'
  },
  skipSampling: true,         // 跳过采样
  user: {
    id: userId,
    cartValue: cart.total
  }
})

// 搜索失败 - 正常优先级
monitor.captureError(searchError, {
  level: 'error',
  tags: {
    module: 'search',
    query: searchQuery
  }
})
```

### 场景4：动态调整采样率

```typescript
// 监控错误数量，动态调整采样率
let errorCount = 0

// 错误激增时降低采样率
if (errorCount > 1000) {
  monitor.setErrorSampleRate(0.1)
} else if (errorCount > 500) {
  monitor.setErrorSampleRate(0.3)
} else {
  monitor.setErrorSampleRate(1.0)
}
```

### 场景5：分阶段上线

```typescript
// 阶段1：灰度10%用户，采样10%
monitor.updateConfig({
  sampleRate: 0.01,        // 1%用户
  errorSampleRate: 0.1
})

// 阶段2：灰度50%用户，采样50%
monitor.updateConfig({
  sampleRate: 0.5,
  errorSampleRate: 0.5
})

// 阶段3：全量上线，采样100%
monitor.updateConfig({
  sampleRate: 1.0,
  errorSampleRate: 1.0
})
```

---

## 配置最佳实践

### ✅ 推荐

1. **生产环境使用采样率**
   ```typescript
   sampleRate: 0.1,
   errorSampleRate: 0.1
   ```

2. **过滤已知的无害错误**
   ```typescript
   filter: {
     ignoreErrors: [/ResizeObserver/]
   }
   ```

3. **使用tag标记错误来源**
   ```typescript
   monitor.captureError(error, {
     tags: { feature: 'checkout', step: 'payment' }
   })
   ```

4. **关键错误跳过采样**
   ```typescript
   monitor.captureError(criticalError, {
     skipSampling: true
   })
   ```

### ❌ 避免

1. **生产环境使用debug模式**
   ```typescript
   debug: true  // ❌ 会泄露敏感信息
   ```

2. **采样率设置过高**
   ```typescript
   sampleRate: 1.0  // ❌ 生产环境太贵
   ```

3. **不过滤无害错误**
   ```typescript
   // 会导致大量噪音
   ```

4. **使用默认DSN**
   ```typescript
   dsn: ''  // ❌ 必须配置
   ```

---

## 完整配置参考

```typescript
interface Config {
  // 基础配置
  appId: string                    // 必需：应用ID
  dsn: string                      // 必需：上报地址
  environment?: string              // 环境 (production/staging/development)
  release?: string                  // 版本号
  userId?: string                   // 用户ID
  tags?: Record<string, string>      // 全局标签

  // 采样配置
  sampleRate?: number               // 总体采样率 (0-1)
  errorSampleRate?: number          // 错误采样率 (0-1)

  // 自动捕获开关
  autoCapture?: {
    js?: boolean                    // 自动捕获JS错误 (默认true)
    promise?: boolean               // 自动捕获Promise错误 (默认true)
    network?: boolean               // 自动捕获网络错误 (默认true)
    resource?: boolean              // 自动捕获资源错误 (默认true)
    console?: boolean               // 自动捕获console错误 (默认false)
  }

  // 过滤配置
  filter?: {
    ignoreErrors?: RegExp[]         // 忽略匹配的错误消息
    ignoreUrls?: RegExp[]            // 忽略匹配的URL错误
    minLevel?: LogLevel              // 最小错误级别
  }

  // 上报配置
  report?: {
    delay?: number                   // 批量上报延迟（毫秒）
    batchSize?: number               // 批量上报数量
    customReporter?: (data: ErrorReport) => void  // 自定义上报函数
  }

  // 其他
  debug?: boolean                    // 调试模式
  enabled?: boolean                  // 是否启用 (默认true)
}
```
