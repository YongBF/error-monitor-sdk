/**
 * 离线缓存模块
 * 当用户离线时缓存错误报告，网络恢复后重新上报
 */

export interface CachedReport {
  report: any
  timestamp: number
  retryCount: number
}

export interface OfflineCacheConfig {
  /** 最大缓存数量 */
  maxCacheSize: number
  /** 是否启用离线缓存 */
  enabled: boolean
  /** 存储键名 */
  storageKey: string
}

export class OfflineCache {
  private config: OfflineCacheConfig
  private cacheQueue: CachedReport[] = []
  private isOnline: boolean
  private sender: (report: any) => void | Promise<void>

  constructor(
    config: OfflineCacheConfig,
    sender: (report: any) => void | Promise<void>
  ) {
    this.config = {
      maxCacheSize: config.maxCacheSize || 100,
      enabled: config.enabled !== false,
      storageKey: config.storageKey || 'error_monitor_cache'
    }
    this.sender = sender
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    // 从localStorage恢复缓存
    this.loadFromStorage()

    // 监听网络状态
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
    }
  }

  /**
   * 缓存错误报告
   */
  cache(report: any): void {
    if (!this.config.enabled) {
      return
    }

    const cachedReport: CachedReport = {
      report,
      timestamp: Date.now(),
      retryCount: 0
    }

    // 添加到缓存
    this.cacheQueue.push(cachedReport)

    // 限制缓存大小
    if (this.cacheQueue.length > this.config.maxCacheSize) {
      // 移除最旧的报告
      this.cacheQueue.shift()
    }

    // 持久化到localStorage
    this.saveToStorage()
  }

  /**
   * 立即发送报告（如果在线）
   */
  send(report: any): void {
    if (this.isOnline) {
      // 在线，直接发送
      this.sender(report)
    } else {
      // 离线，缓存起来
      this.cache(report)
    }
  }

  /**
   * 处理网络恢复
   */
  private handleOnline(): void {
    this.isOnline = true
    console.log('[OfflineCache] Network restored, flushing cache...')

    // 重试所有缓存的报告
    this.flush()
  }

  /**
   * 处理网络断开
   */
  private handleOffline(): void {
    this.isOnline = false
    console.log('[OfflineCache] Network disconnected, enabling offline cache')
  }

  /**
   * 刷新缓存：重试所有缓存的报告
   */
  async flush(): Promise<void> {
    if (this.cacheQueue.length === 0) {
      return
    }

    // 复制一份缓存，避免在处理过程中修改原数组
    const reportsToRetry = [...this.cacheQueue]
    const failedReports: CachedReport[] = []

    for (const cachedReport of reportsToRetry) {
      try {
        await this.sender(cachedReport.report)
        // 成功发送，从缓存中移除
        const index = this.cacheQueue.indexOf(cachedReport)
        if (index > -1) {
          this.cacheQueue.splice(index, 1)
        }
      } catch (error) {
        // 发送失败，增加重试计数
        cachedReport.retryCount++

        // 如果重试次数超过3次，放弃该报告
        if (cachedReport.retryCount > 3) {
          console.error('[OfflineCache] Max retry count exceeded, dropping report:', cachedReport.report)
          const index = this.cacheQueue.indexOf(cachedReport)
          if (index > -1) {
            this.cacheQueue.splice(index, 1)
          }
        } else {
          failedReports.push(cachedReport)
        }
      }
    }

    // 更新持久化存储
    this.saveToStorage()

    if (failedReports.length > 0) {
      console.warn(`[OfflineCache] ${failedReports.length} reports failed to send, will retry later`)
    }
  }

  /**
   * 保存到localStorage
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.cacheQueue))
    } catch (error) {
      console.error('[OfflineCache] Failed to save to localStorage:', error)
    }
  }

  /**
   * 从localStorage加载
   */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      const cached = localStorage.getItem(this.config.storageKey)
      if (cached) {
        this.cacheQueue = JSON.parse(cached)
        console.log(`[OfflineCache] Loaded ${this.cacheQueue.length} cached reports from storage`)
      }
    } catch (error) {
      console.error('[OfflineCache] Failed to load from localStorage:', error)
      this.cacheQueue = []
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cacheQueue = []
    this.saveToStorage()
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cacheQueue.length
  }

  /**
   * 检查是否在线
   */
  online(): boolean {
    return this.isOnline
  }

  /**
   * 销毁缓存
   */
  destroy(): void {
    // 保存最后的状态
    this.saveToStorage()

    // 移除事件监听器
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', () => this.handleOnline())
      window.removeEventListener('offline', () => this.handleOffline())
    }
  }
}
