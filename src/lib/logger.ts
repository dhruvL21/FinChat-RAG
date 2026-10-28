/**
 * Production-ready Structured Logger for FinChat AI
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  level: LogLevel;
  timestamp: string;
  module: string;
  message: string;
  data?: Record<string, any>;
  error?: string;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(payload: LogPayload): string {
    const dataStr = payload.data ? ` | Data: ${JSON.stringify(payload.data)}` : '';
    const errStr = payload.error ? ` | Error: ${payload.error}` : '';
    return `[${payload.timestamp}] [${payload.level}] [${payload.module}] ${payload.message}${dataStr}${errStr}`;
  }

  private log(level: LogLevel, module: string, message: string, data?: Record<string, any>, error?: any) {
    const payload: LogPayload = {
      level,
      timestamp: new Date().toISOString(),
      module,
      message,
      data,
      error: error instanceof Error ? error.message : error ? String(error) : undefined
    };

    const formatted = this.formatMessage(payload);

    switch (level) {
      case 'DEBUG':
        if (!this.isProduction) console.debug(formatted);
        break;
      case 'INFO':
        console.log(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'ERROR':
        console.error(formatted);
        break;
    }
  }

  info(module: string, message: string, data?: Record<string, any>) {
    this.log('INFO', module, message, data);
  }

  warn(module: string, message: string, data?: Record<string, any>, error?: any) {
    this.log('WARN', module, message, data, error);
  }

  error(module: string, message: string, error?: any, data?: Record<string, any>) {
    this.log('ERROR', module, message, data, error);
  }

  debug(module: string, message: string, data?: Record<string, any>) {
    this.log('DEBUG', module, message, data);
  }
}

export const logger = new Logger();
