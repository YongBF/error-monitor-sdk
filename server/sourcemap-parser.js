/**
 * Source Map Parser
 * 解析 sourcemap 并还原错误堆栈
 */

const { SourceMapConsumer } = require('source-map')
const fs = require('fs')
const path = require('path')

// 存储 sourcemap 文件的缓存
const sourcemapCache = new Map()

/**
 * 加载 sourcemap 文件
 */
async function loadSourceMap(filePath) {
  // 检查缓存
  if (sourcemapCache.has(filePath)) {
    console.log('  [缓存] 使用缓存的 sourcemap:', filePath)
    return sourcemapCache.get(filePath)
  }

  try {
    console.log('  [加载] 加载 sourcemap:', filePath)
    const fullPath = path.resolve(filePath)
    const content = fs.readFileSync(fullPath, 'utf8')
    const consumer = await new SourceMapConsumer(content)

    sourcemapCache.set(filePath, consumer)
    console.log('  [成功] sourcemap 加载成功')
    return consumer
  } catch (error) {
    console.error('  [失败] 加载 sourcemap 失败:', filePath, error.message)
    return null
  }
}

/**
 * 从 URL 中提取文件路径
 * 例如：http://localhost:3001/test/bundle.js -> test/bundle.js
 */
function extractPathFromUrl(url) {
  if (!url) return url

  try {
    // 匹配 http:// 或 https://
    const protocolMatch = url.match(/^https?:\/\//i)
    if (!protocolMatch) {
      // 没有协议，可能是相对路径
      return url
    }

    // 移除协议部分
    let path = url.substring(protocolMatch[0].length)

    // 找到第一个 / 来标记路径开始（跳过域名和端口）
    const pathIndex = path.indexOf('/')
    if (pathIndex !== -1) {
      path = path.substring(pathIndex + 1)  // +1 跳过开头的 /，返回相对路径
    } else {
      // 没有路径，返回空
      path = ''
    }

    // 移除查询参数和哈希
    path = path.split('?')[0].split('#')[0]

    console.log('    [URL提取] ' + url + ' -> ' + path)
    return path
  } catch (error) {
    console.error('  [错误] URL 解析失败:', error.message)
    return url
  }
}

/**
 * 解析堆栈帧中的 sourcemap
 */
async function parseStackFrame(stackFrame, sourceMapDir) {
  if (!stackFrame || !stackFrame.filename) {
    return stackFrame
  }

  console.log('  [解析] 堆栈帧:', stackFrame.filename, `行:${stackFrame.lineno}`, `列:${stackFrame.colno}`)

  // 尝试查找对应的 sourcemap 文件
  // 从文件名中提取基本名称（不带目录）
  const basename = path.basename(stackFrame.filename)
  const sourceMapName = basename.replace(/\.js$/, '.js.map')

  // 如果文件名包含目录，使用基本名；否则直接使用
  const sourceMapPath = sourceMapName

  // 从 sourceMapDir 查找 sourcemap
  const fullSourceMapPath = path.join(sourceMapDir, sourceMapPath)

  console.log('  [查找] sourcemap 路径:', fullSourceMapPath)

  const consumer = await loadSourceMap(fullSourceMapPath)
  if (!consumer) {
    return stackFrame
  }

  try {
    // 使用 sourcemap 还原原始位置
    const originalPosition = consumer.originalPositionFor({
      line: stackFrame.lineno,
      column: stackFrame.colno
    })

    console.log('  [还原] 原始位置:', originalPosition)

    if (originalPosition.source) {
      return {
        ...stackFrame,
        originalFilename: originalPosition.source,
        originalLine: originalPosition.line,
        originalColumn: originalPosition.column,
        functionName: originalPosition.name || stackFrame.functionName
      }
    }
  } catch (error) {
    console.error('  [错误] 解析位置失败:', error.message)
  }

  return stackFrame
}

/**
 * 解析单个堆栈行
 */
function parseStackLine(line) {
  // 格式1: at functionName (url:line:column)
  let match = line.match(/at\s+([\w.]+)\s+\(([^)]+):(\d+):(\d+)\)/)
  if (match) {
    return {
      functionName: match[1],
      url: match[2],
      lineno: parseInt(match[3], 10),
      colno: parseInt(match[4], 10)
    }
  }

  // 格式2: at functionName (url:line:column)
  match = line.match(/at\s+([\w.]+)\s+\(([^)]+):(\d+):(\d+)\)/)
  if (match) {
    return {
      functionName: match[1],
      url: match[2],
      lineno: parseInt(match[3], 10),
      colno: parseInt(match[4], 10)
    }
  }

  // 格式3: at url:line:column
  match = line.match(/at\s+([^:]+):(\d+):(\d+)/)
  if (match) {
    return {
      functionName: '<anonymous>',
      url: match[1],
      lineno: parseInt(match[2], 10),
      colno: parseInt(match[3], 10)
    }
  }

  // 格式4: url:line:column (no "at")
  match = line.match(/([^:]+):(\d+):(\d+)/)
  if (match) {
    return {
      functionName: '<anonymous>',
      url: match[1],
      lineno: parseInt(match[2], 10),
      colno: parseInt(match[3], 10)
    }
  }

  return null
}

/**
 * 解析完整的错误堆栈
 */
async function parseStackTrace(stack, sourceMapDir) {
  if (!stack || typeof stack !== 'string') {
    console.log('  [跳过] 堆栈为空或不是字符串')
    return null
  }

  console.log('  [开始] 解析堆栈...')
  const stackLines = stack.split('\n')
  const parsedFrames = []

  for (const line of stackLines) {
    const parsed = parseStackLine(line)
    if (parsed && parsed.url && parsed.url.startsWith('http')) {
      const filename = extractPathFromUrl(parsed.url)
      const frame = {
        functionName: parsed.functionName,
        filename,
        lineno: parsed.lineno,
        colno: parsed.colno
      }

      console.log(`  [帧] ${frame.functionName} @ ${parsed.url} -> ${filename}:${frame.lineno}:${frame.colno}`)

      const parsedFrame = await parseStackFrame(frame, sourceMapDir)
      if (parsedFrame !== frame && parsedFrame.originalFilename) {
        // 成功还原
        parsedFrames.push({
          original: line,
          parsed: `    at ${parsedFrame.functionName} (${parsedFrame.originalFilename}:${parsedFrame.originalLine}:${parsedFrame.originalColumn})`,
          frame: parsedFrame
        })
      }
    }
  }

  if (parsedFrames.length > 0) {
    console.log(`  [成功] 还原了 ${parsedFrames.length} 个堆栈帧`)
  } else {
    console.log('  [失败] 没有成功还原任何堆栈帧')
  }

  return parsedFrames.length > 0 ? parsedFrames : null
}

/**
 * 为错误报告添加 sourcemap 解析结果
 */
async function enhanceErrorWithSourceMap(errorReport, sourceMapDir) {
  console.log('\n[Sourcemap] 开始处理错误...')

  if (!errorReport.stack) {
    console.log('[Sourcemap] 错误没有堆栈信息，跳过')
    return errorReport
  }

  if (!sourceMapDir) {
    console.log('[Sourcemap] 没有提供 sourcemap 目录，跳过')
    return errorReport
  }

  try {
    console.log('[Sourcemap] 堆栈信息:')
    console.log('  ', errorReport.stack.split('\n').slice(0, 3).join('\n  '))

    const parsedStack = await parseStackTrace(errorReport.stack, sourceMapDir)

    if (parsedStack && parsedStack.length > 0) {
      const enhanced = {
        ...errorReport,
        originalStack: parsedStack.map(p => p.parsed).join('\n'),
        stackFrames: parsedStack.map(p => p.frame),
        sourceMapParsed: true
      }

      console.log('[Sourcemap] ✅ 还原成功!')
      console.log(`  原始文件: ${enhanced.stackFrames[0]?.originalFilename}`)
      console.log(`  原始行号: ${enhanced.stackFrames[0]?.originalLine}`)
      console.log(`  原始列号: ${enhanced.stackFrames[0]?.originalColumn}`)

      return enhanced
    } else {
      console.log('[Sourcemap] ⚠️ 未能还原任何堆栈帧')
    }
  } catch (error) {
    console.error('[Sourcemap] ❌ 解析错误:', error.message)
    console.error(error.stack)
  }

  return errorReport
}

module.exports = {
  loadSourceMap,
  parseStackFrame,
  parseStackTrace,
  enhanceErrorWithSourceMap
}
