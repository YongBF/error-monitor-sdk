/**
 * 白屏检测配置常量
 * 集中管理所有魔数和默认配置值
 */

/**
 * 检测时间相关常量（毫秒）
 */
export const TIMING = {
  /** 默认检测延迟：页面加载后多久开始检测 */
  DEFAULT_DETECTION_DELAY: 3000,
  /** 默认检测间隔 */
  DEFAULT_CHECK_INTERVAL: 1000
} as const

/**
 * 检测阈值常量
 */
export const THRESHOLDS = {
  /** 最小DOM元素数量阈值 */
  DEFAULT_MIN_ELEMENTS: 10,
  /** 默认最大检测次数 */
  DEFAULT_MAX_CHECKS: 5,
  /** TreeWalker最大检查节点数（性能优化） */
  MAX_CHECK_NODES: 100
} as const

/**
 * DOM元素过滤常量
 */
export const DOM_FILTER = {
  /** 需要跳过的非内容标签名 */
  SKIP_TAGS: ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK'] as const,
  /** 需要跳过的测试元素ID */
  SKIP_TEST_IDS: ['blank-page', 'minimal-page', 'temp-status'] as const
} as const

/**
 * 日志级别常量
 */
export const LOG_LEVEL = {
  /** 默认日志级别（2=WARN，减少生产环境日志输出） */
  DEFAULT: 2
} as const
