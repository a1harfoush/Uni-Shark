/**
 * Integration utility for comprehensive monitoring and logging
 * Provides easy-to-use interfaces for integrating monitoring into existing code
 */

import { logger, OperationType, LogLevel } from './logger';
import { performanceMonitor } from './performance-monitor';
import { initializeErrorTracker } from './error-tracker';

export interface MonitoringConfig {
  enablePerformanceMonitoring: boolean;
  enableErrorTracking: boolean;
  enableDetailedLogging: boolean;
  performanceThresholds?: {
    slowOperationMs?: number;
    memoryLeakMb?: number;
  };
  logLevel: LogLevel;
}

export interface ScrapingContext {
  operation: string;
  url?: string;
  courseId?: string;
  userId?: string;
  expectedDataSize?: number;
  timeout?: number;
}

export interface DataProcessingContext {
  operation: string;
  inputSize: number;
  expectedOutputSize?: number;
  validationRules?: string[];
  transformationSteps?: string[];
}

class MonitoringIntegration {
  private config: MonitoringConfig = {
    enablePerformanceMonitoring: true,
    enableErrorTracking: true,
    enableDetailedLogging: true,
    logLevel: LogLevel.INFO
  };

  private continuousMonitoringStop?: () => void;

  /**
   * Initialize monitoring with configuration
   */
  initialize(config: Partial<MonitoringConfig> = {}): void {
    this.config = { ...this.config, ...config };

    if (this.config.performanceThresholds) {
      performanceMonitor.setThresholds(this.config.performanceThresholds);
    }

    // Start continuous monitoring if enabled
    if (this.config.enablePerformanceMonitoring) {
      this.continuousMonitoringStop = performanceMonitor.startContinuousMonitoring(60000); // Every minute
    }

    logger.log(
      LogLevel.INFO,
      OperationType.PERFORMANCE_METRIC,
      'Monitoring system initialized',
      { config: this.config }
    );
  }

  /**
   * Shutdown monitoring system
   */
  shutdown(): void {
    if (this.continuousMonitoringStop) {
      this.continuousMonitoringStop();
    }

    logger.log(
      LogLevel.INFO,
      OperationType.PERFORMANCE_METRIC,
      'Monitoring system shutdown'
    );
  }

  /**
   * Monitor a scraping operation with comprehensive logging
   */
  async monitorScrapingOperation<T>(
    context: ScrapingContext,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let timerId: string | undefined;

    if (this.config.enablePerformanceMonitoring) {
      timerId = performanceMonitor.startTimer(OperationType.SCRAPER_OPERATION, context);
    }

    if (this.config.enableDetailedLogging && this.config.logLevel <= LogLevel.INFO) {
      logger.log(
        LogLevel.INFO,
        OperationType.SCRAPER_OPERATION,
        `Starting scraping operation: ${context.operation}`,
        context
      );
    }

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      // Log successful operation
      if (this.config.enableDetailedLogging) {
        logger.logScraperOperation(
          true,
          context.operation,
          duration,
          {
            ...context,
            resultSize: this.getDataSize(result),
            success: true
          }
        );
      }

      if (timerId && this.config.enablePerformanceMonitoring) {
        performanceMonitor.endTimer(timerId, { success: true, resultSize: this.getDataSize(result) });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Track error
      if (this.config.enableErrorTracking) {
        if (context.url) {
          console.error('Network error tracked:', {
            error: errorObj,
            url: context.url,
            method: 'GET',
            duration
          });
        } else {
          console.error('Operation error tracked:', {
            error: errorObj,
            operation: OperationType.SCRAPER_OPERATION,
            context
          });
        }
      }

      // Log failed operation
      if (this.config.enableDetailedLogging) {
        logger.logScraperOperation(
          false,
          context.operation,
          duration,
          {
            ...context,
            success: false,
            errorMessage: errorObj.message
          },
          errorObj
        );
      }

      if (timerId && this.config.enablePerformanceMonitoring) {
        performanceMonitor.endTimer(timerId, { 
          success: false, 
          error: errorObj.message 
        });
      }

      throw error;
    }
  }

  /**
   * Monitor data processing operations
   */
  async monitorDataProcessing<T>(
    context: DataProcessingContext,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const startTime = Date.now();
    let timerId: string | undefined;

    if (this.config.enablePerformanceMonitoring) {
      timerId = performanceMonitor.startTimer(OperationType.DATA_PROCESSING, context);
    }

    if (this.config.enableDetailedLogging && this.config.logLevel <= LogLevel.INFO) {
      logger.log(
        LogLevel.INFO,
        OperationType.DATA_PROCESSING,
        `Starting data processing: ${context.operation}`,
        context
      );
    }

    try {
      const result = await Promise.resolve(operation());
      const duration = Date.now() - startTime;
      const outputSize = this.getDataSize(result);

      // Log processing operation
      if (this.config.enableDetailedLogging) {
        logger.logDataProcessing(
          context.operation,
          context.inputSize,
          outputSize,
          duration,
          [], // No validation errors if successful
          context.transformationSteps || []
        );
      }

      if (timerId && this.config.enablePerformanceMonitoring) {
        performanceMonitor.endTimer(timerId, { 
          success: true, 
          inputSize: context.inputSize,
          outputSize 
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Track processing error
      if (this.config.enableErrorTracking) {
        console.error('Data processing error tracked:', {
          error: errorObj,
          operation: context.operation,
          metadata: { size: context.inputSize },
          transformationSteps: context.transformationSteps?.join(' -> ')
        });
      }

      // Log failed processing
      if (this.config.enableDetailedLogging) {
        logger.logDataProcessing(
          context.operation,
          context.inputSize,
          0,
          duration,
          [errorObj.message],
          context.transformationSteps || []
        );
      }

      if (timerId && this.config.enablePerformanceMonitoring) {
        performanceMonitor.endTimer(timerId, { 
          success: false, 
          error: errorObj.message 
        });
      }

      throw error;
    }
  }

  /**
   * Monitor validation operations
   */
  validateWithMonitoring<T>(
    data: T,
    validationType: string,
    validationRules: string[],
    validator: (data: T) => boolean | string[]
  ): { isValid: boolean; errors: string[] } {
    const startTime = Date.now();

    if (this.config.enableDetailedLogging && this.config.logLevel <= LogLevel.DEBUG) {
      logger.log(
        LogLevel.DEBUG,
        OperationType.DATA_VALIDATION,
        `Starting validation: ${validationType}`,
        { validationType, rules: validationRules, dataSize: this.getDataSize(data) }
      );
    }

    try {
      const result = validator(data);
      const duration = Date.now() - startTime;
      
      if (typeof result === 'boolean') {
        const isValid = result;
        const errors: string[] = [];

        if (this.config.enableDetailedLogging) {
          logger.log(
            isValid ? LogLevel.DEBUG : LogLevel.WARN,
            OperationType.DATA_VALIDATION,
            `Validation ${validationType} ${isValid ? 'passed' : 'failed'}`,
            { validationType, isValid, duration, rules: validationRules }
          );
        }

        return { isValid, errors };
      } else {
        const errors = result;
        const isValid = errors.length === 0;

        if (!isValid && this.config.enableErrorTracking) {
          const validationError = new Error(`Validation failed: ${errors.join(', ')}`);
          console.error('Validation error tracked:', {
            error: validationError,
            validationType,
            data,
            validationRules
          });
        }

        if (this.config.enableDetailedLogging) {
          logger.log(
            isValid ? LogLevel.DEBUG : LogLevel.WARN,
            OperationType.DATA_VALIDATION,
            `Validation ${validationType} ${isValid ? 'passed' : 'failed'}`,
            { validationType, isValid, errors, duration, rules: validationRules }
          );
        }

        return { isValid, errors };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      if (this.config.enableErrorTracking) {
        console.error('Validation error tracked:', {
          error: errorObj,
          validationType,
          data,
          validationRules
        });
      }

      if (this.config.enableDetailedLogging) {
        logger.log(
          LogLevel.ERROR,
          OperationType.DATA_VALIDATION,
          `Validation ${validationType} threw error`,
          { validationType, error: errorObj.message, duration, rules: validationRules },
          errorObj
        );
      }

      return { isValid: false, errors: [errorObj.message] };
    }
  }

  /**
   * Log data inconsistency with monitoring context
   */
  logDataInconsistency(
    inconsistencyType: string,
    expectedData: any,
    actualData: any,
    context?: Record<string, any>
  ): void {
    if (!this.config.enableDetailedLogging) return;

    const comparisonDetails = this.generateComparisonDetails(expectedData, actualData);
    
    logger.logDataInconsistency(
      inconsistencyType,
      expectedData,
      actualData,
      { ...comparisonDetails, ...context }
    );

    // Also track as an error if significant inconsistency
    if (this.config.enableErrorTracking && this.isSignificantInconsistency(comparisonDetails)) {
      const inconsistencyError = new Error(`Data inconsistency: ${inconsistencyType}`);
      console.error('Data inconsistency error tracked:', {
        error: inconsistencyError,
        operation: OperationType.DATA_VALIDATION,
        context: { inconsistencyType, comparisonDetails, ...context }
      });
    }
  }

  /**
   * Get comprehensive monitoring report
   */
  getMonitoringReport(): {
    logs: any[];
    errors: any;
    performance: any[];
    systemHealth: {
      status: 'healthy' | 'degraded' | 'critical';
      issues: string[];
      recommendations: string[];
    };
  } {
    const logs = logger.getLogs(this.config.logLevel);
    const errorAnalysis = { totalErrors: 0, errorsByType: {}, recentErrors: [] }; // Placeholder for error analysis
    const performanceMetrics: any[] = []; // Placeholder for performance metrics
    const performanceTrends = performanceMonitor.getPerformanceTrends(1);

    const systemHealth = this.assessSystemHealth(errorAnalysis, performanceTrends);

    return {
      logs: logs.slice(-50), // Last 50 logs
      errors: errorAnalysis,
      performance: performanceMetrics,
      systemHealth
    };
  }

  /**
   * Export all monitoring data
   */
  exportMonitoringData(): string {
    const report = this.getMonitoringReport();
    const exportData = {
      ...report,
      logExport: logger.exportLogs(),
      errorExport: [], // Placeholder for error export
      exportedAt: new Date().toISOString(),
      config: this.config
    };

    return JSON.stringify(exportData, null, 2);
  }

  private getDataSize(data: any): number {
    if (data === null || data === undefined) return 0;
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private generateComparisonDetails(expected: any, actual: any): Record<string, any> {
    const details: Record<string, any> = {};

    if (typeof expected !== typeof actual) {
      details.typeMismatch = {
        expected: typeof expected,
        actual: typeof actual
      };
    }

    if (Array.isArray(expected) && Array.isArray(actual)) {
      details.arrayComparison = {
        expectedLength: expected.length,
        actualLength: actual.length,
        lengthDifference: actual.length - expected.length
      };
    }

    if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
      const expectedKeys = Object.keys(expected);
      const actualKeys = Object.keys(actual);
      
      details.objectComparison = {
        expectedKeys: expectedKeys.length,
        actualKeys: actualKeys.length,
        missingKeys: expectedKeys.filter(key => !actualKeys.includes(key)),
        extraKeys: actualKeys.filter(key => !expectedKeys.includes(key))
      };
    }

    return details;
  }

  private isSignificantInconsistency(comparisonDetails: Record<string, any>): boolean {
    // Consider inconsistency significant if:
    // - Type mismatch
    // - Array length difference > 10%
    // - Missing required object keys
    
    if (comparisonDetails.typeMismatch) return true;
    
    if (comparisonDetails.arrayComparison) {
      const { expectedLength, lengthDifference } = comparisonDetails.arrayComparison;
      if (expectedLength > 0 && Math.abs(lengthDifference) / expectedLength > 0.1) {
        return true;
      }
    }

    if (comparisonDetails.objectComparison) {
      const { missingKeys } = comparisonDetails.objectComparison;
      if (missingKeys && missingKeys.length > 0) return true;
    }

    return false;
  }

  private assessSystemHealth(
    errorAnalysis: any,
    performanceTrends: any[]
  ): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check error rates
    const criticalErrors = errorAnalysis.errorsBySeverity?.critical || 0;
    const totalErrors = errorAnalysis.totalErrors || 0;
    const errorRate = totalErrors > 0 ? (criticalErrors / totalErrors) : 0;

    if (criticalErrors > 0) {
      issues.push(`${criticalErrors} critical errors detected`);
      recommendations.push('Address critical errors immediately');
    }

    if (totalErrors > 50) {
      issues.push(`High error count: ${totalErrors} total errors`);
      recommendations.push('Review error patterns and implement fixes');
    }

    // Check performance trends
    const degradingOperations = performanceTrends.filter(t => t.trend === 'degrading');
    if (degradingOperations.length > 0) {
      issues.push(`${degradingOperations.length} operations showing performance degradation`);
      recommendations.push('Investigate performance bottlenecks');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical';
    if (criticalErrors > 0 || errorRate > 0.1) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, issues, recommendations };
  }
}

// Singleton instance
export const monitoring = new MonitoringIntegration();

// Convenience functions for easy integration
export const monitorScraping = <T>(
  context: ScrapingContext,
  operation: () => Promise<T>
) => monitoring.monitorScrapingOperation(context, operation);

export const monitorDataProcessing = <T>(
  context: DataProcessingContext,
  operation: () => Promise<T> | T
) => monitoring.monitorDataProcessing(context, operation);

export const validateWithMonitoring = <T>(
  data: T,
  validationType: string,
  validationRules: string[],
  validator: (data: T) => boolean | string[]
) => monitoring.validateWithMonitoring(data, validationType, validationRules, validator);

export const logInconsistency = (
  inconsistencyType: string,
  expectedData: any,
  actualData: any,
  context?: Record<string, any>
) => monitoring.logDataInconsistency(inconsistencyType, expectedData, actualData, context);

// Initialize with default configuration
monitoring.initialize();