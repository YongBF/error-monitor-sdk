# 🚀 快速开始指南

## 📍 已启动的服务

- **后端服务**: http://localhost:3001
- **测试页面**: http://localhost:3001/test.html
- **管理后台**: http://localhost:3001/
- **实时监控**: http://localhost:3001/monitor.html

---

## 🧪 快速测试步骤

### 方式1: 使用测试页面（推荐）

1. **打开测试页面**
   ```
   http://localhost:3001/test.html
   ```

2. **测试功能**
   - 点击 "触发 JS 错误" - 测试JavaScript错误捕获
   - 点击 "触发 Promise 错误" - 测试Promise错误捕获
   - 点击 "触发网络错误" - 测试网络错误捕获
   - 点击 "手动上报错误" - 测试手动上报
   - 点击 "测试批量处理(5个错误)" - 测试批量上报

3. **查看实时日志**
   - 页面底部的日志面板会显示所有操作
   - 包括：错误捕获、报告生成、上报等过程

4. **查看性能指标**
   - 点击 "显示性能指标" - 查看详细性能数据
   - 点击 "健康检查" - 检查性能健康状况

### 方式2: 使用管理后台

1. **打开管理后台**
   ```
   http://localhost:3001/
   ```

2. **查看统计**
   - 实时错误总数
   - 最近1小时错误数
   - 应用数量
   - 最近错误列表

3. **快捷操作**
   - 刷新统计
   - 查看所有错误
   - 清空错误

### 方式3: 使用实时监控

1. **打开监控面板**
   ```
   http://localhost:3001/monitor.html
   ```

2. **查看实时数据**
   - 24小时错误趋势图
   - 错误类型分布
   - 错误级别分布
   - 最近错误列表
   - 系统日志

3. **自动刷新**
   - 默认每5秒自动刷新
   - 可暂停/恢复自动刷新

---

## 🔌 API测试

### 测试1: 健康检查
```bash
curl http://localhost:3001/health
```

### 测试2: 上报单个错误
```bash
curl -X POST http://localhost:3001/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "test-app",
    "type": "custom",
    "level": "error",
    "message": "测试错误"
  }'
```

### 测试3: 批量上报
```bash
curl -X POST http://localhost:3001/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "reports": [
      {"type": "js", "level": "error", "message": "错误1", "appId": "test"},
      {"type": "promise", "level": "warn", "message": "错误2", "appId": "test"}
    ]
  }'
```

### 测试4: 获取错误列表
```bash
curl http://localhost:3001/api/errors
```

### 测试5: 获取统计
```bash
curl http://localhost:3001/api/stats
```

### 测试6: 清空错误
```bash
curl -X POST http://localhost:3001/api/errors/clear
```

---

## 📊 查看服务器日志

服务器会实时打印详细的错误信息：

```bash
# 查看实时日志
tail -f /tmp/claude/-Users-yongbinfan-work/tasks/b9cf0ff.output
```

日志示例：
```
════════════════════════════════════════════════════════════
📨 错误 #1
════════════════════════════════════════════════════════════
  ID:         abc123xyz
  类型:       custom
  级别:       error
  消息:       测试错误
  应用ID:     test-app
  处理耗时:   1ms
════════════════════════════════════════════════════════════
```

---

## 🎯 推荐测试流程

1. **先测试单个错误**
   - 打开 test.html
   - 点击 "触发 JS 错误"
   - 观察日志面板输出

2. **测试批量上报**
   - 点击 "测试批量处理(5个错误)"
   - 等待2秒观察批量上报
   - 检查服务器日志

3. **测试性能监控**
   - 点击 "显示性能指标"
   - 查看初始化、处理、上报时间

4. **测试离线缓存**
   - 打开浏览器开发者工具
   - 切换到 Network 标签
   - 勾选 "Offline" 模拟离线
   - 点击任意测试按钮
   - 观察日志显示"错误已被缓存"
   - 取消 Offline 恢复在线
   - 观察缓存的错误被上报

5. **查看管理界面**
   - 打开 http://localhost:3001/
   - 查看统计数据
   - 查看最近错误

6. **查看实时监控**
   - 打开 http://localhost:3001/monitor.html
   - 观察24小时趋势
   - 查看错误分布

---

## 💡 提示

- **日志颜色**:
  - 🟢 绿色 = 成功
  - 🟡 黄色 = 警告
  - 🔴 红色 = 错误
  - 🔵 蓝色 = 信息

- **性能指标**:
  - SDK初始化应在 100ms 内
  - 错误处理应在 10ms 内
  - 批量上报延迟可配置（默认2秒）

- **批量上报配置**:
  - batchSize: 5 (收集5个错误后上报)
  - delay: 2000ms (2秒后自动上报)

---

## 🆘 常见问题

### Q: 错误没有显示在管理界面？
A: 刷新浏览器或等待5秒自动刷新。

### Q: 测试页面无法加载？
A: 检查服务器是否运行：`lsof -ti:3001`

### Q: 如何重启服务器？
A: 
```bash
lsof -ti:3001 | xargs kill -9
cd /Users/yongbinfan/work/error-monitor-sdk/server
npm start
```

### Q: 如何清空所有错误？
A: 在管理界面点击 "清空错误" 按钮，或使用API：
```bash
curl -X POST http://localhost:3001/api/errors/clear
```

---

## 📚 相关文档

- [联调测试报告](./INTEGRATION-TEST-REPORT.md)
- [API文档](./API-DOCUMENTATION.md)
- [SDK使用指南](./USER-GUIDE.md)

---

*祝测试顺利！🎉*
