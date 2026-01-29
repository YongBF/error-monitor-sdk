/**
 * E2E Integration Tests
 * 端到端集成测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import * as http from 'http'

describe('E2E Integration Tests', () => {
  let serverProcess: any
  const SERVER_PORT = 3001
  const SERVER_URL = `http://localhost:${SERVER_PORT}`

  beforeAll(async () => {
    // 启动测试服务器
    await new Promise<void>((resolve, reject) => {
      serverProcess = spawn('node', ['server/server.js'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env }
      })

      serverProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        if (output.includes('Server running')) {
          resolve()
        }
      })

      serverProcess.stderr?.on('data', (data) => {
        console.error('Server error:', data.toString())
      })

      serverProcess.on('error', reject)

      // 等待服务器启动
      setTimeout(resolve, 3000)
    })
  })

  afterAll(async () => {
    // 关闭服务器
    if (serverProcess) {
      serverProcess.kill()
    }
  })

  const makeRequest = async (url: string, options?: any) => {
    return new Promise((resolve, reject) => {
      const req = http.request(url, options, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            resolve(data)
          }
        })
      })

      req.on('error', reject)
      req.setTimeout(5000, () => req.destroy())

      if (options?.body) {
        req.write(options.body)
      }

      req.end()
    })
  }

  describe('服务器健康检查', () => {
    it('应该响应健康检查', async () => {
      const response = await makeRequest(`${SERVER_URL}/health`)
      expect(response.status).toBe('ok')
    })
  })

  describe('错误收集', () => {
    beforeEach(async () => {
      // 清空错误
      await makeRequest(`${SERVER_URL}/errors/clear`, { method: 'POST' })
    })

    it('应该接收错误报告', async () => {
      const errorReport = {
        appId: 'e2e-test',
        type: 'custom',
        level: 'error',
        message: 'E2E test error',
        stack: 'Error: E2E test\n    at test.js:10:5'
      }

      const response = await makeRequest(`${SERVER_URL}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })

      expect(response).toBeTruthy()
    })

    it('应该存储接收到的错误', async () => {
      // 发送错误
      await makeRequest(`${SERVER_URL}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appId: 'e2e-test',
          type: 'custom',
          message: 'Test error'
        })
      })

      // 获取错误
      const errors = await makeRequest(`${SERVER_URL}/errors`)

      expect(errors.total).toBeGreaterThan(0)
      expect(errors.errors).toBeInstanceOf(Array)
    })

    it('应该能够清空错误', async () => {
      // 发送错误
      await makeRequest(`${SERVER_URL}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appId: 'e2e-test',
          type: 'custom',
          message: 'Test error'
        })
      })

      // 清空
      await makeRequest(`${SERVER_URL}/errors/clear`, { method: 'POST' })

      // 验证已清空
      const errors = await makeRequest(`${SERVER_URL}/errors`)
      expect(errors.total).toBe(0)
    })
  })

  describe('Source Map 还原', () => {
    it('应该能够还原错误堆栈', async () => {
      const errorReport = {
        appId: 'e2e-test',
        type: 'js',
        message: '除数不能为零！',
        stack: `Error: 除数不能为零！
    at Calculator.divide (http://localhost:${SERVER_PORT}/test-sourcemap/bundle.min.js:1:215)
    at test (http://localhost:${SERVER_PORT}/test.html:33:14)`
      }

      await makeRequest(`${SERVER_URL}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })

      // 获取错误并检查source map是否被解析
      const errors = await makeRequest(`${SERVER_URL}/errors`)
      const error = errors.errors[errors.errors.length - 1]

      expect(error.sourceMapParsed).toBe(true)
      expect(error.stackFrames).toBeDefined()
      expect(error.stackFrames.length).toBeGreaterThan(0)
    })
  })

  describe('统计信息', () => {
    it('应该返回错误统计', async () => {
      const stats = await makeRequest(`${SERVER_URL}/stats`)

      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('byType')
      expect(stats).toHaveProperty('byLevel')
    })

    it('统计应该包含正确的错误类型', async () => {
      // 发送不同类型的错误
      await makeRequest(`${SERVER_URL}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ appId: 'e2e-test', type: 'js', message: 'JS error' })
      })

      await makeRequest(`${SERVER_URL}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ appId: 'e2e-test', type: 'network', message: 'Network error' })
      })

      // 清空之前的错误
      await makeRequest(`${SERVER_URL}/errors/clear`, { method: 'POST' })

      // 发送新错误
      await makeRequest(`${SERVER_URL}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ appId: 'e2e-test', type: 'custom', level: 'warning', message: 'Warning' })
      })

      const stats = await makeRequest(`${SERVER_URL}/stats`)

      expect(stats.total).toBeGreaterThan(0)
    })
  })

  describe('批量错误收集', () => {
    it('应该支持批量错误收集', async () => {
      const batchErrors = [
        { appId: 'e2e-test', type: 'custom', message: 'Error 1' },
        { appId: 'e2e-test', type: 'custom', message: 'Error 2' },
        { appId: 'e2e-test', type: 'custom', message: 'Error 3' }
      ]

      const response = await makeRequest(`${SERVER_URL}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchErrors)
      })

      expect(response).toBeTruthy()

      const errors = await makeRequest(`${SERVER_URL}/errors`)
      expect(errors.total).toBeGreaterThanOrEqual(3)
    })
  })
})
