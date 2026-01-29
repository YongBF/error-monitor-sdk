/**
 * Error Monitor Server
 * 接收并存储前端上报的错误数据
 * 支持 Source Map 还原
 * 支持批量上报
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
// 直接访问server目录下的文件（无需前缀）
app.use(express.static(__dirname))

// 存储上报的错误
const errorReports = []

// Source Map 目录（用于测试）
const SOURCE_MAP_DIR = path.join(__dirname, '..', 'test-sourcemap')

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`\n[${timestamp}] ${req.method} ${req.path}`)
  next()
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    count: errorReports.length,
    timestamp: new Date().toISOString()
  })
})

// 接收错误上报（支持单个和批量）
app.post('/api/collect', async (req, res) => {
  const startTime = Date.now()

  try {
    // 支持批量上报格式 { reports: [...] }
    let reports
    if (req.body.reports && Array.isArray(req.body.reports)) {
      reports = req.body.reports
      console.log(`📦 收到批量上报: ${reports.length} 个错误`)
    } else {
      // 单个错误上报
      reports = [req.body]
      console.log(`📨 收到单个错误上报`)
    }

    let processedCount = 0

    for (const report of reports) {
      // 添加接收时间和ID
      report.receivedAt = new Date().toISOString()
      report.id = Math.random().toString(36).substring(2, 15)

      // 尝试使用 Source Map 还原堆栈
      if (report.stack) {
        try {
          const enhanced = await enhanceErrorWithSourceMap(report, SOURCE_MAP_DIR)
          Object.assign(report, enhanced)

          if (report.sourceMapParsed) {
            console.log(`  ✅ Source Map 还原成功`)
            console.log(`     📍 ${report.stackFrames[0]?.originalFilename}:${report.stackFrames[0]?.originalLine}:${report.stackFrames[0]?.originalColumn}`)
          }
        } catch (error) {
          console.log(`  ⚠️  Source Map 解析失败: ${error.message}`)
        }
      }

      // 存储错误
      errorReports.push(report)
      processedCount++

      // 打印详细日志
      console.log(`\n${'═'.repeat(60)}`)
      console.log(`📨 错误 #${errorReports.length}`)
      console.log(`${'═'.repeat(60)}`)
      console.log(`  ID:         ${report.id}`)
      console.log(`  类型:       ${report.type}`)
      console.log(`  级别:       ${report.level}`)
      console.log(`  消息:       ${report.message}`)
      console.log(`  应用ID:     ${report.appId}`)
      console.log(`  环境:       ${report.environment || 'N/A'}`)
      console.log(`  用户ID:     ${report.context?.userId || '未设置'}`)
      console.log(`  URL:        ${report.context?.url || 'N/A'}`)
      console.log(`  用户代理:   ${report.context?.userAgent?.substring(0, 50)}...`)

      if (report.tags && Object.keys(report.tags).length > 0) {
        console.log(`  标签:       ${JSON.stringify(report.tags)}`)
      }

      if (report.breadcrumbs && report.breadcrumbs.length > 0) {
        console.log(`  面包屑:     ${report.breadcrumbs.length} 条`)
        report.breadcrumbs.slice(-3).forEach((crumb, i) => {
          const offset = report.breadcrumbs.length - report.breadcrumbs.slice(-3).length
          console.log(`     [${offset + i + 1}] ${crumb.type}: ${crumb.message}`)
        })
      }

      if (report.context?.viewport) {
        console.log(`  视口:       ${report.context.viewport.width}x${report.context.viewport.height}`)
      }

      if (report.extra && Object.keys(report.extra).length > 0) {
        console.log(`  额外信息:   ${JSON.stringify(report.extra).substring(0, 100)}...`)
      }

      const processingTime = Date.now() - startTime
      console.log(`  处理耗时:   ${processingTime}ms`)
      console.log(`${'═'.repeat(60)}`)
    }

    const totalTime = Date.now() - startTime
    console.log(`\n✅ 处理完成: ${processedCount} 个错误, 总耗时 ${totalTime}ms`)

    res.json({
      success: true,
      received: processedCount,
      processed: processedCount,
      totalTime: `${totalTime}ms`
    })
  } catch (error) {
    console.error('❌ 处理上报失败:', error)
    res.status(500).json({
      error: error.message,
      success: false
    })
  }
})

// 兼容旧的 /collect 路径
app.post('/collect', async (req, res) => {
  // 重定向到新的API路径
  req.url = '/api/collect'
  return app._router.handle(req, res)
})

// 获取所有错误
app.get('/api/errors', (req, res) => {
  const limit = parseInt(req.query.limit) || 100
  const offset = parseInt(req.query.offset) || 0

  const paginatedErrors = errorReports
    .slice(offset, offset + limit)
    .reverse() // 最新的在前

  res.json({
    total: errorReports.length,
    offset,
    limit,
    hasMore: offset + limit < errorReports.length,
    errors: paginatedErrors
  })
})

// 获取单个错误详情
app.get('/api/errors/:id', (req, res) => {
  const error = errorReports.find(e => e.id === req.params.id)
  if (!error) {
    return res.status(404).json({ error: '错误未找到' })
  }
  res.json(error)
})

// 清空错误
app.post('/api/errors/clear', (req, res) => {
  const count = errorReports.length
  errorReports.length = 0
  console.log(`\n🗑️  已清空 ${count} 条错误记录`)
  res.json({
    success: true,
    message: `已清空 ${count} 条错误记录`,
    cleared: count
  })
})

// 获取统计信息
app.get('/api/stats', (req, res) => {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  const stats = {
    total: errorReports.length,
    lastHour: errorReports.filter(e => new Date(e.receivedAt).getTime() > oneHourAgo).length,
    byType: {},
    byLevel: {},
    byApp: {},
    recent: errorReports.slice(-10).reverse(),
    timeline: []
  }

  // 按类型、级别、应用分组统计
  errorReports.forEach(report => {
    stats.byType[report.type] = (stats.byType[report.type] || 0) + 1
    stats.byLevel[report.level] = (stats.byLevel[report.level] || 0) + 1
    stats.byApp[report.appId] = (stats.byApp[report.appId] || 0) + 1
  })

  // 按小时统计（最近24小时）
  for (let i = 23; i >= 0; i--) {
    const hourStart = now - i * 60 * 60 * 1000
    const hourEnd = hourStart + 60 * 60 * 1000
    const count = errorReports.filter(e => {
      const time = new Date(e.receivedAt).getTime()
      return time >= hourStart && time < hourEnd
    }).length

    stats.timeline.push({
      hour: new Date(hourStart).getHours() + ':00',
      count
    })
  }

  res.json(stats)
})

// 控制台查看错误的实时流
app.get('/api/errors/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const interval = setInterval(() => {
    const recentErrors = errorReports.slice(-5)
    if (recentErrors.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'errors', data: recentErrors })}\n\n`)
    }
  }, 5000)

  req.on('close', () => {
    clearInterval(interval)
  })
})

// 根路径 - 提供管理界面
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error Monitor Server</title>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        h1 {
          color: white;
          text-align: center;
          margin-bottom: 30px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .card {
          background: white;
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
        }
        .stat-value {
          font-size: 2.5em;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 0.9em;
          opacity: 0.9;
        }
        .endpoint {
          background: #f8f9fa;
          padding: 15px;
          margin: 10px 0;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        .endpoint code {
          background: white;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.85em;
          display: block;
          margin-top: 8px;
        }
        button {
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          margin: 5px;
        }
        button:hover {
          opacity: 0.9;
        }
        button.danger {
          background: #dc3545;
        }
        #recentErrors {
          max-height: 400px;
          overflow-y: auto;
        }
        .error-item {
          padding: 12px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        .error-item:last-child {
          border-bottom: none;
        }
        .error-type {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          margin-right: 8px;
        }
        .error-type.js { background: #fff3cd; color: #856404; }
        .error-type.promise { background: #d4edda; color: #155724; }
        .error-type.network { background: #f8d7da; color: #721c24; }
        .error-type.custom { background: #d1ecf1; color: #0c5460; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Error Monitor Server</h1>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value" id="totalErrors">-</div>
            <div class="stat-label">总错误数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="lastHourErrors">-</div>
            <div class="stat-label">最近1小时</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="appsCount">-</div>
            <div class="stat-label">应用数量</div>
          </div>
        </div>

        <div class="card">
          <h2>⚡ 快捷操作</h2>
          <button onclick="refreshStats()">🔄 刷新统计</button>
          <button onclick="viewErrors()">📋 查看所有错误</button>
          <button class="danger" onclick="clearErrors()">🗑️ 清空错误</button>
        </div>

        <div class="card">
          <h2>📡 API 端点</h2>
          <div class="endpoint">
            <strong>POST /api/collect</strong> - 接收错误上报（支持批量）
            <code>curl -X POST http://localhost:${PORT}/api/collect -H "Content-Type: application/json" -d '{"type":"custom","message":"test"}'</code>
          </div>
          <div class="endpoint">
            <strong>GET /api/errors</strong> - 获取所有错误
            <code>curl http://localhost:${PORT}/api/errors</code>
          </div>
          <div class="endpoint">
            <strong>GET /api/stats</strong> - 获取统计信息
            <code>curl http://localhost:${PORT}/api/stats</code>
          </div>
          <div class="endpoint">
            <strong>POST /api/errors/clear</strong> - 清空所有错误
            <code>curl -X POST http://localhost:${PORT}/api/errors/clear</code>
          </div>
        </div>

        <div class="card">
          <h2>📝 最近错误</h2>
          <div id="recentErrors">加载中...</div>
        </div>
      </div>

      <script>
        function refreshStats() {
          fetch('/api/stats')
            .then(r => r.json())
            .then(data => {
              document.getElementById('totalErrors').textContent = data.total;
              document.getElementById('lastHourErrors').textContent = data.lastHour;
              document.getElementById('appsCount').textContent = Object.keys(data.byApp).length;

              // 显示最近的错误
              const errorsHtml = data.recent.map(err => \`
                <div class="error-item">
                  <span class="error-type \${err.type}">\${err.type}</span>
                  <strong>\${err.message.substring(0, 80)}</strong>
                  <br>
                  <small style="color: #666;">
                    \${new Date(err.receivedAt).toLocaleString()} |
                    \${err.appId} |
                    Level: \${err.level}
                  </small>
                </div>
              \`).join('');
              document.getElementById('recentErrors').innerHTML = errorsHtml || '<p style="color: #999;">暂无错误</p>';
            });
        }

        function viewErrors() {
          window.open('/api/errors', '_blank');
        }

        function clearErrors() {
          if (confirm('确定要清空所有错误记录吗？')) {
            fetch('/api/errors/clear', { method: 'POST' })
              .then(r => r.json())
              .then(data => {
                alert(data.message);
                refreshStats();
              });
          }
        }

        // 初始化并自动刷新
        refreshStats();
        setInterval(refreshStats, 5000);
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
║        Server running on: http://localhost:${PORT}             ║
║                                                          ║
║        API Endpoints:                                     ║
║          POST /api/collect - 接收错误上报（支持批量）     ║
║          GET  /api/errors  - 获取所有错误                  ║
║          GET  /api/stats   - 获取统计信息                  ║
║          POST /api/errors/clear - 清空错误                ║
║                                                          ║
║        测试页面:                                            ║
║          http://localhost:${PORT}/test.html               ║
║          http://localhost:${PORT}/                        ║
║                                                          ║
╚════════════════════════════════════════════════════════════╝
  `)
})
