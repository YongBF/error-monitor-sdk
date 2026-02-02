/**
 * Error Monitor Core Tests
 * 核心功能测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ErrorMonitor, Plugin } from './index'

describe('ErrorMonitor Core', () => {
  let monitor: ErrorMonitor
  let mockFetch: any

  beforeEach(() => {
    // 重置fetch mock
    mockFetch = global.fetch as any
    vi.clearAllMocks()

    monitor = new ErrorMonitor({
      appId: 'test-app',
      dsn: 'http://localhost:3000/collect',
      enabled: true,
      debug: false,
      report: {
        batchSize: 1, // 禁用批量队列延迟，立即上报
        delay: 100
      }
    })
  })

  afterEach(() => {
    monitor.destroy()
  })

  describe('初始化', () => {
    it('应该正确初始化ErrorMonitor', () => {
      expect(monitor).toBeDefined()
      expect(monitor['config'].appId).toBe('test-app')
      expect(monitor['sessionId']).toBeDefined()
    })

    it('init()后应该标记为已初始化', () => {
      expect(monitor['isInitialized']).toBe(false)
      monitor.init()
      expect(monitor['isInitialized']).toBe(true)
    })

    it('重复调用init()应该只初始化一次', () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      monitor.init()
      monitor.init()
      expect(consoleSpy).toHaveBeenCalledWith('[ErrorMonitor:WARN]', 'Already initialized')
    })
  })

  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      monitor.updateConfig({ debug: true })
      expect(monitor['config'].debug).toBe(true)
    })

    it('应该能够启用/禁用监控', () => {
      monitor.disable()
      expect(monitor['config'].enabled).toBe(false)

      monitor.enable()
      expect(monitor['config'].enabled).toBe(true)
    })

    it('应该能够设置采样率', () => {
      monitor.setSampleRate(0.5)
      expect(monitor['config'].sampleRate).toBe(0.5)

      // 采样率应该在0-1之间
      monitor.setSampleRate(1.5)
      expect(monitor['config'].sampleRate).toBe(1)

      monitor.setSampleRate(-0.5)
      expect(monitor['config'].sampleRate).toBe(0)
    })

    it('应该能够设置错误采样率', () => {
      monitor.setErrorSampleRate(0.8)
      expect(monitor['config'].errorSampleRate).toBe(0.8)
    })
  })

  describe('错误捕获', () => {
    beforeEach(() => {
      monitor.init()
    })

    it('应该能够捕获错误对象', () => {
      const error = new Error('Test error')
      const spy = vi.spyOn(monitor as any, 'sendToServer')

      monitor.captureError(error)

      expect(spy).toHaveBeenCalled()
      const report = spy.mock.calls[0][0]
      expect(report.type).toBe('custom')
      expect(report.message).toBe('Test error')
    })

    it('应该能够捕获消息', () => {
      const spy = vi.spyOn(monitor as any, 'sendToServer')

      monitor.captureMessage('Test message', 'warning')

      expect(spy).toHaveBeenCalled()
      const report = spy.mock.calls[0][0]
      expect(report.type).toBe('custom')
      expect(report.level).toBe('warning')
      expect(report.message).toBe('Test message')
    })

    it('应该能够添加上下文信息', () => {
      const error = new Error('Test error')
      const context = { userId: '123', action: 'test' }
      const spy = vi.spyOn(monitor as any, 'sendToServer')

      monitor.captureError(error, { extra: context })

      expect(spy).toHaveBeenCalled()
      const report = spy.mock.calls[0][0]
      expect(report.extra.userId).toBe('123')
      expect(report.extra.action).toBe('test')
    })

    it('禁用时不应该捕获错误', () => {
      monitor.disable()
      const spy = vi.spyOn(monitor as any, 'sendToServer')

      monitor.captureError(new Error('Test'))

      expect(spy).not.toHaveBeenCalled()
    })

    it('应该应用错误过滤', () => {
      monitor.addFilter(/test-error/)
      const spy = vi.spyOn(monitor as any, 'sendToServer')

      monitor.captureError(new Error('This is a test-error'))

      expect(spy).not.toHaveBeenCalled()
    })

    it('应该应用错误采样', () => {
      monitor.setErrorSampleRate(0)
      const spy = vi.spyOn(monitor as any, 'sendToServer')

      // 采样率为0，应该不捕获
      for (let i = 0; i < 100; i++) {
        monitor.captureError(new Error(`Error ${i}`))
      }

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('面包屑', () => {
    beforeEach(() => {
      monitor.init()
    })

    it('应该能够添加面包屑', () => {
      monitor.addBreadcrumb({
        type: 'navigation',
        message: 'User clicked button',
        data: { buttonId: 'submit' }
      })

      expect(monitor['breadcrumbs'].length).toBe(1)
      expect(monitor['breadcrumbs'].get(0)?.message).toBe('User clicked button')
    })

    it('面包屑数量超过最大值时应该移除旧的', () => {
      const maxBreadcrumbs = monitor['maxBreadcrumbs']

      for (let i = 0; i < maxBreadcrumbs + 5; i++) {
        monitor.addBreadcrumb({
          type: 'test',
          message: `Breadcrumb ${i}`
        })
      }

      expect(monitor['breadcrumbs'].length).toBe(maxBreadcrumbs)
    })

    it('错误报告应该包含面包屑', () => {
      monitor.addBreadcrumb({
        type: 'navigation',
        message: 'Navigated to home'
      })

      const spy = vi.spyOn(monitor as any, 'sendToServer')
      monitor.captureError(new Error('Test'))

      const report = spy.mock.calls[0][0]
      expect(report.breadcrumbs.length).toBe(1)
      expect(report.breadcrumbs[0].message).toBe('Navigated to home')
    })
  })

  describe('插件系统', () => {
    it('应该能够注册插件', () => {
      const plugin: Plugin = {
        setup: vi.fn(),
        beforeCapture: vi.fn(),
        afterCapture: vi.fn(),
        beforeReport: vi.fn(),
        teardown: vi.fn()
      }

      monitor.use(plugin)
      monitor.init()

      expect(plugin.setup).toHaveBeenCalledWith(monitor)
    })

    it('beforeCapture插件钩子应该能够修改错误', () => {
      const plugin: Plugin = {
        setup: vi.fn(),
        beforeCapture: (error) => {
          error.message = 'Modified: ' + error.message
          return error
        }
      }

      monitor.use(plugin)
      monitor.init()

      const spy = vi.spyOn(monitor as any, 'report')
      monitor.captureError(new Error('Original'))

      const report = spy.mock.calls[0][0]
      expect(report.message).toBe('Modified: Original')
    })

    it('beforeCapture返回null应该取消捕获', () => {
      const plugin: Plugin = {
        setup: vi.fn(),
        beforeCapture: () => null
      }

      monitor.use(plugin)
      monitor.init()

      const spy = vi.spyOn(monitor as any, 'report')
      monitor.captureError(new Error('Test'))

      expect(spy).not.toHaveBeenCalled()
    })

    it('afterCapture插件钩子应该能够添加额外信息', () => {
      const plugin: Plugin = {
        setup: vi.fn(),
        afterCapture: (report) => {
          report.extra.customField = 'custom value'
          return report
        }
      }

      monitor.use(plugin)
      monitor.init()

      const spy = vi.spyOn(monitor as any, 'report')
      monitor.captureError(new Error('Test'))

      const report = spy.mock.calls[0][0]
      expect(report.extra.customField).toBe('custom value')
    })

    it('destroy()时应该调用插件的teardown', () => {
      const plugin: Plugin = {
        setup: vi.fn(),
        teardown: vi.fn()
      }

      monitor.use(plugin)
      monitor.init()
      monitor.destroy()

      expect(plugin.teardown).toHaveBeenCalled()
    })
  })

  describe('用户信息', () => {
    beforeEach(() => {
      monitor.init()
    })

    it('应该能够设置用户信息', () => {
      monitor.setUser({
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      })

      expect(monitor['config'].userId).toBe('123')
      expect(monitor['config'].tags.email).toBe('test@example.com')
    })
  })

  describe('标签管理', () => {
    it('应该能够添加标签', () => {
      monitor.updateConfig({ tags: { env: 'test', version: '1.0' } })
      expect(monitor['config'].tags.env).toBe('test')
      expect(monitor['config'].tags.version).toBe('1.0')
    })
  })

  describe('ID生成', () => {
    it('应该生成唯一的sessionId', () => {
      const monitor2 = new ErrorMonitor({
        appId: 'test-app',
        dsn: 'http://localhost:3000/collect'
      })

      expect(monitor['sessionId']).not.toBe(monitor2['sessionId'])
      monitor2.destroy()
    })

    it('应该为每个错误生成唯一的eventId', () => {
      monitor.init()

      const id1 = monitor['generateId']()
      const id2 = monitor['generateId']()

      expect(id1).not.toBe(id2)
    })
  })
})
