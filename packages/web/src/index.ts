/**
 * Error Monitor Web
 * Web端错误监控模块
 */

import { ErrorMonitor, Config } from 'error-monitor-core'
import {
  BlankScreenDetector,
  BlankScreenConfig,
  createBlankScreenDetector
} from './blank-screen-detector'

// 导出核心
export { ErrorMonitor } from 'error-monitor-core'
export type { Config, Plugin, Breadcrumb } from 'error-monitor-core'

// 导出白屏检测
export { BlankScreenDetector, createBlankScreenDetector }
export type { BlankScreenConfig, BlankScreenReport } from './blank-screen-detector'

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

  constructor(config: WebConfig) {
    super(config)
    this.config = config
  }

  /**
   * 初始化Web端监控
   */
  init(): void {
    super.init()

    if (typeof window === 'undefined') {
      console.warn('[ErrorMonitorWeb] Not in browser environment')
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

    console.log('[ErrorMonitorWeb] Web handlers initialized')
  }

  /**
   * JavaScript错误处理
   */
  private setupJsErrorHandler(): void {
    window.addEventListener('error', (event) => {
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
    window.addEventListener('unhandledrejection', (event) => {
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
    window.addEventListener('error', (event) => {
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
    console.log('[ErrorMonitorWeb] Setting up blank screen detection...')
    const config =
      typeof this.config.blankScreenDetection === 'boolean'
        ? {}
        : this.config.blankScreenDetection

    console.log('[ErrorMonitorWeb] Blank screen config:', config)
    this.blankScreenDetector = createBlankScreenDetector(config)

    this.blankScreenDetector.start((report) => {
      console.log('[ErrorMonitorWeb] Blank screen detected!', report)
      this.capture({
        type: report.type,
        message: report.message,
        context: report.context
      })
    })

    console.log('[ErrorMonitorWeb] Blank screen detection started')
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
   * 销毁实例
   */
  destroy(): void {
    console.log('[ErrorMonitorWeb] Destroying instance...')

    // 停止白屏检测
    if (this.blankScreenDetector) {
      console.log('[ErrorMonitorWeb] Stopping blank screen detector...')
      this.blankScreenDetector.stop()
      this.blankScreenDetector = null
    }

    // 恢复原生方法
    if (this.originalFetch && window.fetch !== this.originalFetch) {
      window.fetch = this.originalFetch
    }

    if (this.originalXHR && window.XMLHttpRequest !== this.originalXHR) {
      window.XMLHttpRequest = this.originalXHR
    }

    super.destroy()

    console.log('[ErrorMonitorWeb] Instance destroyed')
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
