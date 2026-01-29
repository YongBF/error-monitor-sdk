/**
 * Performance Plugin
 * 性能监控插件
 */

import type { Plugin, Core } from 'error-monitor-core'

/**
 * Web Vitals 指标
 */
export interface WebVitals {
  // First Contentful Paint
  fcp?: number
  // Largest Contentful Paint
  lcp?: number
  // Cumulative Layout Shift
  cls?: number
  // First Input Delay
  fid?: number
  // Time to First Byte
  ttfb?: number
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  // 是否自动采集Web Vitals
  collectWebVitals?: boolean
  // 是否采集资源加载时间
  collectResources?: boolean
  // 采集阈值（ms）
  threshold?: number
}

/**
 * 性能监控插件
 */
export class PerformancePlugin implements Plugin {
  name = 'performance'
  version = '1.0.0'
  private config: PerformanceConfig
  private core: Core | null = null
  private observer: PerformanceObserver | null = null

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      collectWebVitals: true,
      collectResources: true,
      threshold: 100,
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

    // 采集Web Vitals
    if (this.config.collectWebVitals) {
      this.collectWebVitals()
    }

    // 采集资源加载时间
    if (this.config.collectResources) {
      this.collectResourceTiming()
    }

    // 添加页面加载性能面包屑
    this.addPageLoadBreadcrumb()
  }

  /**
   * 采集Web Vitals
   */
  private collectWebVitals(): void {
    if (!('PerformanceObserver' in window)) {
      return
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry as any)
        }
      })

      // 观察各类性能指标
      this.observer.observe({
        entryTypes: [
          'largest-contentful-paint',
          'first-input',
          'layout-shift',
          'navigation'
        ]
      })
    } catch (e) {
      console.warn('[PerformancePlugin] PerformanceObserver not supported')
    }
  }

  /**
   * 处理性能条目
   */
  private handlePerformanceEntry(entry: any): void {
    if (!this.core) return

    const threshold = this.config.threshold || 100

    switch (entry.entryType) {
      case 'largest-contentful-paint':
        if (entry.startTime > threshold) {
          this.core.capture({
            type: 'custom',
            message: `LCP exceeded threshold: ${Math.round(entry.startTime)}ms`,
            context: {
              metric: 'lcp',
              value: entry.startTime,
              threshold
            }
          })
        }
        break

      case 'first-input':
        if (entry.processingStart - entry.startTime > threshold) {
          this.core.capture({
            type: 'custom',
            message: `FID exceeded threshold: ${Math.round(entry.processingStart - entry.startTime)}ms`,
            context: {
              metric: 'fid',
              value: entry.processingStart - entry.startTime,
              threshold
            }
          })
        }
        break

      case 'layout-shift':
        if (!entry.hadRecentInput) {
          const clsValue = entry.value
          if (clsValue > 0.1) {
            this.core.capture({
              type: 'custom',
              message: `CLS detected: ${clsValue.toFixed(3)}`,
              context: {
                metric: 'cls',
                value: clsValue
              }
            })
          }
        }
        break

      case 'navigation':
        this.handleNavigationTiming(entry)
        break
    }
  }

  /**
   * 处理导航时间
   */
  private handleNavigationTiming(entry: any): void {
    if (!this.core) return

    const metrics = {
      // DNS查询时间
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      // TCP连接时间
      tcp: entry.connectEnd - entry.connectStart,
      // 请求响应时间
      ttfb: entry.responseStart - entry.requestStart,
      // DOM解析时间
      domParse: entry.domContentLoadedEventEnd - entry.domInteractive,
      // 首次内容绘制
      fcp: entry.loadEventEnd - entry.domContentLoadedEventEnd
    }

    // 添加性能面包屑
    this.core.addBreadcrumb({
      timestamp: Date.now(),
      type: 'performance',
      message: 'Navigation timing',
      data: metrics
    })
  }

  /**
   * 采集资源加载时间
   */
  private collectResourceTiming(): void {
    if (!this.core) return

    // 页面加载完成后采集
    if (document.readyState === 'complete') {
      this.reportResourceTiming()
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.reportResourceTiming(), 0)
      })
    }
  }

  /**
   * 上报资源加载时间
   */
  private reportResourceTiming(): void {
    if (!this.core) return

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

    const slowResources = resources.filter(resource => {
      const loadTime = resource.responseEnd - resource.startTime
      return loadTime > (this.config.threshold || 100)
    })

    if (slowResources.length > 0) {
      this.core.capture({
        type: 'custom',
        message: `Slow resources detected: ${slowResources.length}`,
        context: {
          metric: 'resources',
          resources: slowResources.map(r => ({
            name: r.name,
            duration: Math.round(r.responseEnd - r.startTime),
            size: r.transferSize
          }))
        }
      })
    }
  }

  /**
   * 添加页面加载性能面包屑
   */
  private addPageLoadBreadcrumb(): void {
    if (!this.core) return

    window.addEventListener('load', () => {
      const timing = performance.timing
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart

      this.core!.addBreadcrumb({
        timestamp: Date.now(),
        type: 'navigation',
        message: 'Page loaded',
        data: {
          loadTime: pageLoadTime,
          domReady: timing.domContentLoadedEventEnd - timing.navigationStart
        }
      })
    })
  }

  /**
   * 获取Web Vitals
   */
  getWebVitals(): WebVitals {
    const vitals: WebVitals = {}

    // 从PerformanceObserver获取数据
    const entries = performance.getEntriesByType('navigation') as any[]

    if (entries.length > 0) {
      const entry = entries[0]
      vitals.ttfb = entry.responseStart - entry.requestStart
      vitals.fcp = entry.loadEventEnd - entry.domContentLoadedEventEnd
    }

    return vitals
  }

  /**
   * 插件销毁
   */
  teardown(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}

/**
 * 创建性能插件实例
 */
export function createPerformancePlugin(config?: PerformanceConfig): PerformancePlugin {
  return new PerformancePlugin(config)
}

export default PerformancePlugin
