// 简单的日志系统，用于替换console语句

interface Logger {
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
}

// 开发环境日志
const developmentLogger: Logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },
  error: (message: string, data?: any) => {
    console.error(`[ERROR] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
};

// 生产环境日志（只记录错误）
const productionLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: (message: string, data?: any) => {
    console.error(`[ERROR] ${message}`, data || '');
  },
  debug: () => {}
};

// 根据环境选择日志实现
const logger: Logger = process.env.NODE_ENV === 'production' ? productionLogger : developmentLogger;

export default logger;