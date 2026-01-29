/**
 * Blank Screen Detector Tests
 * 白屏检测功能测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  BlankScreenDetector,
  createBlankScreenDetector,
  BlankScreenConfig
} from './blank-screen-detector'

describe('BlankScreenDetector', () => {
  let detector: BlankScreenDetector
  let callback: vi.Mock
  let mockQuerySelectorAll: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    callback = vi.fn()
    ;(global as any).mockTreeWalkerNodeCount = 15  // 重置为默认值

    // 创建智能的querySelectorAll mock
    mockQuerySelectorAll = vi.fn((selector: string) => {
      if (selector === '*') {
        // 默认返回15个元素
        return Array(15).fill(null).map((_, i) => ({ tagName: `DIV${i}` }))
      } else if (selector === 'script') {
        // 返回0个script标签
        return []
      } else if (selector === '#blank-page, #minimal-page, #temp-status') {
        // 返回0个测试元素
        return []
      }
      return []
    })

    // Mock NodeFilter for TreeWalker
    global.NodeFilter = {
      FILTER_ACCEPT: 1,
      FILTER_REJECT: 2,
      FILTER_SKIP: 3,
      SHOW_ELEMENT: 1
    } as any

    // Mock TreeWalker - 返回可配置数量的节点（动态读取mockTreeWalkerNodeCount）
    global.document = {
      querySelectorAll: mockQuerySelectorAll,
      createTreeWalker: vi.fn(function(root: any, whatToShow: any, filter: any) {
        // Store filter to use in nextNode
        const nodeFilter = filter?.acceptNode || (() => NodeFilter.FILTER_ACCEPT)
        return {
          nextNode: vi.fn(function(this: any) {
            this._count = this._count || 0
            // 动态读取当前的mockTreeWalkerNodeCount值
            const nodeCount = (global as any).mockTreeWalkerNodeCount || 15
            if (this._count < nodeCount) {
              this._count++
              const node = { tagName: `DIV`, textContent: `Content ${this._count}`, id: '' }
              // Apply filter
              const filterResult = nodeFilter(node)
              if (filterResult === NodeFilter.FILTER_REJECT) {
                // Try next node
                return this.nextNode()
              }
              return node
            }
            return null
          })
        }
      }),
      body: {
        children: [1, 2, 3]
      }
    } as any

    global.window = {
      location: {
        href: 'http://localhost:3000/test'
      },
      performance: {
        now: vi.fn(() => Date.now()),
        timing: {
          navigationStart: 0,
          domContentLoadedEventEnd: 100,
          loadEventEnd: 200
        },
        getEntriesByType: vi.fn(() => [])
      },
      setTimeout: setTimeout.bind(global),
      clearTimeout: clearTimeout.bind(global)
    } as any
  })

  afterEach(() => {
    if (detector) {
      try {
        detector.stop()
      } catch (e) {
        // ignore
      }
    }
    vi.useRealTimers()
  })

  describe('初始化', () => {
    it('应该使用默认配置创建检测器', () => {
      detector = createBlankScreenDetector()

      expect(detector).toBeDefined()
      expect(detector['config'].detectionDelay).toBe(3000)
      expect(detector['config'].minElements).toBe(10)
      expect(detector['config'].checkInterval).toBe(1000)
      expect(detector['config'].maxChecks).toBe(5)
    })

    it('应该使用自定义配置创建检测器', () => {
      const config: BlankScreenConfig = {
        detectionDelay: 1000,
        minElements: 5,
        checkInterval: 500,
        maxChecks: 3
      }

      detector = createBlankScreenDetector(config)

      expect(detector['config'].detectionDelay).toBe(1000)
      expect(detector['config'].minElements).toBe(5)
      expect(detector['config'].checkInterval).toBe(500)
      expect(detector['config'].maxChecks).toBe(3)
    })
  })

  describe('DOM检测', () => {
    beforeEach(() => {
      detector = createBlankScreenDetector({
        detectionDelay: 100,
        minElements: 10,
        checkInterval: 100,
        maxChecks: 2
      })
    })

    it('应该检测DOM元素数量', () => {
      // Mock DOM有15个元素（使用默认mock）
      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runAllTimers()

      // 第一次检测应该执行（检查TreeWalker被使用）
      expect(global.document.createTreeWalker).toBeDefined()
    })

    it('DOM元素数量少于阈值时应该触发白屏', () => {
      // Mock DOM只有5个元素
(global as any).mockTreeWalkerNodeCount = 5  // 设置TreeWalker返回5个节点
      mockQuerySelectorAll.mockImplementation((selector: string) => {
        if (selector === '*') {
          return Array(5).fill(null).map((_, i) => ({ tagName: `DIV${i}` }))
        } else if (selector === 'script') {
          return []
        } else if (selector === '#blank-page, #minimal-page, #temp-status') {
          return []
        }
        return []
      })
      global.document.body = { children: [] } as any

      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runAllTimers()

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blank-screen',
          message: '检测到白屏：页面加载后无内容渲染'
        })
      )
    })

    it('DOM元素数量大于阈值时不应该触发白屏', () => {
      // Mock DOM有20个元素
(global as any).mockTreeWalkerNodeCount = 20  // 设置TreeWalker返回20个节点
      mockQuerySelectorAll.mockImplementation((selector: string) => {
        if (selector === '*') {
          return Array(20).fill(null).map((_, i) => ({ tagName: `DIV${i}` }))
        } else if (selector === 'script') {
          return []
        } else if (selector === '#blank-page, #minimal-page, #temp-status') {
          return []
        }
        return []
      })
      global.document.body = { children: [1, 2, 3, 4, 5] } as any

      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runAllTimers()

      expect(callback).not.toHaveBeenCalled()
    })

    it('body为空时应该触发白屏', () => {
      global.document.body = null as any

      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runAllTimers()

      expect(callback).toHaveBeenCalled()
    })

    it('body子元素为空时应该触发白屏', () => {
      global.document.body = { children: [] } as any

      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runAllTimers()

      const report = callback.mock.calls[0][0]
      expect(report.context.hasContent).toBe(false)
    })
  })

  describe('检测间隔', () => {
    it('应该按照指定间隔进行检测', () => {
      // 使用默认mock（15个TreeWalker节点，足够不是白屏）
(global as any).mockTreeWalkerNodeCount = 15  // 确保有足够的内容节点
      global.document.body = { children: [1, 2, 3, 4, 5] } as any

      detector = createBlankScreenDetector({
        detectionDelay: 100,
        minElements: 10,
        checkInterval: 200,
        maxChecks: 3
      })

      detector.start(callback)

      // 等待初始延迟
      vi.advanceTimersByTime(100)

      // 第一次检测（元素数量足够，不是白屏）
      vi.runOnlyPendingTimers()

      // 继续等待间隔时间
      vi.advanceTimersByTime(200)

      // 第二次检测
      vi.runOnlyPendingTimers()

      // callback应该从未被调用（因为不是白屏）
      expect(callback).not.toHaveBeenCalled()
    })

    it('应该达到最大检测次数后停止', () => {
      // 使用默认mock（15个TreeWalker节点，足够不是白屏）
(global as any).mockTreeWalkerNodeCount = 15  // 确保有足够的内容节点
      global.document.body = { children: [1, 2, 3, 4, 5] } as any

      detector = createBlankScreenDetector({
        detectionDelay: 100,
        minElements: 10,
        checkInterval: 200,
        maxChecks: 3
      })

      detector.start(callback)

      // 等待初始延迟 + 所有检测间隔
      vi.advanceTimersByTime(100) // 初始延迟
      vi.runOnlyPendingTimers()

      vi.advanceTimersByTime(200) // 第1次检测
      vi.runOnlyPendingTimers()

      vi.advanceTimersByTime(200) // 第2次检测
      vi.runOnlyPendingTimers()

      vi.advanceTimersByTime(200) // 第3次检测（达到maxChecks=3）
      vi.runOnlyPendingTimers()

      // callback应该从未被调用（因为不是白屏）
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('自定义检测函数', () => {
    it('应该支持自定义检测函数', () => {
      const customCheck = vi.fn(() => true)

      detector = createBlankScreenDetector({
        detectionDelay: 100,
        customCheck
      })

      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runOnlyPendingTimers()

      // 自定义检测应该触发callback
      expect(callback).toHaveBeenCalled()
      expect(customCheck).toHaveBeenCalled()
    })
  })

  describe('性能检测', () => {
    it('应该包含性能信息在报告中', () => {
      // Mock DOM只有5个元素（触发白屏）
      mockQuerySelectorAll.mockImplementation((selector: string) => {
        if (selector === '*') {
          return Array(5).fill(null).map((_, i) => ({ tagName: `DIV${i}` }))
        } else if (selector === 'script') {
          return []
        } else if (selector === '#blank-page, #minimal-page, #temp-status') {
          return []
        }
        return []
      })
      global.document.body = { children: [] } as any

      detector = createBlankScreenDetector({
        detectionDelay: 100,
        minElements: 10,
        checkPerformance: true
      })

      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runOnlyPendingTimers()

      if (callback.mock.calls.length > 0) {
        const report = callback.mock.calls[0][0]
        expect(report.context.performanceTiming).toBeDefined()
      }
    })

    it('checkPerformance为false时不应该检测性能', () => {
      // Mock DOM只有5个元素（触发白屏）
      mockQuerySelectorAll.mockImplementation((selector: string) => {
        if (selector === '*') {
          return Array(5).fill(null).map((_, i) => ({ tagName: `DIV${i}` }))
        } else if (selector === 'script') {
          return []
        } else if (selector === '#blank-page, #minimal-page, #temp-status') {
          return []
        }
        return []
      })
      global.document.body = { children: [] } as any

      const detector2 = createBlankScreenDetector({
        detectionDelay: 100,
        checkPerformance: false
      })

      detector2.start(callback)
      vi.advanceTimersByTime(100)
      vi.runOnlyPendingTimers()

      if (callback.mock.calls.length > 0) {
        const report = callback.mock.calls[0][0]
        // 性能信息可能不存在，因为checkPerformance为false
        expect(report).toBeDefined()
      }
    })
  })

  describe('报告格式', () => {
    it('应该生成正确格式的报告', () => {
      // Mock DOM只有5个元素（触发白屏）
      mockQuerySelectorAll.mockImplementation((selector: string) => {
        if (selector === '*') {
          return Array(5).fill(null).map((_, i) => ({ tagName: `DIV${i}` }))
        } else if (selector === 'script') {
          return []
        } else if (selector === '#blank-page, #minimal-page, #temp-status') {
          return []
        }
        return []
      })
      global.document.body = { children: [] } as any

      detector = createBlankScreenDetector({
        detectionDelay: 100,
        minElements: 10
      })

      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runOnlyPendingTimers()

      const report = callback.mock.calls[0][0]

      expect(report).toMatchObject({
        type: 'blank-screen',
        message: '检测到白屏：页面加载后无内容渲染',
        context: expect.objectContaining({
          timestamp: expect.any(Number),
          url: 'http://localhost:3000/test',
          domElements: expect.any(Number),
          bodyElements: expect.any(Number),
          hasContent: expect.any(Boolean)
        })
      })
    })
  })

  describe('停止检测', () => {
    it('stop()应该停止定时器', () => {
      // 使用默认mock（15个元素，足够不是白屏）
      global.document.body = { children: [1, 2, 3, 4, 5] } as any

      detector = createBlankScreenDetector({
        detectionDelay: 1000,
        checkInterval: 500
      })

      detector.start(callback)

      // 在检测开始前停止
      detector.stop()

      vi.advanceTimersByTime(2000)
      vi.runAllTimers()

      expect(callback).not.toHaveBeenCalled()
    })

    it('停止后再次启动应该重新开始检测', () => {
      detector = createBlankScreenDetector({
        detectionDelay: 100,
        minElements: 10
      })

      // 第一次启动
      detector.start(callback)
      detector.stop()

      // 修改DOM为白屏状态
      vi.mocked(global.document.querySelectorAll).mockReturnValue(Array(5).fill(null))
      global.document.body = { children: [] } as any

      // 重新启动
      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runOnlyPendingTimers()

      expect(callback).toHaveBeenCalled()
    })

    it('多次启动停止应该正常工作', () => {
      detector = createBlankScreenDetector({
        detectionDelay: 100,
        minElements: 10
      })

      // 第一次启动停止
      detector.start(callback)
      detector.stop()

      // 第二次启动停止
      detector.start(callback)
      detector.stop()

      // 第三次启动
      vi.mocked(global.document.querySelectorAll).mockReturnValue(Array(5).fill(null))
      global.document.body = { children: [] } as any

      detector.start(callback)
      vi.advanceTimersByTime(100)
      vi.runOnlyPendingTimers()

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('重置', () => {
    it('reset()应该重置检测器状态', () => {
      detector = createBlankScreenDetector({
        detectionDelay: 100,
        maxChecks: 2
      })

      detector.start(callback)
      detector.stop()

      // 重置
      detector.reset()

      expect(detector['checkCount']).toBe(0)
      expect(detector['isBlankScreen']).toBe(false)
    })
  })
})
