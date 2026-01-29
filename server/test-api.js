/**
 * API 联调测试脚本
 * 测试错误监控后端的所有功能
 */

const API_BASE = 'http://localhost:3001/api'

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${colors.reset}`)
}

// 测试1: 清空所有错误
async function testClearErrors() {
  log(colors.blue, '🧹', '测试1: 清空错误记录')
  try {
    const response = await fetch(`${API_BASE}/errors/clear`, { method: 'POST' })
    const data = await response.json()
    log(colors.green, '✅', `清空成功: ${data.message}`)
    return true
  } catch (error) {
    log(colors.red, '❌', `清空失败: ${error.message}`)
    return false
  }
}

// 测试2: 单个错误上报
async function testSingleError() {
  log(colors.blue, '📤', '测试2: 上报单个错误')
  const errorData = {
    appId: 'test-app',
    type: 'custom',
    level: 'error',
    message: '测试错误 - API联调测试',
    stack: 'Error: 测试错误\n    at test.js:10:15',
    context: {
      userAgent: 'Test-Agent/1.0',
      url: 'http://localhost:3001/test',
      viewport: { width: 1920, height: 1080 }
    },
    breadcrumbs: [
      { timestamp: Date.now(), type: 'navigation', message: '页面加载' }
    ],
    tags: { test: 'api-test', env: 'development' }
  }

  try {
    const response = await fetch(`${API_BASE}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    })
    const data = await response.json()
    if (data.success) {
      log(colors.green, '✅', `单个错误上报成功 (处理耗时: ${data.totalTime})`)
      return true
    } else {
      log(colors.red, '❌', `上报失败: ${JSON.stringify(data)}`)
      return false
    }
  } catch (error) {
    log(colors.red, '❌', `请求失败: ${error.message}`)
    return false
  }
}

// 测试3: 批量错误上报
async function testBatchErrors() {
  log(colors.blue, '📦', '测试3: 批量上报错误 (5个)')
  const batchData = {
    reports: [
      { type: 'js', level: 'error', message: '批量错误 #1 - JavaScript错误', appId: 'test-app' },
      { type: 'promise', level: 'warn', message: '批量错误 #2 - Promise警告', appId: 'test-app' },
      { type: 'network', level: 'error', message: '批量错误 #3 - 网络错误', appId: 'test-app' },
      { type: 'custom', level: 'info', message: '批量错误 #4 - 自定义消息', appId: 'test-app' },
      { type: 'resource', level: 'error', message: '批量错误 #5 - 资源错误', appId: 'test-app' }
    ]
  }

  try {
    const response = await fetch(`${API_BASE}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchData)
    })
    const data = await response.json()
    if (data.success) {
      log(colors.green, '✅', `批量上报成功: ${data.received}/${data.processed} 个错误 (耗时: ${data.totalTime})`)
      return true
    } else {
      log(colors.red, '❌', `批量上报失败: ${JSON.stringify(data)}`)
      return false
    }
  } catch (error) {
    log(colors.red, '❌', `请求失败: ${error.message}`)
    return false
  }
}

// 测试4: 获取错误列表
async function testGetErrors() {
  log(colors.blue, '📋', '测试4: 获取错误列表')
  try {
    const response = await fetch(`${API_BASE}/errors`)
    const data = await response.json()
    log(colors.green, '✅', `获取成功: 总共 ${data.total} 个错误`)
    log(colors.cyan, '  ', `最近错误:`)
    data.errors.slice(0, 3).forEach((err, i) => {
      log(colors.cyan, '  ', `  ${i + 1}. [${err.type}] ${err.message.substring(0, 50)}...`)
    })
    return data.total > 0
  } catch (error) {
    log(colors.red, '❌', `获取失败: ${error.message}`)
    return false
  }
}

// 测试5: 获取统计信息
async function testGetStats() {
  log(colors.blue, '📊', '测试5: 获取统计信息')
  try {
    const response = await fetch(`${API_BASE}/stats`)
    const data = await response.json()

    log(colors.green, '✅', '统计信息获取成功:')
    log(colors.cyan, '  ', `  总错误数: ${data.total}`)
    log(colors.cyan, '  ', `  最近1小时: ${data.lastHour}`)
    log(colors.cyan, '  ', `  按类型统计:`)
    Object.entries(data.byType).forEach(([type, count]) => {
      log(colors.cyan, '  ', `    - ${type}: ${count}`)
    })
    log(colors.cyan, '  ', `  按级别统计:`)
    Object.entries(data.byLevel).forEach(([level, count]) => {
      log(colors.cyan, '  ', `    - ${level}: ${count}`)
    })
    return true
  } catch (error) {
    log(colors.red, '❌', `获取失败: ${error.message}`)
    return false
  }
}

// 测试6: 健康检查
async function testHealth() {
  log(colors.blue, '💚', '测试6: 健康检查')
  try {
    const response = await fetch(`http://localhost:3001/health`)
    const data = await response.json()
    if (data.status === 'ok') {
      log(colors.green, '✅', `服务健康: 错误数量 ${data.count}`)
      return true
    } else {
      log(colors.yellow, '⚠️', '服务状态异常')
      return false
    }
  } catch (error) {
    log(colors.red, '❌', `健康检查失败: ${error.message}`)
    return false
  }
}

// 主测试函数
async function runTests() {
  console.log('\n' + '='.repeat(60))
  log(colors.cyan, '🚀', '开始 API 联调测试')
  console.log('='.repeat(60) + '\n')

  const results = []

  // 运行所有测试
  results.push(await testHealth())
  results.push(await testClearErrors())
  results.push(await testSingleError())
  results.push(await testBatchErrors())
  await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
  results.push(await testGetErrors())
  results.push(await testGetStats())

  // 统计结果
  const passed = results.filter(r => r).length
  const total = results.length

  console.log('\n' + '='.repeat(60))
  if (passed === total) {
    log(colors.green, '✅', `所有测试通过! (${passed}/${total})`)
  } else {
    log(colors.yellow, '⚠️', `部分测试失败 (${passed}/${total})`)
  }
  console.log('='.repeat(60) + '\n')
}

// 运行测试
runTests().catch(error => {
  log(colors.red, '❌', `测试执行出错: ${error.message}`)
  process.exit(1)
})
