/**
 * Behavior Plugin
 * 用户行为追踪插件
 */

import type { Plugin, Core } from 'error-monitor-core'

/**
 * 行为配置
 */
export interface BehaviorConfig {
  // 是否追踪点击
  trackClicks?: boolean
  // 是否追踪输入
  trackInput?: boolean
  // 是否追踪路由变化
  trackNavigation?: boolean
  // 是否追踪HTTP请求
  trackHttp?: boolean
  // 最大追踪数量
  maxTraces?: number
}

/**
 * 用户行为插件
 */
export class BehaviorPlugin implements Plugin {
  name = 'behavior'
  version = '1.0.0'
  private config: BehaviorConfig
  private core: Core | null = null
  private originalPush: typeof History.prototype.pushState | null = null
  private originalReplace: typeof History.prototype.replaceState | null = null

  constructor(config: BehaviorConfig = {}) {
    this.config = {
      trackClicks: true,
      trackInput: true,
      trackNavigation: true,
      trackHttp: true,
      maxTraces: 100,
      ...config
    }
  }

  /**
   * 插件设置
   */
  setup(core: Core): void {
    if (typeof window === 'undefined') {
      return
    }

    this.core = core

    // 追踪点击
    if (this.config.trackClicks) {
      this.setupClickTracking()
    }

    // 追踪输入
    if (this.config.trackInput) {
      this.setupInputTracking()
    }

    // 追踪路由
    if (this.config.trackNavigation) {
      this.setupNavigationTracking()
    }

    // 追踪HTTP
    if (this.config.trackHttp) {
      this.setupHttpTracking()
    }

    // 记录初始页面访问
    this.trackPageView()
  }

  /**
   * 追踪点击事件
   */
  private setupClickTracking(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement

      this.core?.addBreadcrumb({
        timestamp: Date.now(),
        type: 'ui',
        message: 'click',
        data: {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          text: target.textContent?.slice(0, 50)
        }
      })
    }, true)
  }

  /**
   * 追踪输入事件
   */
  private setupInputTracking(): void {
    const inputs = ['input', 'textarea', 'select']

    inputs.forEach(selector => {
      document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement

        if (target.matches(selector)) {
          // 脱敏处理
          let value = target.value
          if (target.type === 'password') {
            value = '******'
          } else if (value.length > 50) {
            value = value.slice(0, 50) + '...'
          }

          this.core?.addBreadcrumb({
            timestamp: Date.now(),
            type: 'ui',
            message: 'input',
            data: {
              tagName: target.tagName,
              type: target.type,
              name: target.name,
              id: target.id,
              value
            }
          })
        }
      }, true)
    })
  }

  /**
   * 追踪路由变化
   */
  private setupNavigationTracking(): void {
    // 拦截History API
    this.originalPush = history.pushState
    this.originalReplace = history.replaceState
    const self = this

    history.pushState = function (...args) {
      self.originalPush?.apply(this, args)
      self.trackPageView()
    }

    history.replaceState = function (...args) {
      self.originalReplace?.apply(this, args)
      self.trackPageView()
    }

    // 监听popstate事件（浏览器前进后退）
    window.addEventListener('popstate', () => {
      this.trackPageView()
    })

    // 监听hash变化
    window.addEventListener('hashchange', () => {
      this.trackPageView()
    })
  }

  /**
   * 追踪HTTP请求
   */
  private setupHttpTracking(): void {
    // 拦截fetch
    const originalFetch = window.fetch
    const self = this

    window.fetch = function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : String(args[0])
      const method = args[1]?.method || 'GET'

      const startTime = Date.now()

      return originalFetch
        .apply(this, args)
        .then(response => {
          self.core?.addBreadcrumb({
            timestamp: Date.now(),
            type: 'http',
            message: `${method} ${url}`,
            data: {
              url,
              method,
              status: response.status,
              duration: Date.now() - startTime
            }
          })

          return response
        })
        .catch(error => {
          self.core?.addBreadcrumb({
            timestamp: Date.now(),
            type: 'http',
            message: `${method} ${url} - Error`,
            data: {
              url,
              method,
              error: error.message,
              duration: Date.now() - startTime
            }
          })

          throw error
        })
    }
  }

  /**
   * 记录页面访问
   */
  private trackPageView(): void {
    if (!this.core) return

    this.core.addBreadcrumb({
      timestamp: Date.now(),
      type: 'navigation',
      message: 'pageview',
      data: {
        url: location.href,
        path: location.pathname,
        search: location.search,
        hash: location.hash
      }
    })
  }

  /**
   * 手动追踪自定义事件
   */
  track(event: string, data?: Record<string, any>): void {
    this.core?.addBreadcrumb({
      timestamp: Date.now(),
      type: 'custom',
      message: event,
      data
    })
  }

  /**
   * 插件销毁
   */
  teardown(): void {
    // 恢复原生方法
    if (this.originalPush && history.pushState !== this.originalPush) {
      history.pushState = this.originalPush
    }

    if (this.originalReplace && history.replaceState !== this.originalReplace) {
      history.replaceState = this.originalReplace
    }
  }
}

/**
 * 创建行为插件实例
 */
export function createBehaviorPlugin(config?: BehaviorConfig): BehaviorPlugin {
  return new BehaviorPlugin(config)
}

export default BehaviorPlugin
