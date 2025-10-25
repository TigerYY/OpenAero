/**
 * Logging utility for deployment optimization
 * Provides structured logging with different levels and contexts
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  requestId?: string;
  buildId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext | undefined;
  error?: Error | undefined;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as Error : undefined,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    if (this.isProduction) return ['warn', 'error'].includes(level);
    return true;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatMessage(level, message, context, error);
    
    if (this.isDevelopment) {
      console[level === 'debug' ? 'log' : level](
        `[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`,
        context ? { context } : '',
        error ? { error } : ''
      );
    } else {
      // In production, you might want to send logs to a service
      console[level === 'debug' ? 'log' : level](JSON.stringify(logEntry));
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  // Build-specific logging methods
  buildStart(buildId: string): void {
    this.info('Build started', { buildId, action: 'build_start' });
  }

  buildComplete(buildId: string, duration: number, success: boolean): void {
    this.info('Build completed', { 
      buildId, 
      action: 'build_complete', 
      duration,
      success 
    });
  }

  buildError(buildId: string, error: Error): void {
    this.error('Build failed', { buildId, action: 'build_error' }, error);
  }

  // TypeScript-specific logging
  typeCheckStart(): void {
    this.info('TypeScript type checking started', { action: 'type_check_start' });
  }

  typeCheckComplete(errorCount: number, warningCount: number): void {
    this.info('TypeScript type checking completed', { 
      action: 'type_check_complete',
      errorCount,
      warningCount
    });
  }

  typeError(file: string, line: number, message: string): void {
    this.error('TypeScript error', { 
      action: 'type_error',
      file,
      line,
      message
    });
  }

  // SSR/CSR-specific logging
  hydrationError(component: string, error: Error): void {
    this.error('Hydration error', { 
      action: 'hydration_error',
      component
    }, error);
  }

  serverComponentError(component: string, error: Error): void {
    this.error('Server component error', { 
      action: 'server_component_error',
      component
    }, error);
  }

  clientComponentError(component: string, error: Error): void {
    this.error('Client component error', { 
      action: 'client_component_error',
      component
    }, error);
  }
}

export const logger = new Logger();
export default logger;