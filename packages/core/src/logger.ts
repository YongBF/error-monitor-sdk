/**
 * Logger Module
 * 日志系统抽象层
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * Logger类 - 提供统一的日志接口
 */
export class Logger {
  private level: LogLevel

  constructor(enabled: boolean = true, level: LogLevel = LogLevel.INFO) {
    this.level = enabled ? level : LogLevel.SILENT
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * 启用/禁用日志
   */
  setEnabled(enabled: boolean): void {
    this.level = enabled ? LogLevel.INFO : LogLevel.SILENT
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level
  }

  /**
   * 输出DEBUG级别日志
   */
  debug(...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log('[ErrorMonitor:DEBUG]', ...args)
    }
  }

  /**
   * 输出INFO级别日志
   */
  info(...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info('[ErrorMonitor:INFO]', ...args)
    }
  }

  /**
   * 输出WARN级别日志
   */
  warn(...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn('[ErrorMonitor:WARN]', ...args)
    }
  }

  /**
   * 输出ERROR级别日志
   */
  error(...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error('[ErrorMonitor:ERROR]', ...args)
    }
  }
}

/**
 * 创建Logger实例的工厂函数
 */
export function createLogger(enabled?: boolean, level?: LogLevel): Logger {
  return new Logger(enabled, level)
}
