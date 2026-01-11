/**
 * Structured Logger
 *
 * Provides structured logging with levels, request IDs, and configurable output.
 * Can be disabled in production or configured via environment variables.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

/**
 * Get log level from environment or default to INFO
 * @returns {number} Log level
 */
function getLogLevel() {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (envLevel === 'DEBUG') return LOG_LEVELS.DEBUG;
  if (envLevel === 'INFO') return LOG_LEVELS.INFO;
  if (envLevel === 'WARN') return LOG_LEVELS.WARN;
  if (envLevel === 'ERROR') return LOG_LEVELS.ERROR;
  if (envLevel === 'NONE') return LOG_LEVELS.NONE;
  return LOG_LEVELS.INFO; // Default
}

/**
 * Format log entry as JSON or plain text
 * @param {string} level - Log level
 * @param {string} context - Logger context/name
 * @param {string} message - Log message
 * @param {Object} [metadata={}] - Additional metadata
 * @returns {string} Formatted log entry
 */
function formatLog(level, context, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    context,
    message,
    ...metadata,
  };

  // Use JSON format if LOG_FORMAT=json, otherwise use readable format
  if (process.env.LOG_FORMAT === 'json') {
    return JSON.stringify(logEntry);
  }

  // Human-readable format
  const metaStr = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
  return `[${timestamp}] ${level} [${context}] ${message}${metaStr}`;
}

/**
 * Create a logger instance for a specific context
 * @param {string} context - Logger context/name (e.g., 'FunctionCallingAgent')
 * @returns {Object} Logger instance with level methods
 */
export function createLogger(context = 'App') {
  const minLevel = getLogLevel();
  const enabled = minLevel < LOG_LEVELS.NONE;

  return {
    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {Object} [metadata={}] - Additional metadata
     */
    debug(message, metadata = {}) {
      if (enabled && minLevel <= LOG_LEVELS.DEBUG) {
        console.debug(formatLog('DEBUG', context, message, metadata));
      }
    },

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {Object} [metadata={}] - Additional metadata
     */
    info(message, metadata = {}) {
      if (enabled && minLevel <= LOG_LEVELS.INFO) {
        console.info(formatLog('INFO', context, message, metadata));
      }
    },

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {Object} [metadata={}] - Additional metadata
     */
    warn(message, metadata = {}) {
      if (enabled && minLevel <= LOG_LEVELS.WARN) {
        console.warn(formatLog('WARN', context, message, metadata));
      }
    },

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {Error|Object} [error] - Error object or metadata
     */
    error(message, error = {}) {
      if (enabled && minLevel <= LOG_LEVELS.ERROR) {
        const metadata =
          error instanceof Error ? { error: error.message, stack: error.stack, ...error } : error;
        console.error(formatLog('ERROR', context, message, metadata));
      }
    },

    /**
     * Create a child logger with additional context
     * @param {string} childContext - Additional context
     * @returns {Object} Child logger instance
     */
    child(childContext) {
      return createLogger(`${context}:${childContext}`);
    },
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger('App');
