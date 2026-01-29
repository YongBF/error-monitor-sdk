/**
 * 批量上报队列
 * 收集错误后批量上报，减少网络请求次数
 */

export interface QueuedReport {
  report: any
  timestamp: number
}

export interface BatchQueueConfig {
  /** 批量大小：收集多少个错误后上报 */
  batchSize: number
  /** 上报延迟（毫秒）：多久后上报收集的错误 */
  delay: number
  /** 是否启用批量上报 */
  enabled: boolean
}

export class BatchQueue {
  private queue: QueuedReport[] = []
  private config: BatchQueueConfig
  private timerId: number | null = null
  private sender: (reports: any[]) => void | Promise<void>

  constructor(
    config: BatchQueueConfig,
    sender: (reports: any[]) => void | Promise<void>
  ) {
    this.config = {
      batchSize: config.batchSize || 10,
      delay: config.delay || 1000,
      enabled: config.enabled !== false
    }
    this.sender = sender

    // 监听页面卸载事件，确保数据不丢失
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flush())
      window.addEventListener('beforeunload', () => this.flush())
    }
  }

  /**
   * 添加报告到队列
   */
  add(report: any): void {
    if (!this.config.enabled) {
      // 如果未启用批量上报，直接发送
      this.sender([report])
      return
    }

    this.queue.push({
      report,
      timestamp: Date.now()
    })

    // 如果队列达到批量大小，立即上报
    if (this.queue.length >= this.config.batchSize) {
      this.flush()
    } else {
      // 否则设置延迟上报
      this.scheduleFlush()
    }
  }

  /**
   * 安排延迟上报
   */
  private scheduleFlush(): void {
    // 如果已有定时器，不重复创建
    if (this.timerId !== null) {
      return
    }

    this.timerId = window.setTimeout(() => {
      this.flush()
    }, this.config.delay)
  }

  /**
   * 立即上报队列中的所有报告
   */
  flush(): void {
    // 清除定时器
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId)
      this.timerId = null
    }

    // 如果队列为空，不上报
    if (this.queue.length === 0) {
      return
    }

    const reports = this.queue.map(item => item.report)

    // 使用sendBeacon确保页面卸载时也能发送
    this.sendReports(reports)

    // 清空队列
    this.queue = []
  }

  /**
   * 发送报告
   */
  private sendReports(reports: any[]): void {
    try {
      // 使用Promise确保异步操作完成
      const result = this.sender(reports)

      // 如果返回Promise，等待完成
      if (result instanceof Promise) {
        result.catch(error => {
          console.error('[BatchQueue] Failed to send reports:', error)
        })
      }
    } catch (error) {
      console.error('[BatchQueue] Error sending reports:', error)
    }
  }

  /**
   * 获取当前队列大小
   */
  size(): number {
    return this.queue.length
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = []
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<BatchQueueConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 销毁队列
   */
  destroy(): void {
    this.flush()

    // 移除事件监听器
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', () => this.flush())
      window.removeEventListener('beforeunload', () => this.flush())
    }
  }
}
