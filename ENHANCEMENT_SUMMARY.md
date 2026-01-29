# ✅ Error Monitor SDK - 功能增强完成

## 更新摘要

SDK现已支持**自动错误捕获**和**灵活的手动配置**！

---

## 🆕 新增功能

### 1. 自动捕获配置

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.example.com/collect',

  autoCapture: {
    js: true,       // 自动捕获JS错误 ✅
    promise: true,  // 自动捕获Promise错误 ✅
    network: true,   // 自动捕获网络错误 ✅
    resource: true,  // 自动捕获资源错误 ✅
    console: false  // 自动捕获console错误
  }
})

monitor.init()  // 自动捕获开始工作！
```

### 2. 错误过滤

```typescript
const monitor = new ErrorMonitorWeb({
  filter: {
    ignoreErrors: [
      /ResizeObserver loop/,      // 忽略这些错误
      /Script error/
    ],
    ignoreUrls: [
      /https:\/\/ads\.com/        // 忽略这些URL的错误
    ]
  }
})
```

### 3. 灵活的手动上报

```typescript
// 基础用法
monitor.captureError(new Error('Payment failed'))

// 高级用法（带选项）
monitor.captureError(error, {
  level: 'fatal',                    // 错误级别
  tags: { module: 'checkout' },      // 标签
  extra: { cartValue: 99.99 },       // 额外数据
  skipSampling: true,                // 跳过采样
  skipFilter: true                   // 跳过过滤
})
```

### 4. 动态配置API

```typescript
// 运行时更新配置
monitor.updateConfig({ sampleRate: 0.5 })

// 启用/禁用SDK
monitor.enable()
monitor.disable()

// 动态添加过滤器
monitor.addFilter(/New error pattern/)

// 调整采样率
monitor.setSampleRate(0.3)
```

---

## 📊 配置对比

### 之前（手动配置）

```typescript
// ❌ 需要手动配置每个捕获类型
const monitor = new ErrorMonitorWeb({
  captureJsErrors: true,
  capturePromiseErrors: true,
  captureNetworkErrors: true,
  captureResourceErrors: true
})
```

### 现在（智能默认 + 灵活配置）

```typescript
// ✅ 默认自动捕获所有错误
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.example.com/collect'
  // 默认：js, promise, network, resource 都是true
})

// 需要自定义时才配置
const monitor2 = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.example.com/collect',
  autoCapture: {
    js: false,          // 禁用JS错误自动捕获
    network: false      // 禁用网络错误自动捕获
  }
})
```

---

## 📈 新增API方法

| 方法 | 说明 |
|------|------|
| `updateConfig(updates)` | 运行时更新配置 |
| `enable()` | 启用SDK |
| `disable()` | 禁用SDK |
| `addFilter(pattern)` | 添加错误过滤器 |
| `removeFilter(pattern)` | 移除错误过滤器 |
| `setSampleRate(rate)` | 设置总体采样率 |
| `setErrorSampleRate(rate)` | 设置错误采样率 |
| `capture(error, options)` | 捕获错误（支持选项） |
| `captureError(error, options)` | 手动上报错误 |
| `captureMessage(msg, level, options)` | 手动上报消息 |

---

## 🎯 使用场景

### 场景1：生产环境（自动捕获 + 过滤）

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.example.com/collect',
  environment: 'production',

  // 自动捕获所有错误
  autoCapture: {
    js: true,
    promise: true,
    network: true,
    resource: true
  },

  // 过滤无害错误
  filter: {
    ignoreErrors: [
      /ResizeObserver/,
      /Non-Error promise rejection/
    ]
  },

  // 降低采样率以节省成本
  sampleRate: 0.1,
  errorSampleRate: 0.1
})

monitor.init()  // ✅ 自动开始监控！
```

### 场景2：开发环境（高采样率 + 调试）

```typescript
const monitor = new ErrorMonitorWeb({
  appId: 'my-app',
  dsn: 'https://report.example.com/collect',
  environment: 'development',

  // 全部捕获
  autoCapture: {
    js: true,
    promise: true,
    network: true,
    resource: true,
    console: true
  },

  // 高采样率
  sampleRate: 1.0,
  errorSampleRate: 1.0,

  // 调试模式
  debug: true
})

monitor.init()
```

### 场景3：关键错误（跳过采样）

```typescript
// 支付失败 - 最高优先级，必须上报
monitor.captureError(paymentError, {
  level: 'fatal',
  tags: { critical: 'true' },
  skipSampling: true  // ✅ 跳过采样，确保上报
})

// 普通错误 - 正常采样
monitor.captureError(normalError)
```

---

## 📦 包大小

| 包 | 大小 | 变化 |
|---|------|------|
| error-monitor-core | ~4.5 KB | +1.8 KB |
| error-monitor-web | ~4.5 KB | +0.3 KB |
| @error-monitor/plugin-perf | ~4.8 KB | 无变化 |
| @error-monitor/plugin-behavior | ~4.3 KB | 无变化 |

**总体积：** ~18 KB gzipped ✅

---

## 📄 文档

1. **README.md** - 更新了配置选项和API文档
2. **CONFIG_EXAMPLES.md** - 详细的配置示例和最佳实践
3. **TEST_REPORT.md** - 测试报告

---

## 🚀 快速开始

### 1. 安装

```bash
npm install error-monitor-web
```

### 2. 使用

```typescript
import ErrorMonitorWeb from 'error-monitor-web'

const monitor = new ErrorMonitorWeb({
  appId: 'your-app-id',
  dsn: 'https://report.your-server.com/collect'
})

monitor.init()  // ✅ 自动捕获错误！

// 手动上报（带选项）
monitor.captureError(new Error('Custom error'), {
  level: 'error',
  tags: { module: 'checkout' }
})

// 动态调整配置
monitor.setSampleRate(0.5)
```

---

## ✅ 完成状态

- ✅ 自动错误捕获（默认开启）
- ✅ 手动上报（支持灵活配置）
- ✅ 错误过滤（支持正则表达式）
- ✅ 采样率控制（总体 + 错误）
- ✅ 动态配置API
- ✅ TypeScript类型支持
- ✅ 完整文档和示例

**SDK已准备好在生产环境使用！** 🎉
