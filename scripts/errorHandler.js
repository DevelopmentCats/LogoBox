/**
 * Error Handler Utility
 * Centralized error handling and logging for LogoBox scripts
 */

import fs from 'fs';
import path from 'path';

/**
 * Error handler class
 */
class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      logDir: options.logDir || './logs',
      logLevel: options.logLevel || 'info',
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile !== false,
      ...options
    };

    // Ensure log directory exists
    if (this.options.enableFile && !fs.existsSync(this.options.logDir)) {
      fs.mkdirSync(this.options.logDir, { recursive: true });
    }
  }

  /**
   * Log levels
   */
  static LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  /**
   * Get current timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Get log filename for current date
   */
  getLogFilename(level = 'info') {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.options.logDir, `${level}-${today}.log`);
  }

  /**
   * Format log message
   */
  formatMessage(level, message, context = {}) {
    const timestamp = this.getTimestamp();
    const contextStr = Object.keys(context).length > 0 ? 
      ` ${JSON.stringify(context)}` : '';
    
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  /**
   * Write to log file
   */
  writeToFile(level, formattedMessage) {
    if (!this.options.enableFile) return;

    try {
      const logFile = this.getLogFilename(level);
      fs.appendFileSync(logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Write to console
   */
  writeToConsole(level, message, context = {}) {
    if (!this.options.enableConsole) return;

    const methods = {
      error: console.error,
      warn: console.warn,
      info: console.log,
      debug: console.debug
    };

    const method = methods[level] || console.log;
    
    if (Object.keys(context).length > 0) {
      method(message, context);
    } else {
      method(message);
    }
  }

  /**
   * Generic log method
   */
  log(level, message, context = {}) {
    const levelValue = ErrorHandler.LEVELS[level];
    const configuredLevel = ErrorHandler.LEVELS[this.options.logLevel];

    // Only log if level is within configured level
    if (levelValue > configuredLevel) return;

    const formattedMessage = this.formatMessage(level, message, context);
    
    this.writeToConsole(level, message, context);
    this.writeToFile(level, formattedMessage);
  }

  /**
   * Error logging
   */
  error(message, context = {}) {
    this.log('error', message, context);
  }

  /**
   * Warning logging
   */
  warn(message, context = {}) {
    this.log('warn', message, context);
  }

  /**
   * Info logging
   */
  info(message, context = {}) {
    this.log('info', message, context);
  }

  /**
   * Debug logging
   */
  debug(message, context = {}) {
    this.log('debug', message, context);
  }

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException(error) {
    this.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Exit process after logging
    process.exit(1);
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(reason, promise) {
    this.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
  }

  /**
   * Create logger for specific module
   */
  createLogger(moduleName) {
    return {
      error: (message, context = {}) => 
        this.error(`[${moduleName}] ${message}`, context),
      warn: (message, context = {}) => 
        this.warn(`[${moduleName}] ${message}`, context),
      info: (message, context = {}) => 
        this.info(`[${moduleName}] ${message}`, context),
      debug: (message, context = {}) => 
        this.debug(`[${moduleName}] ${message}`, context)
    };
  }
}

// Create default instance
const defaultErrorHandler = new ErrorHandler();

// Setup global handlers by default
defaultErrorHandler.setupGlobalHandlers();

// Export both class and default instance
export { ErrorHandler, defaultErrorHandler as errorHandler };

// Export convenience methods
export const { error, warn, info, debug } = defaultErrorHandler;