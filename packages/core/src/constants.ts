/**
 * 核心配置常量
 * 集中管理所有魔数和默认配置值
 */

/**
 * 面包屑相关常量
 */
export const BREADCRUMBS = {
  /** 最大面包屑数量 */
  MAX_SIZE: 50
} as const

/**
 * 采样率常量
 */
export const SAMPLING = {
  /** 默认总体采样率 */
  DEFAULT_RATE: 1.0,
  /** 最小采样率 */
  MIN_RATE: 0,
  /** 最大采样率 */
  MAX_RATE: 1
} as const

/**
 * 上报相关常量
 */
export const REPORTING = {
  /** 默认上报延迟（毫秒） */
  DEFAULT_DELAY: 1000,
  /** 默认批量上报数量 */
  DEFAULT_BATCH_SIZE: 10
} as const

/**
 * 默认配置值
 */
export const DEFAULT_CONFIG = {
  /** 默认启用状态 */
  ENABLED: true,
  /** 默认调试模式 */
  DEBUG: false
} as const
