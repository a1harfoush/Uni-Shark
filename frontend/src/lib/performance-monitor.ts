/**
 * Performance monitoring utility for DULMS Watcher
 * Tracks timing metrics, memory usage, and operation performance
 */

import { logger, OperationType, LogLevel } from './logger';

export interface PerformanceTimer {
  id: string;
  operation: OperationType;
  startTime: number;
  startMemory?: number;
  context?: Record<string, any>;
}

export interface PerformanceSample {
  timestamp: string;
  operation: OperationType;
  duration: number;
  memoryDelta?: number;
  cpuUsage?: number;
  context?: Record<string, any>;
}

export interface PerformanceThresholds {
  slowOperationMs: number;
  memoryLeakMb: number;
  highCpuPercent: number;
}

class PerformanceMonitor {
  private activeTimers: Map<string, PerformanceTimer> = new Map();
  private samples: PerformanceSample[] = [];
  private maxSamples = 500;
  private thresholds: PerformanceThresholds = {
    slowOperationMs: 5000, // 5 seconds
    memoryLeakMb: 50, // 50MB
    highCpuPercent: 80 // 80%
  };

  /**
   * Start timing an operation
   */
  startTimer(
    operation: OperationType,
    context?: Record<string, any>
  ): string {
    const id = this.generateTimerId();
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    const timer: PerformanceTimer = {
      id,
      operation,
      startTime,
      startMemory,
      context
    };

    this.activeTimers.set(id, timer);

    logger.logPerformanceMetric(
      operation,
      'operation_started',
      startTime,
      { timerId: id, ...context }
    );

    return id;
  }

  /**
   * End timing an operation and log performance metrics
   */
  endTimer(timerId: string, additionalContext?: Record<string, any>): number {
    const timer = this.activeTimers.get(timerId);
    if (!timer) {
      logger.log(
        LogLevel.WARN,
        OperationType.PERFORMANCE_METRIC,
        `Timer ${timerId} not found`,
        { timerId }
      );
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    const endMemory = this.getMemoryUsage();
    const memoryDelta = endMemory && timer.startMemory
      ? endMemory - timer.startMemory
      : undefined;

    const sample: PerformanceSample = {
      timestamp: new Date().toISOString(),
      operation: timer.operation,
      duration,
      memoryDelta,
      context: { ...timer.context, ...additionalContext }
    };

    this.addSample(sample);
    this.activeTimers.delete(timerId);

    // Check for performance issues
    this.checkPerformanceThresholds(sample);

    // Log the performance metric
    logger.logPerformanceMetric(
      timer.operation,
      'operation_completed',
      duration,
      {
        timerId,
        memoryDelta,
        ...timer.context,
        ...additionalContext
      }
    );

    return duration;
  }

  /**
   * Measure and log a function's performance
   */
  async measureAsync<T>(
    operation: OperationType,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTimer(operation, context);

    try {
      const result = await fn();
      this.endTimer(timerId, { success: true });
      return result;
    } catch (error) {
      this.endTimer(timerId, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Measure and log a synchronous function's performance
   */
  measure<T>(
    operation: OperationType,
    fn: () => T,
    context?: Record<string, any>
  ): T {
    const timerId = this.startTimer(operation, context);

    try {
      const result = fn();
      this.endTimer(timerId, { success: true });
      return result;
    } catch (error) {
      this.endTimer(timerId, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Log memory usage snapshot
   */
  logMemorySnapshot(context?: Record<string, any>): void {
    const memoryInfo = this.getDetailedMemoryInfo();

    logger.logPerformanceMetric(
      OperationType.PERFORMANCE_METRIC,
      'memory_snapshot',
      memoryInfo.usedJSHeapSize || 0,
      {
        ...memoryInfo,
        ...context
      }
    );
  }

  /**
   * Monitor continuous performance metrics
   */
  startContinuousMonitoring(intervalMs: number = 30000): () => void {
    const intervalId = setInterval(() => {
      this.logMemorySnapshot({ type: 'continuous_monitoring' });
      this.logActiveTimers();
      this.analyzePerformanceTrends();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }

  /**
   * Get performance statistics for an operation type
   */
  getOperationStats(operation: OperationType): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    failureRate: number;
  } {
    const operationSamples = this.samples.filter(s => s.operation === operation);

    if (operationSamples.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        failureRate: 0
      };
    }

    const durations = operationSamples.map(s => s.duration).sort((a, b) => a - b);
    const failures = operationSamples.filter(s =>
      s.context?.success === false
    ).length;

    return {
      count: operationSamples.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      failureRate: failures / operationSamples.length
    };
  }

  /**
   * Get recent performance trends
   */
  getPerformanceTrends(hoursBack: number = 1): {
    operation: OperationType;
    trend: 'improving' | 'degrading' | 'stable';
    changePercent: number;
  }[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const recentSamples = this.samples.filter(s =>
      new Date(s.timestamp) > cutoffTime
    );

    const operationTypes = [...new Set(recentSamples.map(s => s.operation))];

    return operationTypes.map(operation => {
      const samples = recentSamples.filter(s => s.operation === operation);
      if (samples.length < 4) {
        return { operation, trend: 'stable' as const, changePercent: 0 };
      }

      const midpoint = Math.floor(samples.length / 2);
      const firstHalf = samples.slice(0, midpoint);
      const secondHalf = samples.slice(midpoint);

      const firstAvg = firstHalf.reduce((a, b) => a + b.duration, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b.duration, 0) / secondHalf.length;

      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

      let trend: 'improving' | 'degrading' | 'stable';
      if (Math.abs(changePercent) < 10) {
        trend = 'stable';
      } else if (changePercent > 0) {
        trend = 'degrading';
      } else {
        trend = 'improving';
      }

      return { operation, trend, changePercent };
    });
  }

  private generateTimerId(): string {
    return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory?.usedJSHeapSize;
    }
    return undefined;
  }

  private getDetailedMemoryInfo(): Record<string, number> {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory?.usedJSHeapSize || 0,
        totalJSHeapSize: memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0
      };
    }
    return {};
  }

  private addSample(sample: PerformanceSample): void {
    this.samples.push(sample);

    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(-this.maxSamples);
    }
  }

  private checkPerformanceThresholds(sample: PerformanceSample): void {
    // Check for slow operations
    if (sample.duration > this.thresholds.slowOperationMs) {
      logger.log(
        LogLevel.WARN,
        OperationType.PERFORMANCE_METRIC,
        `Slow operation detected: ${sample.operation} took ${sample.duration.toFixed(2)}ms`,
        {
          operation: sample.operation,
          duration: sample.duration,
          threshold: this.thresholds.slowOperationMs,
          context: sample.context
        }
      );
    }

    // Check for memory leaks
    if (sample.memoryDelta && sample.memoryDelta > this.thresholds.memoryLeakMb * 1024 * 1024) {
      logger.log(
        LogLevel.WARN,
        OperationType.PERFORMANCE_METRIC,
        `Potential memory leak detected: ${sample.operation} increased memory by ${(sample.memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        {
          operation: sample.operation,
          memoryDelta: sample.memoryDelta,
          threshold: this.thresholds.memoryLeakMb,
          context: sample.context
        }
      );
    }
  }

  private logActiveTimers(): void {
    if (this.activeTimers.size > 0) {
      const activeOperations = Array.from(this.activeTimers.values()).map(timer => ({
        id: timer.id,
        operation: timer.operation,
        runningTime: performance.now() - timer.startTime,
        context: timer.context
      }));

      logger.logPerformanceMetric(
        OperationType.PERFORMANCE_METRIC,
        'active_timers',
        this.activeTimers.size,
        { activeOperations }
      );
    }
  }

  private analyzePerformanceTrends(): void {
    const trends = this.getPerformanceTrends(1);
    const degradingOperations = trends.filter(t => t.trend === 'degrading');

    if (degradingOperations.length > 0) {
      logger.log(
        LogLevel.WARN,
        OperationType.PERFORMANCE_METRIC,
        `Performance degradation detected in ${degradingOperations.length} operations`,
        { degradingOperations }
      );
    }
  }

  // Public getters
  getSamples(): PerformanceSample[] {
    return [...this.samples];
  }

  getActiveTimers(): PerformanceTimer[] {
    return Array.from(this.activeTimers.values());
  }

  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  clearSamples(): void {
    this.samples = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const startTimer = (operation: OperationType, context?: Record<string, any>) =>
  performanceMonitor.startTimer(operation, context);

export const endTimer = (timerId: string, context?: Record<string, any>) =>
  performanceMonitor.endTimer(timerId, context);

export const measureAsync = <T>(
  operation: OperationType,
  fn: () => Promise<T>,
  context?: Record<string, any>
) => performanceMonitor.measureAsync(operation, fn, context);

export const measure = <T>(
  operation: OperationType,
  fn: () => T,
  context?: Record<string, any>
) => performanceMonitor.measure(operation, fn, context);