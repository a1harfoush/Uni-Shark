/**
 * Comprehensive logging system for DULMS Watcher
 * Handles all scraper operations, errors, and performance metrics
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export enum OperationType {
  SCRAPER_OPERATION = 'scraper_operation',
  DATA_PROCESSING = 'data_processing',
  COURSE_EXPANSION = 'course_expansion',
  DATA_VALIDATION = 'data_validation',
  ERROR_RECOVERY = 'error_recovery',
  PERFORMANCE_METRIC = 'performance_metric'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  operation: OperationType;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  performance?: {
    duration: number;
    memoryUsage?: number;
    operationSize?: number;
  };
  metadata?: {
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    url?: string;
  };
}

export interface ErrorPattern {
  errorType: string;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  frequency: number; // errors per hour
  contexts: string[];
}

export interface PerformanceMetrics {
  operationType: OperationType;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  totalOperations: number;
  failureRate: number;
  lastUpdated: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogEntries = 1000;
  private sessionId: string;
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private performanceMetrics: Map<OperationType, PerformanceMetrics> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadPersistedLogs();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a general message with context
   */
  log(
    level: LogLevel,
    operation: OperationType,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      context,
      metadata: {
        sessionId: this.sessionId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      };
      
      this.trackErrorPattern(error, context);
    }

    this.addLogEntry(logEntry);
    this.outputToConsole(logEntry);
  }

  /**
   * Log scraper operation with detailed context
   */
  logScraperOperation(
    success: boolean,
    operation: string,
    duration: number,
    context: Record<string, any>,
    error?: Error
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Scraper operation ${operation} ${success ? 'completed' : 'failed'}`;
    
    const enhancedContext = {
      ...context,
      success,
      operation,
      dataIntegrity: context.dataIntegrity || 'unknown'
    };

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      operation: OperationType.SCRAPER_OPERATION,
      message,
      context: enhancedContext,
      performance: {
        duration,
        operationSize: context.dataSize || 0
      },
      metadata: {
        sessionId: this.sessionId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      };
      
      this.trackErrorPattern(error, enhancedContext);
    }

    this.addLogEntry(logEntry);
    this.updatePerformanceMetrics(OperationType.SCRAPER_OPERATION, duration, success);
    this.outputToConsole(logEntry);
  }

  /**
   * Log data processing operations with transformation details
   */
  logDataProcessing(
    operation: string,
    inputSize: number,
    outputSize: number,
    duration: number,
    validationErrors: string[] = [],
    transformationSteps: string[] = []
  ): void {
    const hasErrors = validationErrors.length > 0;
    const level = hasErrors ? LogLevel.WARN : LogLevel.INFO;
    const message = `Data processing ${operation} completed with ${validationErrors.length} validation errors`;

    const context = {
      operation,
      inputSize,
      outputSize,
      validationErrors,
      transformationSteps,
      dataReduction: inputSize > 0 ? ((inputSize - outputSize) / inputSize * 100).toFixed(2) + '%' : '0%'
    };

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      operation: OperationType.DATA_PROCESSING,
      message,
      context,
      performance: {
        duration,
        operationSize: inputSize
      },
      metadata: {
        sessionId: this.sessionId
      }
    };

    this.addLogEntry(logEntry);
    this.updatePerformanceMetrics(OperationType.DATA_PROCESSING, duration, !hasErrors);
    this.outputToConsole(logEntry);
  }

  /**
   * Log performance metrics for bottleneck identification
   */
  logPerformanceMetric(
    operation: OperationType,
    metricName: string,
    value: number,
    context?: Record<string, any>
  ): void {
    const message = `Performance metric: ${metricName} = ${value}`;
    
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      operation,
      message,
      context: {
        metricName,
        value,
        ...context
      },
      performance: {
        duration: 0,
        operationSize: value
      },
      metadata: {
        sessionId: this.sessionId
      }
    };

    this.addLogEntry(logEntry);
    this.outputToConsole(logEntry);
  }

  /**
   * Log data inconsistencies with detailed comparison
   */
  logDataInconsistency(
    inconsistencyType: string,
    expectedData: any,
    actualData: any,
    comparisonDetails: Record<string, any>
  ): void {
    const message = `Data inconsistency detected: ${inconsistencyType}`;
    
    const context = {
      inconsistencyType,
      expectedData: this.sanitizeData(expectedData),
      actualData: this.sanitizeData(actualData),
      comparisonDetails,
      dataHash: {
        expected: this.generateDataHash(expectedData),
        actual: this.generateDataHash(actualData)
      }
    };

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      operation: OperationType.DATA_VALIDATION,
      message,
      context,
      metadata: {
        sessionId: this.sessionId
      }
    };

    this.addLogEntry(logEntry);
    this.outputToConsole(logEntry);
  }

  private trackErrorPattern(error: Error, context?: Record<string, any>): void {
    const errorKey = `${error.name}:${error.message}`;
    const now = new Date().toISOString();
    
    if (this.errorPatterns.has(errorKey)) {
      const pattern = this.errorPatterns.get(errorKey)!;
      pattern.count++;
      pattern.lastOccurrence = now;
      pattern.contexts.push(JSON.stringify(context || {}));
      
      // Calculate frequency (errors per hour)
      const firstTime = new Date(pattern.firstOccurrence).getTime();
      const lastTime = new Date(pattern.lastOccurrence).getTime();
      const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);
      pattern.frequency = hoursDiff > 0 ? pattern.count / hoursDiff : pattern.count;
    } else {
      this.errorPatterns.set(errorKey, {
        errorType: errorKey,
        count: 1,
        firstOccurrence: now,
        lastOccurrence: now,
        frequency: 1,
        contexts: [JSON.stringify(context || {})]
      });
    }
  }

  private updatePerformanceMetrics(
    operation: OperationType,
    duration: number,
    success: boolean
  ): void {
    if (this.performanceMetrics.has(operation)) {
      const metrics = this.performanceMetrics.get(operation)!;
      const totalOps = metrics.totalOperations + 1;
      const totalDuration = (metrics.averageDuration * metrics.totalOperations) + duration;
      
      metrics.averageDuration = totalDuration / totalOps;
      metrics.minDuration = Math.min(metrics.minDuration, duration);
      metrics.maxDuration = Math.max(metrics.maxDuration, duration);
      metrics.totalOperations = totalOps;
      metrics.failureRate = success 
        ? (metrics.failureRate * metrics.totalOperations - metrics.failureRate) / totalOps
        : (metrics.failureRate * metrics.totalOperations + 1) / totalOps;
      metrics.lastUpdated = new Date().toISOString();
    } else {
      this.performanceMetrics.set(operation, {
        operationType: operation,
        averageDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        totalOperations: 1,
        failureRate: success ? 0 : 1,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Maintain max log entries
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }
    
    this.persistLogs();
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.operation}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.context, entry.error);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, entry.message, entry.context, entry.error);
        break;
    }
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string' && data.length > 500) {
      return data.substring(0, 500) + '... [truncated]';
    }
    if (Array.isArray(data) && data.length > 10) {
      return [...data.slice(0, 10), `... [${data.length - 10} more items]`];
    }
    return data;
  }

  private generateDataHash(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private persistLogs(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const logData = {
          logs: this.logs.slice(-100), // Store last 100 logs
          errorPatterns: Array.from(this.errorPatterns.entries()),
          performanceMetrics: Array.from(this.performanceMetrics.entries()),
          sessionId: this.sessionId
        };
        localStorage.setItem('dulms_watcher_logs', JSON.stringify(logData));
      }
    } catch (error) {
      console.warn('Failed to persist logs to localStorage:', error);
    }
  }

  private loadPersistedLogs(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('dulms_watcher_logs');
        if (stored) {
          const logData = JSON.parse(stored);
          this.logs = logData.logs || [];
          this.errorPatterns = new Map(logData.errorPatterns || []);
          this.performanceMetrics = new Map(logData.performanceMetrics || []);
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted logs:', error);
    }
  }

  // Public methods for accessing logs and metrics
  getLogs(level?: LogLevel, operation?: OperationType, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }
    
    if (operation) {
      filteredLogs = filteredLogs.filter(log => log.operation === operation);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  clearLogs(): void {
    this.logs = [];
    this.errorPatterns.clear();
    this.performanceMetrics.clear();
    this.persistLogs();
  }

  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      errorPatterns: Array.from(this.errorPatterns.entries()),
      performanceMetrics: Array.from(this.performanceMetrics.entries()),
      exportedAt: new Date().toISOString(),
      sessionId: this.sessionId
    }, null, 2);
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience methods
export const logInfo = (operation: OperationType, message: string, context?: Record<string, any>) =>
  logger.log(LogLevel.INFO, operation, message, context);

export const logWarn = (operation: OperationType, message: string, context?: Record<string, any>) =>
  logger.log(LogLevel.WARN, operation, message, context);

export const logError = (operation: OperationType, message: string, error?: Error, context?: Record<string, any>) =>
  logger.log(LogLevel.ERROR, operation, message, context, error);

export const logDebug = (operation: OperationType, message: string, context?: Record<string, any>) =>
  logger.log(LogLevel.DEBUG, operation, message, context);