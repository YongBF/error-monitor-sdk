/**
 * Error Monitor Core
 * 核心错误监控模块
 */

import { Logger } from './logger'
import { BREADCRUMBS, SAMPLING, REPORTING, DEFAULT_CONFIG } from './constants'
import { BatchQueue } from './batch-queue'
import { OfflineCache } from './offline-cache'

// 导出Logger供外部使用
export { Logger }

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
 * 环形缓冲区实现
 * 性能优化：添加和获取都是O(1)时间复杂度
 */
class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private capacity: number
  private head: number = 0
  private tail: number = 0
  private _size: number = 0

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  /**
   * 添加元素到缓冲区（O(1)时间复杂度）
   */
  push(item: T): void {
    this.buffer[this.tail] = item
    this.tail = (this.tail + 1) % this.capacity

    if (this._size < this.capacity) {
      this._size++
    } else {
      // 缓冲区已满，移动head指针
      this.head = (this.head + 1) % this.capacity
    }
  }

  /**
   * 获取所有元素（按插入顺序）
   */
  toArray(): T[] {
    const result: T[] = []
    for (let i = 0; i < this._size; i++) {
      const index = (this.head + i) % this.capacity
      const item = this.buffer[index]
      if (item !== undefined) {
        result.push(item)
      }
    }
    return result
  }

  /**
   * 获取当前大小
   */
  getSize(): number {
    return this._size
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = new Array(this.capacity)
    this.head = 0
    this.tail = 0
    this._size = 0
  }

  /**
   * 兼容性属性：获取当前大小
   */
  get length(): number {
    return this._size
  }

  /**
   * 兼容性：数组索引访问（只读）
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this._size) {
      return undefined
    }
    const actualIndex = (this.head + index) % this.capacity
    return this.buffer[actualIndex]
  }
}

/**
 * ErrorMonitor 核心类
 */
export class ErrorMonitor implements Core {
  public config: Config
  private isInitialized = false
  private breadcrumbs: RingBuffer<Breadcrumb>
  private maxBreadcrumbs = BREADCRUMBS.MAX_SIZE
  private plugins: Plugin[] = []
  private sessionId = generateSessionId()
  private logger: Logger
  private batchQueue: BatchQueue | null = null
  private offlineCache: OfflineCache | null = null

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
        delay: REPORTING.DEFAULT_DELAY,
        batchSize: REPORTING.DEFAULT_BATCH_SIZE
      },
      sampleRate: SAMPLING.DEFAULT_RATE,
      errorSampleRate: SAMPLING.DEFAULT_RATE,
      enabled: DEFAULT_CONFIG.ENABLED,
      debug: DEFAULT_CONFIG.DEBUG,
      ...config
    }

    // 初始化日志系统
    // @ts-ignore - LogLevel enum is imported from logger
    this.logger = new Logger(this.config.enabled, this.config.debug ? 0 : 1) // 0=DEBUG, 1=INFO

    // 初始化环形缓冲区（性能优化：O(1)添加操作）
    this.breadcrumbs = new RingBuffer<Breadcrumb>(this.maxBreadcrumbs)

    // 初始化批量上报队列
    if (this.config.report) {
      this.batchQueue = new BatchQueue(
        {
          batchSize: this.config.report.batchSize || REPORTING.DEFAULT_BATCH_SIZE,
          delay: this.config.report.delay || REPORTING.DEFAULT_DELAY,
          enabled: true
        },
        (reports) => this.sendBatchToServer(reports)
      )
    }

    // 初始化离线缓存（默认启用）
    this.offlineCache = new OfflineCache(
      {
        maxCacheSize: 100,
        enabled: true,
        storageKey: `error_monitor_cache_${this.config.appId}`
      },
      (report) => this.sendToServerDirectly(report)
    )
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates }
    this.logger.debug('Config updated:', this.config)
  }

  /**
   * 启用SDK
   */
  enable(): void {
    this.config.enabled = true
    this.logger.setEnabled(true)
    this.logger.info('SDK enabled')
  }

  /**
   * 禁用SDK
   */
  disable(): void {
    this.config.enabled = false
    this.logger.setEnabled(false)
    this.logger.info('SDK disabled')
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
    this.config.sampleRate = Math.max(SAMPLING.MIN_RATE, Math.min(SAMPLING.MAX_RATE, rate))
  }

  /**
   * 设置错误采样率
   */
  setErrorSampleRate(rate: number): void {
    this.config.errorSampleRate = Math.max(SAMPLING.MIN_RATE, Math.min(SAMPLING.MAX_RATE, rate))
  }

  /**
   * 初始化监控
   */
  init(): void {
    if (this.isInitialized) {
      this.logger.warn('Already initialized')
      return
    }

    this.isInitialized = true

    // 初始化插件
    this.plugins.forEach(plugin => {
      plugin.setup?.(this)
    })

    this.logger.info('Initialized with appId:', this.config.appId)
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
      this.logger.warn('Not initialized')
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
      this.logger.debug('Error filtered:', normalizedError.message)
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
      breadcrumbs: this.breadcrumbs.toArray(),
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

    // 使用批量队列上报（如果启用）或直接上报
    if (this.batchQueue) {
      this.batchQueue.add(processedReport)
    } else {
      this.sendToServer(processedReport)
    }
  }

  /**
   * 添加面包屑（使用环形缓冲区，O(1)性能）
   */
  addBreadcrumb(crumb: Breadcrumb): void {
    this.breadcrumbs.push({
      timestamp: crumb.timestamp || Date.now(),
      type: crumb.type,
      message: crumb.message,
      data: crumb.data
    })
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
   * 发送到服务端（通过离线缓存）
   */
  private sendToServer(data: ErrorReport): void {
    if (this.offlineCache) {
      // 使用离线缓存（会根据网络状态决定是发送还是缓存）
      this.offlineCache.send(data)
    } else {
      // 直接发送（降级方案）
      this.sendToServerDirectly(data)
    }
  }

  /**
   * 直接发送到服务端（不经过离线缓存）
   */
  private sendToServerDirectly(data: ErrorReport): void {
    // 如果配置了customReporter，使用它
    if (this.config.report?.customReporter) {
      this.config.report.customReporter(data)
      return
    }

    // 默认发送逻辑
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
        this.logger.error('Failed to send report:', err)
      })
    }
  }

  /**
   * 批量发送到服务端
   */
  private sendBatchToServer(reports: ErrorReport[]): void {
    // 如果配置了customReporter，使用它（批量格式）
    if (this.config.report?.customReporter) {
      // 批量模式：发送包装后的批量数据
      const customData = { reports }
      this.config.report.customReporter(customData)
      return
    }

    // 默认发送逻辑
    if (typeof navigator === 'undefined') return

    const payload = JSON.stringify({ reports })

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
        this.logger.error('Failed to send batch reports:', err)
      })
    }
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    // 清理批量队列
    if (this.batchQueue) {
      this.batchQueue.destroy()
      this.batchQueue = null
    }

    // 清理离线缓存
    if (this.offlineCache) {
      this.offlineCache.destroy()
      this.offlineCache = null
    }

    // 清理插件
    this.plugins.forEach(plugin => {
      plugin.teardown?.()
    })

    this.plugins = []
    this.breadcrumbs.clear()
    this.isInitialized = false

    this.logger.info('Destroyed')
  }
}

/**
 * 创建实例工厂函数
 */
export function createErrorMonitor(config: Config): ErrorMonitor {
  return new ErrorMonitor(config)
}
