# 🔔 双终端协作系统 - 完整使用指南

## 📋 系统概述

**终端A**: Bug修复终端（我当前的终端）
**终端B**: Bug发现/验证终端（另一个终端）
**轮询间隔**: 30秒

---

## 🚀 快速开始

### 第一步：在两个终端都启动监听

#### 终端A（当前终端）
```bash
~/.claude-comm/poll.sh A 30 &
```

#### 终端B（另一个终端）
```bash
~/.claude-comm/poll.sh B 30 &
```

---

## 💬 发送消息

### 终端B → 终端A（报告bug）

```bash
# 1. 发现新bug
~/.claude-comm/simple-comm.sh send A BUG_FOUND "资源加载错误：图片加载失败无法被捕获"

# 2. 验证通过
~/.claude-comm/simple-comm.sh send A BUG_VERIFIED "✅ 资源错误修复成功，已验证"

# 3. 验证失败
~/.claude-comm/simple-comm.sh send A BUG_FAILED "❌ 问题仍存在：点击按钮后仍未捕获错误"

# 4. 标记就绪
~/.claude-comm/simple-comm.sh send A READY "准备接收新的bug报告"
```

### 终端A → 终端B（通知修复状态）

```bash
# 1. 开始修复
~/.claude-comm/simple-comm.sh send B FIX_STARTED "开始修复资源加载错误"

# 2. 修复完成
~/.claude-comm/simple-comm.sh send B FIX_COMPLETED "✅ 资源错误已修复，使用拦截Image构造函数方案"

# 3. 修复失败
~/.claude-comm/simple-comm.sh send B FIX_FAILED "需要更多信息：错误如何复现？"

# 4. 标记就绪
~/.claude-comm/simple-comm.sh send B READY "准备修复下一个bug"
```

---

## 🔄 典型工作流程

### 场景1: 修复Bug
```
1. 终端B → BUG_FOUND "发现资源加载错误"
2. 终端A (收到通知) → FIX_STARTED "开始修复"
3. 终端A → FIX_COMPLETED "修复完成，请验证"
4. 终端B (收到通知) → BUG_VERIFIED "✅ 验证通过"
```

### 场景2: 修复失败
```
1. 终端B → BUG_FOUND "发现性能指标显示NaN"
2. 终端A (收到通知) → FIX_STARTED "开始修复"
3. 终端A → FIX_FAILED "需要更详细的复现步骤"
4. 终端B (收到通知) → BUG_FOUND "补充信息：点击'显示性能指标'后显示NaN"
5. 终端A (收到通知) → FIX_COMPLETED "修复完成，使用估算值"
6. 终端B (收到通知) → BUG_VERIFIED "✅ 验证通过"
```

---

## 📂 文件说明

| 文件 | 说明 |
|------|------|
| `~/.claude-comm/poll.sh` | 轮询监听脚本（主脚本）|
| `~/.claude-comm/simple-comm.sh` | 发送/检查消息脚本 |
| `~/.claude-comm/message.txt` | 消息存储文件 |
| `~/.claude-comm/USAGE.md` | 本使用指南 |

---

## 🛠️ 管理命令

### 查看所有消息历史
```bash
cat ~/.claude-comm/message.txt
```

### 清空消息历史
```bash
> ~/.claude-comm/message.txt
```

### 查看监听进程
```bash
ps aux | grep "poll.sh"
```

### 停止监听
```bash
# 方法1: 如果知道PID
kill <PID>

# 方法2: 杀死所有监听进程
pkill -f "poll.sh"
```

### 重启监听
```bash
# 先停止
pkill -f "poll.sh"

# 再启动
~/.claude-comm/poll.sh A 30 &  # 终端A
~/.claude-comm/poll.sh B 30 &  # 终端B
```

---

## 💡 最佳实践

1. **消息格式要清晰**
   - ✅ 好的: "资源加载错误：图片加载失败，URL为invalid-domain-12345.com/image.png"
   - ❌ 差的: "有错误"

2. **状态更新要及时**
   - 开始修复时立即发送 `FIX_STARTED`
   - 修复完成立即发送 `FIX_COMPLETED`

3. **验证要彻底**
   - 不要只看表面现象
   - 要测试多种场景
   - 失败时提供详细的重现步骤

4. **定期清空消息**
   - 避免消息文件过大
   - 每天或每个项目完成后清空一次

---

## 📞 快速参考卡

### 常用命令

```bash
# 启动监听
~/.claude-comm/poll.sh A 30 &

# 发送消息
~/.claude-comm/simple-comm.sh send [终端] [类型] [内容]

# 查看历史
cat ~/.claude-comm/message.txt

# 停止监听
pkill -f "poll.sh"

# 清空消息
> ~/.claude-comm/message.txt
```

### 消息类型速查

**终端B→A**: `BUG_FOUND`, `BUG_VERIFIED`, `BUG_FAILED`, `READY`  
**终端A→B**: `FIX_STARTED`, `FIX_COMPLETED`, `FIX_FAILED`, `READY`

---

## ✅ 现在开始使用

1. 在当前终端（终端A）执行：
   ```bash
   ~/.claude-comm/poll.sh A 30 &
   ```

2. 在另一个终端（终端B）执行：
   ```bash
   ~/.claude-comm/poll.sh B 30 &
   ```

3. 测试发送消息：
   ```bash
   # 从终端B发送测试消息到终端A
   ~/.claude-comm/simple-comm.sh send A READY "测试消息：终端B已就绪"
   ```

4. 在终端A应该能看到30秒内收到消息！

🎉 享受高效的终端协作吧！
