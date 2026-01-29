/**
 * Error Monitor Server
 * 接收并存储前端上报的错误数据
 * 支持 Source Map 还原
 */

const express = require('express')
const cors = require('cors')
const path = require('path')
const { enhanceErrorWithSourceMap } = require('./sourcemap-parser')

const app = express()
const PORT = 3001

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '..')))
// 额外添加server目录到静态路径
app.use('/test-pages', express.static(__dirname))

// 存储上报的错误
const errorReports = []

// Source Map 目录（用于测试）
const SOURCE_MAP_DIR = path.join(__dirname, '..', 'test-sourcemap')

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', count: errorReports.length })
})

// 接收错误上报
app.post('/collect', async (req, res) => {
  try {
    const reports = Array.isArray(req.body) ? req.body : [req.body]

    for (const report of reports) {
      // 添加接收时间
      report.receivedAt = new Date().toISOString()
      report.id = Math.random().toString(36).substring(2, 15)

      // 尝试使用 Source Map 还原堆栈
      if (report.stack) {
        try {
          const enhanced = await enhanceErrorWithSourceMap(report, SOURCE_MAP_DIR)
          Object.assign(report, enhanced)

          if (report.sourceMapParsed) {
            console.log('\n✅ Source Map 还原成功!')
            console.log('  原始文件:', report.stackFrames[0]?.originalFilename)
            console.log('  原始行号:', report.stackFrames[0]?.originalLine)
          }
        } catch (error) {
          console.log('\n⚠️  Source Map 解析失败:', error.message)
        }
      }

      // 存储错误
      errorReports.push(report)

      // 打印日志
      console.log('\n📨 收到错误上报:')
      console.log('  类型:', report.type)
      console.log('  级别:', report.level)
      console.log('  消息:', report.message)
      console.log('  应用:', report.appId)
      console.log('  用户:', report.context?.userId || '未设置')
      if (report.sourceMapParsed) {
        console.log('  📍 原始位置:', `${report.stackFrames[0]?.originalFilename}:${report.stackFrames[0]?.originalLine}:${report.stackFrames[0]?.originalColumn}`)
      }
      if (report.tags) {
        console.log('  标签:', JSON.stringify(report.tags))
      }
      console.log('  面包屑:', report.breadcrumbs?.length || 0)
    }

    res.json({ success: true, received: reports.length })
  } catch (error) {
    console.error('处理上报失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// 获取所有错误
app.get('/errors', (req, res) => {
  res.json({
    total: errorReports.length,
    errors: errorReports
  })
})

// 清空错误
app.post('/errors/clear', (req, res) => {
  errorReports.length = 0
  res.json({ success: true, message: '错误已清空' })
})

// 获取统计信息
app.get('/stats', (req, res) => {
  const stats = {
    total: errorReports.length,
    byType: {},
    byLevel: {},
    recent: errorReports.slice(-10)
  }

  errorReports.forEach(report => {
    stats.byType[report.type] = (stats.byType[report.type] || 0) + 1
    stats.byLevel[report.level] = (stats.byLevel[report.level] || 0) + 1
  })

  res.json(stats)
})

// 根路径
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error Monitor Server</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .endpoint code { background: #fff; padding: 2px 8px; border-radius: 3px; }
        .stats { background: #e8f5e8; padding: 20px; border-radius: 10px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>🚀 Error Monitor Server</h1>
      <div class="stats">
        <h2>统计信息</h2>
        <p>已收集错误: <strong id="totalErrors">${errorReports.length}</strong></p>
      </div>
      <h2>API 端点</h2>
      <div class="endpoint">
        <strong>POST /collect</strong> - 接收错误上报<br>
        <code>curl -X POST http://localhost:${PORT}/collect -H "Content-Type: application/json" -d '{"appId":"test","message":"test"}'</code>
      </div>
      <div class="endpoint">
        <strong>GET /errors</strong> - 获取所有错误<br>
        <code>curl http://localhost:${PORT}/errors</code>
      </div>
      <div class="endpoint">
        <strong>GET /stats</strong> - 获取统计信息<br>
        <code>curl http://localhost:${PORT}/stats</code>
      </div>
      <div class="endpoint">
        <strong>POST /errors/clear</strong> - 清空错误<br>
        <code>curl -X POST http://localhost:${PORT}/errors/clear</code>
      </div>
      <script>
        // 每5秒刷新统计
        setInterval(() => {
          fetch('/stats')
            .then(r => r.json())
            .then(data => {
              document.getElementById('totalErrors').textContent = data.total
            })
        }, 5000)
      </script>
    </body>
    </html>
  `)
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                          ║
║        🚀 Error Monitor Server                              ║
║                                                          ║
║        Server running on: http://localhost:${PORT}          ║
║                                                          ║
║        API Endpoints:                                     ║
║          POST /collect - 接收错误上报                    ║
║          GET  /errors  - 获取所有错误                      ║
║          GET  /stats   - 获取统计信息                      ║
║          POST /errors/clear - 清空错误                    ║
║                                                          ║
╚════════════════════════════════════════════════════════════╝
  `)
})
