import * as Sentry from '@sentry/nextjs';

// 日志级别
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// 日志上下文
export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

// 日志配置
const LOG_CONFIG = {
  // 开发环境显示所有日志，生产环境只显示WARN和ERROR
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  
  // 是否发送到Sentry
  sendToSentry: true,
  
  // 是否在控制台显示
  consoleOutput: process.env.NODE_ENV === 'development',
};

// 日志颜色配置
const LOG_COLORS = {
  [LogLevel.DEBUG]: '\x1b[36m', // 青色
  [LogLevel.INFO]: '\x1b[32m',  // 绿色
  [LogLevel.WARN]: '\x1b[33m',  // 黄色
  [LogLevel.ERROR]: '\x1b[31m', // 红色
  reset: '\x1b[0m',             // 重置
};

// 日志级别优先级
const LOG_LEVEL_PRIORITY = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

// 检查是否应该记录日志
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[LOG_CONFIG.minLevel];
}

// 格式化日志消息
function formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

// 控制台输出
function consoleOutput(level: LogLevel, message: string, context?: LogContext) {
  if (!LOG_CONFIG.consoleOutput) return;
  
  const formattedMessage = formatLogMessage(level, message, context);
  const color = LOG_COLORS[level];
  const reset = LOG_COLORS.reset;
  
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(`${color}${formattedMessage}${reset}`);
      break;
    case LogLevel.INFO:
      console.info(`${color}${formattedMessage}${reset}`);
      break;
    case LogLevel.WARN:
      console.warn(`${color}${formattedMessage}${reset}`);
      break;
    case LogLevel.ERROR:
      console.error(`${color}${formattedMessage}${reset}`);
      break;
  }
}

// 发送到Sentry
function sendToSentry(level: LogLevel, message: string, context?: LogContext) {
  if (!LOG_CONFIG.sendToSentry) return;
  
  // 添加面包屑
  Sentry.addBreadcrumb({
    message,
    level: level as any,
    category: 'log',
    data: context,
  });
  
  // 如果是错误级别，发送事件
  if (level === LogLevel.ERROR) {
    Sentry.captureMessage(message, 'error', {
      extra: context,
    });
  }
}

// 主日志记录器类
export class Logger {
  private context: LogContext;
  
  constructor(defaultContext: LogContext = {}) {
    this.context = defaultContext;
  }
  
  // 创建子日志记录器
  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }
  
  // 设置上下文
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }
  
  // 记录调试日志
  debug(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.DEBUG)) return;
    
    const fullContext = { ...this.context, ...context };
    consoleOutput(LogLevel.DEBUG, message, fullContext);
    sendToSentry(LogLevel.DEBUG, message, fullContext);
  }
  
  // 记录信息日志
  info(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.INFO)) return;
    
    const fullContext = { ...this.context, ...context };
    consoleOutput(LogLevel.INFO, message, fullContext);
    sendToSentry(LogLevel.INFO, message, fullContext);
  }
  
  // 记录警告日志
  warn(message: string, context?: LogContext): void {
    if (!shouldLog(LogLevel.WARN)) return;
    
    const fullContext = { ...this.context, ...context };
    consoleOutput(LogLevel.WARN, message, fullContext);
    sendToSentry(LogLevel.WARN, message, fullContext);
  }
  
  // 记录错误日志
  error(message: string, error?: Error, context?: LogContext): void {
    if (!shouldLog(LogLevel.ERROR)) return;
    
    const fullContext = { 
      ...this.context, 
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };
    
    consoleOutput(LogLevel.ERROR, message, fullContext);
    sendToSentry(LogLevel.ERROR, message, fullContext);
    
    // 如果是错误对象，也发送到Sentry
    if (error) {
      Sentry.captureException(error, {
        extra: fullContext,
      });
    }
  }
  
  // 记录API调用
  apiCall(method: string, endpoint: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 400 ? LogLevel.ERROR : status >= 300 ? LogLevel.WARN : LogLevel.INFO;
    const message = `API ${method} ${endpoint} - ${status} (${duration}ms)`;
    
    this.log(level, message, {
      ...context,
      method,
      endpoint,
      status,
      duration,
    });
  }
  
  // 记录数据库操作
  dbOperation(operation: string, table: string, duration: number, context?: LogContext): void {
    const message = `DB ${operation} on ${table} (${duration}ms)`;
    
    this.log(LogLevel.DEBUG, message, {
      ...context,
      operation,
      table,
      duration,
    });
  }
  
  // 记录业务事件
  businessEvent(event: string, data: Record<string, any>, context?: LogContext): void {
    this.info(`Business event: ${event}`, {
      ...context,
      event,
      data,
    });
  }
  
  // 通用日志方法
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const fullContext = { ...this.context, ...context };
    consoleOutput(level, message, fullContext);
    sendToSentry(level, message, fullContext);
  }
}

// 默认日志记录器实例
export const logger = new Logger();

// 创建特定组件的日志记录器
export function createLogger(component: string, context?: LogContext): Logger {
  return new Logger({ ...context, component });
}

// 中间件：为API路由添加请求日志
export function withRequestLogging<T extends any[]>(
  handler: (...args: T) => Promise<Response> | Response
) {
  return async (...args: T): Promise<Response> => {
    const request = args[0] as Request;
    const startTime = Date.now();
    
    // 生成请求ID
    const requestId = Math.random().toString(36).substring(2, 15);
    
    // 创建请求日志记录器
    const requestLogger = logger.child({
      requestId,
      component: 'api',
      action: 'request',
    });
    
    try {
      requestLogger.info(`Incoming ${request.method} ${request.url}`);
      
      // 执行原始处理器
      const response = await handler(...args);
      
      const duration = Date.now() - startTime;
      const status = response.status;
      
      requestLogger.apiCall(
        request.method,
        request.url,
        status,
        duration,
        {
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer'),
        }
      );
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      requestLogger.error(
        `API error: ${request.method} ${request.url}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          duration,
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer'),
        }
      );
      
      throw error;
    }
  };
}
