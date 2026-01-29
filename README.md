# Error Monitor SDK

一个功能全面的前端错误监控SDK，支持Web端和小程序端。

## 特性

✅ **多端支持** - 独立包模式，支持Web和小程序
✅ **错误捕获** - JavaScript、Promise、网络、资源加载错误
✅ **性能监控** - Web Vitals、资源加载时间、自定义指标
✅ **行为追踪** - 点击、输入、路由、HTTP请求追踪
✅ **插件化** - 核心轻量，功能可扩展
✅ **TypeScript** - 完整的类型定义

## 包结构

```
error-monitor-sdk/
├── error-monitor-core          # 核心包
├── error-monitor-web           # Web端SDK
├── @error-monitor/plugin-perf  # 性能监控插件
└── @error-monitor/plugin-behavior # 用户行为插件
```

## 快速开始

### 安装

```bash
# Web端
npm install error-monitor-web

# 或使用pnpm
pnpm add error-monitor-web
```

### 基础使用（自动捕获错误）

```typescript
import ErrorMonitorWeb from 'error-monitor-web'

const monitor = new ErrorMonitorWeb({
  appId: 'your-app-id',
  dsn: 'https://report.your-server.com/collect',
  environment: 'production',
  release: '1.0.0'
})

// 初始化后自动捕获所有错误
monitor.init()
```

**默认自动捕获：**
- ✅ JavaScript运行时错误
- ✅ Promise rejection错误
- ✅ 网络请求错误
- ✅ 资源加载错误

### 使用插件

```typescript
import ErrorMonitorWeb from 'error-monitor-web'
import { PerformancePlugin } from '@error-monitor/plugin-perf'
import { BehaviorPlugin } from '@error-monitor/plugin-behavior'

const monitor = new ErrorMonitorWeb({
  appId: 'your-app-id',
  dsn: 'https://report.your-server.com/collect',
  plugins: [
    new PerformancePlugin(),
    new BehaviorPlugin()
  ]
})

monitor.init()
```

## 配置选项

### 完整配置

```typescript
const monitor = new ErrorMonitorWeb({
  // 必需配置
  appId: 'your-app-id',
  dsn: 'https://report.your-server.com/collect',

  // 可选配置
  environment: 'production',
  release: '1.0.0',

  // 自动捕获配置
  autoCapture: {
    js: true,           // 自动捕获JS错误 (默认true)
    promise: true,      // 自动捕获Promise错误 (默认true)
    network: true,      // 自动捕获网络错误 (默认true)
    resource: true,     // 自动捕获资源错误 (默认true)
    console: false      // 自动捕获console错误 (默认false)
  },

  // 采样配置
  sampleRate: 1.0,          // 总体采样率 (0-1)
  errorSampleRate: 1.0,     // 错误采样率 (0-1)

  // 过滤配置
  filter: {
    ignoreErrors: [
      /ResizeObserver loop limit exceeded/,
      /Script error/
    ],
    ignoreUrls: [
      /https:\/\/ads\.com/
    ]
  },

  // 调试模式
  debug: false
})
```

### 配置说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `appId` | string | 必需 | 应用ID |
| `dsn` | string | 必需 | 数据上报地址 |
| `environment` | string | - | 环境标识 |
| `release` | string | - | 版本号 |
| `autoCapture` | object | - | 自动捕获开关 |
| `sampleRate` | number | 1.0 | 总体采样率 (0-1) |
| `errorSampleRate` | number | 1.0 | 错误采样率 (0-1) |
| `filter` | object | - | 过滤规则 |
| `debug` | boolean | false | 调试模式 |

## API

### 初始化方法

```typescript
// 初始化SDK
monitor.init()
```

### 自动捕获

SDK初始化后会自动捕获以下错误：
- JavaScript运行时错误
- Promise rejection错误
- 网络请求错误
- 资源加载错误

### 手动上报

#### 上报错误（带选项）

```typescript
// 基础用法
monitor.captureError(new Error('Something went wrong'))

// 带选项的上报
monitor.captureError(error, {
  level: 'fatal',              // 错误级别
  tags: {                       // 标签
    module: 'checkout',
    action: 'payment'
  },
  extra: {                      // 额外数据
    cartValue: 99.99
  },
  user: {                       // 用户信息
    id: 'user-123',
    plan: 'premium'
  },
  skipSampling: true,           // 跳过采样检查
  skipFilter: true              // 跳过过滤检查
})
```

#### 上报消息

```typescript
// 信息级别
monitor.captureMessage('User completed onboarding', 'info')

// 警告级别
monitor.captureMessage('API rate limit approaching', 'warn')

// 错误级别
monitor.captureMessage('Payment failed', 'error')

// 带选项
monitor.captureMessage('Search failed', 'error', {
  tags: { endpoint: '/api/search' },
  extra: { query: 'example' }
})
```

### 动态配置

```typescript
// 更新配置
monitor.updateConfig({
  sampleRate: 0.5,
  userId: 'user-123'
})

// 启用SDK
monitor.enable()

// 禁用SDK
monitor.disable()

// 添加错误过滤器
monitor.addFilter(/Known error/)

// 移除错误过滤器
monitor.removeFilter(/Known error/)

// 设置采样率
monitor.setSampleRate(0.3)
monitor.setErrorSampleRate(0.5)
```

### PerformancePlugin

性能监控插件，用于采集Web Vitals和资源加载性能。

```typescript
import { PerformancePlugin } from '@error-monitor/plugin-perf'

const perfPlugin = new PerformancePlugin({
  collectWebVitals: true,        // 采集Web Vitals
  collectResources: true,        // 采集资源加载时间
  threshold: 100                 // 性能阈值(ms)
})
```

### BehaviorPlugin

用户行为追踪插件，记录用户交互轨迹。

```typescript
import { BehaviorPlugin } from '@error-monitor/plugin-behavior'

const behaviorPlugin = new BehaviorPlugin({
  trackClicks: true,             // 追踪点击
  trackInput: true,              // 追踪输入
  trackNavigation: true,         // 追踪路由
  trackHttp: true,               // 追踪HTTP请求
  maxTraces: 100                 // 最大追踪数量
})

// 手动追踪自定义事件
behaviorPlugin.track('custom_event', { key: 'value' })
```

## 开发

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 构建

```bash
# 构建所有包
pnpm build

# 构建特定包
pnpm --filter error-monitor-web build
```

### 开发

```bash
# 监听模式开发
pnpm dev
```

### 测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm --filter error-monitor-core test
```

## 插件开发

```typescript
import type { Plugin, Core } from 'error-monitor-core'

class MyPlugin implements Plugin {
  name = 'my-plugin'
  version = '1.0.0'

  setup(core: Core) {
    // 插件初始化
    console.log('Plugin setup')
  }

  beforeCapture(error: any) {
    // 在错误捕获前处理
    console.log('Before capture:', error)
    return error
  }

  afterCapture(report: any) {
    // 在错误捕获后处理
    console.log('After capture:', report)
  }

  teardown() {
    // 清理资源
    console.log('Plugin teardown')
  }
}
```

## 包体积

| 包 | Gzip | 说明 |
|---|------|------|
| error-monitor-core | ~8KB | 核心包 |
| error-monitor-web | ~15KB | Web端 |
| @error-monitor/plugin-perf | ~3KB | 性能插件 |
| @error-monitor/plugin-behavior | ~2KB | 行为插件 |

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 路线图

- [ ] 小程序端支持
- [ ] 会话回放插件
- [ ] 白屏检测插件
- [ ] React/Vue集成包
- [ ] Source Map CLI工具
