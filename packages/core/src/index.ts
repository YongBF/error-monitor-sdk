/**
 * Error Monitor Core
 * 核心错误监控模块
 */

// 类型定义
export interface ErrorType {
  type: 'js' | 'promise' | 'network' | 'resource' | 'custom'
  message: string
  stack?: string
  context?: Record<string, any>
}

export interface LogLevel {
  debug: 'debug'
  info: 'info'
  warn: 'warn'
  error: 'error'
  fatal: 'fatal'
}

export interface ErrorReport {
  // 基础信息
  appId: string
  timestamp: number
  sessionId: string
  eventId: string

  // 错误信息
  type: string
  level: string
  message: string
  stack?: string

  // 上下文信息
  context: {
    userAgent: string
    url: string
    viewport: { width: number; height: number }
    userId?: string
    tags?: Record<string, string>
  }

  // 面包屑
  breadcrumbs: Breadcrumb[]

  // 自定义数据
  extra?: Record<string, any>
}

export interface Breadcrumb {
  timestamp: number
  type: string
  message: string
  data?: Record<string, any>
}

export interface Config {
  // 基础配置
  appId: string
  dsn: string
  environment?: string
  release?: string
  userId?: string
  tags?: Record<string, string>

  // 采样配置
  sampleRate?: number              // 总体采样率 (0-1)
  errorSampleRate?: number         // 错误采样率 (0-1)

  // 自动捕获开关
  autoCapture?: {
    js?: boolean                   // 自动捕获JS错误 (默认true)
    promise?: boolean              // 自动捕获Promise错误 (默认true)
    network?: boolean              // 自动捕获网络错误 (默认true)
    resource?: boolean             // 自动捕获资源错误 (默认true)
    console?: boolean              // 自动捕获console错误 (默认false)
  }

  // 过滤配置
  filter?: {
    // 错误消息过滤（正则表达式数组）
    ignoreErrors?: RegExp[]
    // 错误URL过滤
    ignoreUrls?: RegExp[]
    // 最小错误级别
    minLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  }

  // 上报配置
  report?: {
    // 上报延迟（批量上报延迟，毫秒）
    delay?: number
    // 批量上报数量
    batchSize?: number
    // 自定义上报函数
    customReporter?: (data: ErrorReport) => void | Promise<void>
  }

  // 调试模式
  debug?: boolean
  // 是否启用
  enabled?: boolean
}

// 捕获选项（手动上报时的选项）
export interface CaptureOptions {
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  tags?: Record<string, string>
  extra?: Record<string, any>
  user?: {
    id?: string
    username?: string
    email?: string
    [key: string]: any
  }
  // 是否跳过采样检查
  skipSampling?: boolean
  // 是否跳过过滤检查
  skipFilter?: boolean
}

export interface Plugin {
  name: string
  version?: string
  setup?: (core: Core) => void
  beforeCapture?: (error: ErrorType) => ErrorType | null
  afterCapture?: (report: ErrorReport) => ErrorReport | void
  beforeReport?: (report: ErrorReport) => ErrorReport | void
  teardown?: () => void
}

export interface Core {
  config: Config
  capture: (error: ErrorType) => void
  report: (data: ErrorReport) => void
  addBreadcrumb: (crumb: Breadcrumb) => void
  generateId: () => string
}

// 会话ID生成
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// 事件ID生成
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * ErrorMonitor 核心类
 */
export class ErrorMonitor implements Core {
  public config: Config
  private isInitialized = false
  private breadcrumbs: Breadcrumb[] = []
  private maxBreadcrumbs = 50
  private plugins: Plugin[] = []
  private sessionId = generateSessionId()

  constructor(config: Config) {
    // 应用默认配置
    this.config = {
      autoCapture: {
        js: true,
        promise: true,
        network: true,
        resource: true,
        console: false
      },
      filter: {
        ignoreErrors: [],
        ignoreUrls: [],
        minLevel: 'info'
      },
      report: {
        delay: 1000,
        batchSize: 10
      },
      sampleRate: 1.0,
      errorSampleRate: 1.0,
      enabled: true,
      debug: false,
      ...config
    }
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates }
    if (this.config.debug) {
      console.log('[ErrorMonitor] Config updated:', this.config)
    }
  }

  /**
   * 启用SDK
   */
  enable(): void {
    this.config.enabled = true
    console.log('[ErrorMonitor] SDK enabled')
  }

  /**
   * 禁用SDK
   */
  disable(): void {
    this.config.enabled = false
    console.log('[ErrorMonitor] SDK disabled')
  }

  /**
   * 添加错误过滤器
   */
  addFilter(pattern: RegExp): void {
    if (!this.config.filter) {
      this.config.filter = {}
    }
    if (!this.config.filter.ignoreErrors) {
      this.config.filter.ignoreErrors = []
    }
    this.config.filter.ignoreErrors.push(pattern)
  }

  /**
   * 移除错误过滤器
   */
  removeFilter(pattern: RegExp): void {
    if (!this.config.filter?.ignoreErrors) return
    const index = this.config.filter.ignoreErrors.indexOf(pattern)
    if (index > -1) {
      this.config.filter.ignoreErrors.splice(index, 1)
    }
  }

  /**
   * 设置采样率
   */
  setSampleRate(rate: number): void {
    this.config.sampleRate = Math.max(0, Math.min(1, rate))
  }

  /**
   * 设置错误采样率
   */
  setErrorSampleRate(rate: number): void {
    this.config.errorSampleRate = Math.max(0, Math.min(1, rate))
  }

  /**
   * 初始化监控
   */
  init(): void {
    if (this.isInitialized) {
      console.warn('[ErrorMonitor] Already initialized')
      return
    }

    this.isInitialized = true

    // 初始化插件
    this.plugins.forEach(plugin => {
      plugin.setup?.(this)
    })

    console.log('[ErrorMonitor] Initialized with appId:', this.config.appId)
  }

  /**
   * 注册插件
   */
  use(plugin: Plugin): void {
    this.plugins.push(plugin)

    // 如果已初始化，立即设置插件
    if (this.isInitialized) {
      plugin.setup?.(this)
    }
  }

  /**
   * 捕获错误（支持选项）
   */
  capture(error: ErrorType | Error, options?: CaptureOptions): void {
    if (!this.isInitialized) {
      console.warn('[ErrorMonitor] Not initialized')
      return
    }

    // 检查是否启用
    if (this.config.enabled === false) {
      return
    }

    // 标准化错误对象
    const normalizedError: ErrorType = error instanceof Error
      ? {
          type: 'custom',
          message: error.message,
          stack: error.stack,
          context: {}
        }
      : error

    // 应用选项
    const opts: Required<CaptureOptions> = {
      level: 'error',
      tags: {},
      extra: {},
      user: {},
      skipSampling: false,
      skipFilter: false,
      ...options
    }

    // 过滤检查
    if (!opts.skipFilter && this.shouldFilter(normalizedError)) {
      if (this.config.debug) {
        console.log('[ErrorMonitor] Error filtered:', normalizedError.message)
      }
      return
    }

    // 采样率检查
    if (!opts.skipSampling && this.config.errorSampleRate !== undefined) {
      if (Math.random() > this.config.errorSampleRate) {
        return
      }
    }

    // beforeCapture钩子
    let processedError = normalizedError
    for (const plugin of this.plugins) {
      const result = plugin.beforeCapture?.(normalizedError)
      if (result === null) {
        return // 插件返回null表示不上报
      }
      if (result !== undefined) {
        processedError = result
      }
    }

    // 构建错误报告
    const report: ErrorReport = {
      appId: this.config.appId,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      eventId: generateEventId(),
      type: processedError.type,
      level: opts.level,
      message: processedError.message,
      stack: processedError.stack,
      context: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        url: typeof location !== 'undefined' ? location.href : '',
        viewport: {
          width: typeof window !== 'undefined' ? window.innerWidth : 0,
          height: typeof window !== 'undefined' ? window.innerHeight : 0
        },
        userId: opts.user.id || this.config.userId,
        tags: { ...this.config.tags, ...opts.tags }
      },
      breadcrumbs: [...this.breadcrumbs],
      extra: { ...processedError.context, ...opts.extra }
    }

    // afterCapture钩子
    for (const plugin of this.plugins) {
      const result = plugin.afterCapture?.(report)
      if (result !== undefined) {
        Object.assign(report, result)
      }
    }

    this.report(report)
  }

  /**
   * 检查是否应该过滤此错误
   */
  private shouldFilter(error: ErrorType): boolean {
    if (!this.config.filter) return false

    const { ignoreErrors, ignoreUrls, minLevel } = this.config.filter

    // 检查错误消息是否匹配忽略规则
    if (ignoreErrors && ignoreErrors.length > 0) {
      for (const pattern of ignoreErrors) {
        if (pattern.test(error.message)) {
          return true
        }
      }
    }

    // 检查URL是否匹配忽略规则
    if (ignoreUrls && ignoreUrls.length > 0 && error.context?.url) {
      for (const pattern of ignoreUrls) {
        if (pattern.test(error.context.url)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * 手动上报错误（简化的API）
   */
  captureError(error: Error, options?: CaptureOptions): void {
    this.capture(error, options)
  }

  /**
   * 手动上报消息
   */
  captureMessage(message: string, level: 'debug' | 'info' | 'warn' | 'error' | 'fatal' = 'info', options?: Omit<CaptureOptions, 'level'>): void {
    this.capture({
      type: 'custom',
      message,
      context: {}
    }, { ...options, level })
  }

  /**
   * 上报错误
   */
  report(data: ErrorReport): void {
    // beforeReport钩子
    let processedReport = data
    for (const plugin of this.plugins) {
      const result = plugin.beforeReport?.(data)
      if (result !== undefined) {
        processedReport = result
      }
    }

    // 发送到服务端
    this.sendToServer(processedReport)
  }

  /**
   * 添加面包屑
   */
  addBreadcrumb(crumb: Breadcrumb): void {
    this.breadcrumbs.push({
      timestamp: crumb.timestamp || Date.now(),
      type: crumb.type,
      message: crumb.message,
      data: crumb.data
    })

    // 限制面包屑数量
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift()
    }
  }

  /**
   * 生成ID
   */
  generateId(): string {
    return generateEventId()
  }

  /**
   * 设置用户信息
   */
  setUser(user: { id?: string; [key: string]: any }): void {
    this.config.userId = user.id
    this.config.tags = { ...this.config.tags, ...user }
  }

  /**
   * 发送到服务端
   */
  private sendToServer(data: ErrorReport): void {
    if (typeof navigator === 'undefined') return

    const payload = JSON.stringify(data)

    // 使用sendBeacon（如果可用）
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon(this.config.dsn, blob)
      return
    }

    // 降级到fetch
    if (typeof fetch !== 'undefined') {
      fetch(this.config.dsn, {
        method: 'POST',
        body: payload,
        keepalive: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(err => {
        console.error('[ErrorMonitor] Failed to send report:', err)
      })
    }
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    // 清理插件
    this.plugins.forEach(plugin => {
      plugin.teardown?.()
    })

    this.plugins = []
    this.breadcrumbs = []
    this.isInitialized = false

    console.log('[ErrorMonitor] Destroyed')
  }
}

/**
 * 创建实例工厂函数
 */
export function createErrorMonitor(config: Config): ErrorMonitor {
  return new ErrorMonitor(config)
}
