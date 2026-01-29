/**
 * Error Monitor Web
 * Web端错误监控模块
 */

import { ErrorMonitor, Config, Logger } from 'error-monitor-core'
import {
  BlankScreenDetector,
  BlankScreenConfig,
  createBlankScreenDetector
} from './blank-screen-detector'
import {
  PerformanceMonitor,
  createPerformanceMonitor,
  PerformanceMetrics
} from './performance-monitor'

// 导出核心
export { ErrorMonitor } from 'error-monitor-core'
export type { Config, Plugin, Breadcrumb } from 'error-monitor-core'

// 导出白屏检测
export { BlankScreenDetector, createBlankScreenDetector }
export type { BlankScreenConfig, BlankScreenReport } from './blank-screen-detector'

// 导出性能监控
export { PerformanceMonitor, createPerformanceMonitor }
export type { PerformanceMetrics } from './performance-monitor'

/**
 * Web端配置
 */
export interface WebConfig extends Config {
  // 是否自动捕获全局错误 (已弃用，请使用 autoCapture)
  captureJsErrors?: boolean
  // 是否捕获Promise错误 (已弃用，请使用 autoCapture)
  capturePromiseErrors?: boolean
  // 是否捕获网络错误 (已弃用，请使用 autoCapture)
  captureNetworkErrors?: boolean
  // 是否捕获资源加载错误 (已弃用，请使用 autoCapture)
  captureResourceErrors?: boolean
  // 是否启用白屏检测
  blankScreenDetection?: boolean | BlankScreenConfig
  // 自定义上报函数
  customReporter?: (data: any) => void
}

/**
 * Web端错误监控类
 */
export class ErrorMonitorWeb extends ErrorMonitor {
  protected config: WebConfig
  private originalFetch: typeof fetch | null = null
  private originalXHR: typeof XMLHttpRequest | null = null
  private blankScreenDetector: BlankScreenDetector | null = null
  private performanceMonitor: PerformanceMonitor
  private logger: Logger
  // 内存泄漏防护：追踪事件监听器和定时器
  private eventListeners: Array<{
    target: EventTarget
    type: string
    listener: EventListenerOrEventListenerObject
    options?: AddEventListenerOptions | boolean
  }> = []
  private timers: Set<number> = new Set()

  constructor(config: WebConfig) {
    super(config)
    this.config = config
    // @ts-ignore - LogLevel enum
    this.logger = new Logger(config.enabled !== false, config.debug ? 0 : 1) // 0=DEBUG, 1=INFO
    // 初始化性能监控器
    this.performanceMonitor = createPerformanceMonitor()
  }

  /**
   * 初始化Web端监控
   */
  init(): void {
    // 开始记录初始化时间
    this.performanceMonitor.startInit()

    super.init()

    if (typeof window === 'undefined') {
      this.logger.warn('Not in browser environment')
      return
    }

    // 支持新旧两种配置格式
    // 新格式: autoCapture.js
    // 旧格式: captureJsErrors
    const captureJs = this.config.autoCapture?.js !== false && this.config.captureJsErrors !== false
    const capturePromise = this.config.autoCapture?.promise !== false && this.config.capturePromiseErrors !== false
    const captureNetwork = this.config.autoCapture?.network !== false && this.config.captureNetworkErrors !== false
    const captureResource = this.config.autoCapture?.resource !== false && this.config.captureResourceErrors !== false

    // 自动捕获各种错误
    if (captureJs) {
      this.setupJsErrorHandler()
    }

    if (capturePromise) {
      this.setupPromiseErrorHandler()
    }

    if (captureNetwork) {
      this.setupNetworkErrorHandler()
    }

    if (captureResource) {
      this.setupResourceErrorHandler()
    }

    // 初始化白屏检测
    if (this.config.blankScreenDetection) {
      this.setupBlankScreenDetection()
    }

    // 结束记录初始化时间
    this.performanceMonitor.endInit()

    this.logger.info('Web handlers initialized')
  }

  /**
   * 内存泄漏防护：追踪事件监听器
   */
  private trackedAddEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void {
    // 只在有options时传递，避免传递undefined
    if (options !== undefined) {
      target.addEventListener(type, listener, options)
    } else {
      target.addEventListener(type, listener)
    }
    this.eventListeners.push({ target, type, listener, options })
  }

  /**
   * 内存泄漏防护：追踪定时器
   */
  private trackedSetTimeout(callback: () => void, delay: number): number {
    const id = window.setTimeout(callback, delay)
    this.timers.add(id)
    return id
  }

  /**
   * 内存泄漏防护：清除定时器并移除追踪
   */
  private trackedClearTimeout(id: number | null): void {
    if (id !== null) {
      window.clearTimeout(id)
      this.timers.delete(id)
    }
  }

  /**
   * JavaScript错误处理
   */
  private setupJsErrorHandler(): void {
    this.trackedAddEventListener(window, 'error', (event) => {
      this.capture({
        type: 'js',
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })
  }

  /**
   * Promise错误处理
   */
  private setupPromiseErrorHandler(): void {
    this.trackedAddEventListener(window, 'unhandledrejection', (event) => {
      this.capture({
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        context: {
          reason: event.reason
        }
      })
    })
  }

  /**
   * 网络请求错误处理
   */
  private setupNetworkErrorHandler(): void {
    // 拦截fetch
    if (typeof window.fetch !== 'undefined') {
      this.originalFetch = window.fetch
      const self = this

      window.fetch = function (...args: Parameters<typeof fetch>) {
        return self.originalFetch!
          .apply(this, args as any)
          .catch((error) => {
            const url = typeof args[0] === 'string' ? args[0] : String(args[0])
            const method = args[1]?.method || 'GET'

            self.capture({
              type: 'network',
              message: `Network error: ${method} ${url}`,
              context: {
                url,
                method,
                error: error.message
              }
            })

            throw error
          })
      }
    }

    // 拦截XMLHttpRequest（简化版）
    if (typeof window.XMLHttpRequest !== 'undefined') {
      this.originalXHR = window.XMLHttpRequest
      const self = this

      const OriginalXHR = this.originalXHR
      window.XMLHttpRequest = function () {
        const xhr = new OriginalXHR()
        const originalOpen = xhr.open
        const originalSend = xhr.send
        let url = ''
        let method = ''

        xhr.open = function (...args: any[]) {
          method = args[0] || 'GET'
          url = String(args[1] || '')
          return originalOpen.apply(this, args as any)
        }

        xhr.send = function (...args: any[]) {
          xhr.addEventListener('error', () => {
            self.capture({
              type: 'network',
              message: `XHR error: ${method} ${url}`,
              context: {
                url,
                method,
                status: xhr.status
              }
            })
          })

          return originalSend.apply(this, args as any)
        }

        return xhr
      } as any
    }
  }

  /**
   * 资源加载错误处理
   */
  private setupResourceErrorHandler(): void {
    this.trackedAddEventListener(window, 'error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement
        this.capture({
          type: 'resource',
          message: `Resource load error: ${target.tagName}`,
          context: {
            tagName: target.tagName,
            src: (target as any).src || (target as any).href
          }
        })
      }
    }, true)
  }

  /**
   * 白屏检测
   */
  private setupBlankScreenDetection(): void {
    this.logger.debug('Setting up blank screen detection...')
    const config =
      typeof this.config.blankScreenDetection === 'boolean'
        ? {}
        : this.config.blankScreenDetection

    this.logger.debug('Blank screen config:', config)
    this.blankScreenDetector = createBlankScreenDetector(config)

    this.blankScreenDetector.start((report) => {
      this.logger.warn('Blank screen detected!', report)
      this.capture({
        type: report.type,
        message: report.message,
        context: report.context
      })
    })

    this.logger.debug('Blank screen detection started')
  }

  /**
   * 手动上报错误
   */
  captureError(error: Error, context?: Record<string, any>): void {
    this.capture({
      type: 'custom',
      message: error.message,
      stack: error.stack,
      context
    })
  }

  /**
   * 手动上报消息
   */
  captureMessage(message: string, level: string = 'info'): void {
    this.capture({
      type: 'custom',
      message,
      context: { level }
    })
  }

  /**
   * 重写capture方法以记录错误处理时间
   */
  capture(error: any, options?: any): void {
    const startTime = performance.now()

    super.capture(error, options)

    // 记录错误处理时间
    this.performanceMonitor.recordErrorProcessing(startTime, {
      errorType: error.type,
      message: error.message
    })
  }

  /**
   * 重写report方法以记录上报时间
   */
  report(data: any): void {
    const startTime = performance.now()

    // 直接调用父类的report()方法
    // 不要重复调用sendToServer，因为父类的report()会处理批量队列
    super.report(data)

    // 记录上报时间（注意：由于sendBeacon的特性，成功仅表示调用成功，不代表服务器接收成功）
    this.performanceMonitor.recordUpload(startTime, true, {
      eventType: data.type,
      eventId: data.eventId
    })
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics()
  }

  /**
   * 获取性能摘要
   */
  getPerformanceSummary(): string {
    return this.performanceMonitor.getSummary()
  }

  /**
   * 检查性能健康状况
   */
  checkPerformanceHealth(): { healthy: boolean; issues: string[] } {
    return this.performanceMonitor.isHealthy()
  }

  /**
   * 销毁实例（包含内存泄漏防护）
   */
  destroy(): void {
    this.logger.debug('Destroying instance...')

    // 停止白屏检测
    if (this.blankScreenDetector) {
      this.logger.debug('Stopping blank screen detector...')
      this.blankScreenDetector.stop()
      this.blankScreenDetector = null
    }

    // 清空性能监控数据
    this.performanceMonitor.clear()

    // 内存泄漏防护：清除所有追踪的定时器
    this.timers.forEach(id => {
      window.clearTimeout(id)
    })
    this.timers.clear()
    this.logger.debug('Cleared all tracked timers')

    // 内存泄漏防护：移除所有追踪的事件监听器
    this.eventListeners.forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options)
    })
    this.eventListeners = []
    this.logger.debug('Removed all tracked event listeners')

    // 恢复原生方法
    if (this.originalFetch && window.fetch !== this.originalFetch) {
      window.fetch = this.originalFetch
    }

    if (this.originalXHR && window.XMLHttpRequest !== this.originalXHR) {
      window.XMLHttpRequest = this.originalXHR
    }

    super.destroy()

    this.logger.info('Instance destroyed')
  }
}

/**
 * 创建Web端实例工厂函数
 */
export function createErrorMonitorWeb(config: WebConfig): ErrorMonitorWeb {
  return new ErrorMonitorWeb(config)
}

// 默认导出
export default ErrorMonitorWeb
