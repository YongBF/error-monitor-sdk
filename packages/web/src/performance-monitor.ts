/**
 * 性能监控模块
 * 监控SDK初始化时间、错误处理时间、上报时间等关键性能指标
 */

export interface PerformanceMetrics {
  // SDK初始化指标
  initTime?: {
    startTime: number
    endTime: number
    duration: number
  }
  // 错误处理指标
  errorProcessing?: {
    totalErrors: number
    averageProcessingTime: number
    maxProcessingTime: number
    minProcessingTime: number
  }
  // 上报指标
  upload?: {
    totalUploads: number
    averageUploadTime: number
    maxUploadTime: number
    minUploadTime: number
    failedUploads: number
  }
  // 内存使用（如果可用）
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

export interface PerformanceEntry {
  type: 'init' | 'process' | 'upload'
  startTime: number
  endTime: number
  duration: number
  metadata?: Record<string, any>
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private entries: PerformanceEntry[] = []
  private errorProcessingTimes: number[] = []
  private uploadTimes: number[] = []
  private failedUploads: number = 0
  private initStartTime: number | null = null
  private initEndTime: number | null = null

  /**
   * 开始记录SDK初始化时间
   */
  startInit(): void {
    this.initStartTime = performance.now()
  }

  /**
   * 结束记录SDK初始化时间
   */
  endInit(): void {
    if (this.initStartTime === null) {
      console.warn('[PerformanceMonitor] startInit() was not called')
      return
    }

    this.initEndTime = performance.now()
    const duration = this.initEndTime - this.initStartTime

    this.metrics.initTime = {
      startTime: this.initStartTime,
      endTime: this.initEndTime,
      duration
    }

    this.entries.push({
      type: 'init',
      startTime: this.initStartTime,
      endTime: this.initEndTime,
      duration,
      metadata: {}
    })

    console.log(`[PerformanceMonitor] SDK initialized in ${duration.toFixed(2)}ms`)
  }

  /**
   * 记录错误处理时间
   */
  recordErrorProcessing(startTime: number, metadata?: Record<string, any>): void {
    const endTime = performance.now()
    const duration = endTime - startTime

    this.errorProcessingTimes.push(duration)

    this.entries.push({
      type: 'process',
      startTime,
      endTime,
      duration,
      metadata
    })

    // 更新错误处理指标
    this.updateErrorProcessingMetrics()

    if (duration > 100) {
      console.warn(`[PerformanceMonitor] Slow error processing: ${duration.toFixed(2)}ms`, metadata)
    }
  }

  /**
   * 记录上报时间
   */
  recordUpload(startTime: number, success: boolean, metadata?: Record<string, any>): void {
    const endTime = performance.now()
    const duration = endTime - startTime

    if (success) {
      this.uploadTimes.push(duration)
    } else {
      this.failedUploads++
    }

    this.entries.push({
      type: 'upload',
      startTime,
      endTime,
      duration,
      metadata: { ...metadata, success }
    })

    // 更新上报指标
    this.updateUploadMetrics()

    if (success && duration > 1000) {
      console.warn(`[PerformanceMonitor] Slow upload: ${duration.toFixed(2)}ms`, metadata)
    }
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    // 添加内存使用信息（如果可用）
    // @ts-ignore - memory is a Chrome-specific API
    if (performance.memory) {
      // @ts-ignore
      this.metrics.memory = {
        // @ts-ignore
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        // @ts-ignore
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        // @ts-ignore
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      }
    }

    return this.metrics
  }

  /**
   * 获取所有性能记录
   */
  getEntries(): PerformanceEntry[] {
    return [...this.entries]
  }

  /**
   * 获取最近的N条记录
   */
  getRecentEntries(count: number): PerformanceEntry[] {
    return this.entries.slice(-count)
  }

  /**
   * 清空性能记录
   */
  clear(): void {
    this.metrics = {}
    this.entries = []
    this.errorProcessingTimes = []
    this.uploadTimes = []
    this.failedUploads = 0
    this.initStartTime = null
    this.initEndTime = null
  }

  /**
   * 生成性能报告摘要
   */
  getSummary(): string {
    const summary: string[] = []

    if (this.metrics.initTime) {
      summary.push(`Init: ${this.metrics.initTime.duration.toFixed(2)}ms`)
    }

    if (this.metrics.errorProcessing) {
      const { totalErrors, averageProcessingTime, maxProcessingTime } = this.metrics.errorProcessing
      summary.push(
        `Errors: ${totalErrors} total, ` +
        `${averageProcessingTime.toFixed(2)}ms avg, ` +
        `${maxProcessingTime.toFixed(2)}ms max`
      )
    }

    if (this.metrics.upload) {
      const { totalUploads, averageUploadTime, failedUploads } = this.metrics.upload
      summary.push(
        `Uploads: ${totalUploads} total, ` +
        `${averageUploadTime.toFixed(2)}ms avg, ` +
        `${failedUploads} failed`
      )
    }

    return summary.join(' | ') || 'No performance data'
  }

  /**
   * 更新错误处理指标
   */
  private updateErrorProcessingMetrics(): void {
    if (this.errorProcessingTimes.length === 0) return

    const sum = this.errorProcessingTimes.reduce((a, b) => a + b, 0)
    const avg = sum / this.errorProcessingTimes.length
    const max = Math.max(...this.errorProcessingTimes)
    const min = Math.min(...this.errorProcessingTimes)

    this.metrics.errorProcessing = {
      totalErrors: this.errorProcessingTimes.length,
      averageProcessingTime: avg,
      maxProcessingTime: max,
      minProcessingTime: min
    }
  }

  /**
   * 更新上报指标
   */
  private updateUploadMetrics(): void {
    if (this.uploadTimes.length === 0) return

    const sum = this.uploadTimes.reduce((a, b) => a + b, 0)
    const avg = sum / this.uploadTimes.length
    const max = Math.max(...this.uploadTimes)
    const min = Math.min(...this.uploadTimes)

    this.metrics.upload = {
      totalUploads: this.uploadTimes.length,
      averageUploadTime: avg,
      maxUploadTime: max,
      minUploadTime: min,
      failedUploads: this.failedUploads
    }
  }

  /**
   * 检查性能是否健康
   */
  isHealthy(): { healthy: boolean; issues: string[] } {
    const issues: string[] = []

    // 检查初始化时间（应该在100ms以内）
    if (this.metrics.initTime && this.metrics.initTime.duration > 100) {
      issues.push(`Slow initialization: ${this.metrics.initTime.duration.toFixed(2)}ms`)
    }

    // 检查错误处理时间（平均应该在10ms以内）
    if (this.metrics.errorProcessing && this.metrics.errorProcessing.averageProcessingTime > 10) {
      issues.push(
        `Slow error processing: ${this.metrics.errorProcessing.averageProcessingTime.toFixed(2)}ms average`
      )
    }

    // 检查上报时间（平均应该在500ms以内）
    if (this.metrics.upload && this.metrics.upload.averageUploadTime > 500) {
      issues.push(`Slow uploads: ${this.metrics.upload.averageUploadTime.toFixed(2)}ms average`)
    }

    // 检查上报失败率（应该在5%以内）
    if (this.metrics.upload) {
      const failureRate = this.metrics.upload.failedUploads / this.metrics.upload.totalUploads
      if (failureRate > 0.05) {
        issues.push(`High upload failure rate: ${(failureRate * 100).toFixed(1)}%`)
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    }
  }
}

/**
 * 创建实例工厂函数
 */
export function createPerformanceMonitor(): PerformanceMonitor {
  return new PerformanceMonitor()
}

/**
 * 单例实例
 */
let globalMonitor: PerformanceMonitor | null = null

/**
 * 获取全局性能监控器实例
 */
export function getGlobalPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = createPerformanceMonitor()
  }
  return globalMonitor
}
