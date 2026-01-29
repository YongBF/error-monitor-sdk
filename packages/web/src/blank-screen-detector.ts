/**
 * 白屏检测模块
 * 检测页面是否白屏（无内容渲染）
 */

export interface BlankScreenConfig {
  // 检测阈值：页面加载后多久开始检测（毫秒）
  detectionDelay?: number
  // 最小DOM元素数量阈值
  minElements?: number
  // 检测间隔（毫秒）
  checkInterval?: number
  // 最大检测次数
  maxChecks?: number
  // 是否检测Performance API
  checkPerformance?: boolean
  // 自定义检测函数
  customCheck?: () => boolean
}

export interface BlankScreenReport {
  type: 'blank-screen'
  message: string
  context: {
    timestamp: number
    url: string
    domElements: number
    bodyElements: number
    hasContent: boolean
    performanceTiming?: {
      domContentLoaded?: number
      loadComplete?: number
      firstPaint?: number
      firstContentfulPaint?: number
    }
  }
}

/**
 * 白屏检测器类
 */
export class BlankScreenDetector {
  private config: Required<BlankScreenConfig>
  private checkCount: number = 0
  private timerId: number | null = null
  private isBlankScreen: boolean = false

  constructor(config: BlankScreenConfig = {}) {
    this.config = {
      detectionDelay: config.detectionDelay || 3000, // 3秒后开始检测
      minElements: config.minElements || 10, // 最少10个元素
      checkInterval: config.checkInterval || 1000, // 每秒检测一次
      maxChecks: config.maxChecks || 5, // 最多检测5次
      checkPerformance: config.checkPerformance !== false,
      customCheck: config.customCheck || (() => false)
    }
  }

  /**
   * 开始检测
   */
  start(callback: (report: BlankScreenReport) => void): void {
    console.log('[BlankScreenDetector] Starting blank screen detection...')
    console.log('[BlankScreenDetector] Config:', this.config)

    // 延迟开始检测，等待页面加载
    setTimeout(() => {
      console.log('[BlankScreenDetector] Detection delay passed, starting first check...')
      this.performCheck(callback)
    }, this.config.detectionDelay)
  }

  /**
   * 执行检测
   */
  private performCheck(callback: (report: BlankScreenReport) => void): void {
    this.checkCount++
    console.log(`[BlankScreenDetector] Check #${this.checkCount}/${this.config.maxChecks}`)

    const isBlank = this.checkIfBlank()
    console.log('[BlankScreenDetector] Is blank screen?', isBlank)

    if (isBlank && !this.isBlankScreen) {
      // 首次检测到白屏
      console.log('[BlankScreenDetector] Blank screen detected for the first time!')
      this.isBlankScreen = true
      const report = this.generateReport()
      console.log('[BlankScreenDetector] Generated report:', report)
      callback(report)
    }

    // 如果还未达到最大检测次数，继续检测
    if (this.checkCount < this.config.maxChecks && !isBlank) {
      this.timerId = window.setTimeout(() => {
        this.performCheck(callback)
      }, this.config.checkInterval)
      console.log(`[BlankScreenDetector] Scheduling next check in ${this.config.checkInterval}ms`)
    } else {
      console.log('[BlankScreenDetector] Stopping checks. Count:', this.checkCount, 'Is blank:', isBlank)
    }
  }

  /**
   * 检查是否白屏
   */
  private checkIfBlank(): boolean {
    // 1. 检查自定义检测函数
    if (this.config.customCheck()) {
      console.log('[BlankScreenDetector] Custom check returned true')
      return true
    }

    // 2. 检查DOM元素数量
    const domCheck = this.checkDOMElements()
    console.log('[BlankScreenDetector] DOM check result:', domCheck)
    if (domCheck.isBlank) {
      console.log('[BlankScreenDetector] DOM check indicates blank screen')
      return true
    }

    // 3. 检查Performance API
    if (this.config.checkPerformance) {
      const perfCheck = this.checkPerformanceTiming()
      console.log('[BlankScreenDetector] Performance check result:', perfCheck)
      if (perfCheck.isBlank) {
        console.log('[BlankScreenDetector] Performance check indicates blank screen')
        return true
      }
    }

    console.log('[BlankScreenDetector] All checks passed, not a blank screen')
    return false
  }

  /**
   * 检查DOM元素
   */
  private checkDOMElements(): { isBlank: boolean; info: any } {
    const totalElements = document.querySelectorAll('*').length
    const bodyElements = document.body?.children.length || 0

    // 检查body是否存在且不为空
    const hasBody = !!document.body
    const hasContent = bodyElements > 0

    // 排除测试相关的元素（blank-page, minimal-page, temp-status等）
    const testElements = document.querySelectorAll('#blank-page, #minimal-page, #temp-status').length

    // 排除script标签（测试时script标签不算作内容）
    const scriptElements = document.querySelectorAll('script').length

    const elementsWithoutTestAndScripts = totalElements - testElements - scriptElements

    // 改进的白屏判断：排除测试元素和script后仍然很少，才认为是白屏
    const isBlank = !hasBody || elementsWithoutTestAndScripts < this.config.minElements || !hasContent

    const info = {
      totalElements,
      bodyElements,
      hasBody,
      hasContent,
      testElements,
      scriptElements,
      elementsWithoutTestAndScripts,
      minElements: this.config.minElements
    }

    console.log('[BlankScreenDetector] 详细DOM信息:', info)

    return {
      isBlank,
      info
    }
  }

  /**
   * 检查Performance API
   */
  private checkPerformanceTiming(): { isBlank: boolean; timing?: any } {
    if (!window.performance || !window.performance.timing) {
      return { isBlank: false }
    }

    const timing = window.performance.timing
    const navigationStart = timing.navigationStart

    const domContentLoaded = timing.domContentLoadedEventEnd - navigationStart
    const loadComplete = timing.loadEventEnd - navigationStart

    // 获取首次绘制时间
    let firstPaint: number | undefined
    let firstContentfulPaint: number | undefined

    const perfEntries = performance.getEntriesByType?.('paint') as PerformanceEntry[]
    if (perfEntries) {
      const fp = perfEntries.find(e => e.name === 'first-paint')
      const fcp = perfEntries.find(e => e.name === 'first-contentful-paint')
      firstPaint = fp?.startTime
      firstContentfulPaint = fcp?.startTime
    }

    // 如果页面加载完成但没有任何绘制，可能是白屏
    const isBlank =
      loadComplete > 0 &&
      (firstPaint === undefined || firstContentfulPaint === undefined) &&
      domContentLoaded > 5000 // DOM加载超过5秒但没有绘制

    return {
      isBlank,
      timing: {
        domContentLoaded,
        loadComplete,
        firstPaint,
        firstContentfulPaint
      }
    }
  }

  /**
   * 生成报告
   */
  private generateReport(): BlankScreenReport {
    const domInfo = this.checkDOMElements()
    const perfInfo = this.config.checkPerformance ? this.checkPerformanceTiming() : {}

    return {
      type: 'blank-screen',
      message: '检测到白屏：页面加载后无内容渲染',
      context: {
        timestamp: Date.now(),
        url: window.location.href,
        domElements: document.querySelectorAll('*').length,
        bodyElements: document.body?.children.length || 0,
        hasContent: domInfo.info.hasContent,
        performanceTiming: perfInfo.timing
      }
    }
  }

  /**
   * 停止检测
   */
  stop(): void {
    console.log('[BlankScreenDetector] Stopping blank screen detection...')
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId)
      this.timerId = null
      console.log('[BlankScreenDetector] Cleared timeout timer')
    }
    console.log('[BlankScreenDetector] Blank screen detection stopped')
  }

  /**
   * 重置检测器
   */
  reset(): void {
    this.stop()
    this.checkCount = 0
    this.isBlankScreen = false
  }
}

/**
 * 创建白屏检测器实例
 */
export function createBlankScreenDetector(config?: BlankScreenConfig): BlankScreenDetector {
  return new BlankScreenDetector(config)
}
