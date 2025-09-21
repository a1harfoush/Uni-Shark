// /frontend/src/lib/data-integrity-monitor.ts

/**
 * Comprehensive Data Integrity Monitoring System for DULMS Watcher
 * Tracks operation success rates, calculates real-time integrity metrics,
 * determines system health status, and provides actionable recommendations
 */

import { FailedOperation } from './data-recovery-engine';

export interface Operation {
  id: string;
  type: 'course_expansion' | 'data_fetch' | 'data_processing' | 'scrape_operation' | 'data_merge';
  timestamp: string;
  success: boolean;
  duration: number; // milliseconds
  error?: string;
  critical: boolean;
  dataSize?: number; // bytes
  context?: Record<string, any>;
}

export interface DataIntegrityReport {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number; // 0-100 percentage
  criticalFailures: string[];
  recoverableFailures: string[];
  averageOperationTime: number; // milliseconds
  dataProcessed: number; // total bytes
  timeRange: {
    start: string;
    end: string;
    durationMinutes: number;
  };
  failurePatterns: FailurePattern[];
}

export interface FailurePattern {
  type: string;
  count: number;
  percentage: number;
  firstOccurrence: string;
  lastOccurrence: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  score: number; // 0-100
  indicators: HealthIndicator[];
  recommendations: string[];
  lastAssessment: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface HealthIndicator {
  name: string;
  status: 'good' | 'warning' | 'critical';
  value: number;
  threshold: number;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ReliabilityMetrics {
  dataIntegrity: number; // 0-100 percentage
  lastSuccessfulScrape: string;
  failedOperations: FailedOperation[];
  systemHealth: SystemHealth;
  retryQueue: number; // count of pending retries
  uptime: number; // minutes since last critical failure
  performanceScore: number; // 0-100 based on operation times
}

export interface MonitoringConfig {
  maxOperationHistory: number;
  healthCheckInterval: number; // milliseconds
  criticalFailureThreshold: number; // percentage
  warningThreshold: number; // percentage
  performanceThreshold: number; // milliseconds
  enableRealTimeMonitoring: boolean;
  enableTrendAnalysis: boolean;
}

/**
 * Main Data Integrity Monitor class
 */
export class DataIntegrityMonitor {
  private operations: Operation[] = [];
  private config: MonitoringConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastHealthAssessment: SystemHealth | null = null;
  private startTime: Date = new Date();
  private criticalFailureTime: Date | null = null;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      maxOperationHistory: 1000,
      healthCheckInterval: 30000, // 30 seconds
      criticalFailureThreshold: 20, // 20% failure rate is critical
      warningThreshold: 10, // 10% failure rate is warning
      performanceThreshold: 5000, // 5 seconds is slow
      enableRealTimeMonitoring: true,
      enableTrendAnalysis: true,
      ...config
    };

    if (this.config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }
  }

  /**
   * Records a new operation for monitoring
   */
  recordOperation(operation: Omit<Operation, 'id' | 'timestamp'>): void {
    const fullOperation: Operation = {
      id: this.generateOperationId(),
      timestamp: new Date().toISOString(),
      ...operation
    };

    this.operations.push(fullOperation);

    // Track critical failures for uptime calculation
    if (!operation.success && operation.critical) {
      this.criticalFailureTime = new Date();
    }

    // Maintain operation history limit
    if (this.operations.length > this.config.maxOperationHistory) {
      this.operations = this.operations.slice(-this.config.maxOperationHistory);
    }

    // Trigger immediate health assessment if critical failure
    if (!operation.success && operation.critical) {
      this.assessSystemHealth();
    }
  }

  /**
   * Calculates comprehensive data integrity report
   */
  calculateIntegrity(timeRangeMinutes?: number): DataIntegrityReport {
    const operations = this.getOperationsInTimeRange(timeRangeMinutes);
    
    if (operations.length === 0) {
      return this.getEmptyIntegrityReport();
    }

    const successful = operations.filter(op => op.success);
    const failed = operations.filter(op => !op.success);
    const criticalFailures = failed.filter(op => op.critical);
    const recoverableFailures = failed.filter(op => !op.critical);

    const successRate = (successful.length / operations.length) * 100;
    const averageOperationTime = this.calculateAverageOperationTime(operations);
    const totalDataProcessed = operations.reduce((sum, op) => sum + (op.dataSize || 0), 0);

    const timeRange = this.getTimeRange(operations);
    const failurePatterns = this.analyzeFailurePatterns(failed);

    return {
      totalOperations: operations.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      successRate,
      criticalFailures: criticalFailures.map(op => op.error || 'Unknown error'),
      recoverableFailures: recoverableFailures.map(op => op.error || 'Unknown error'),
      averageOperationTime,
      dataProcessed: totalDataProcessed,
      timeRange,
      failurePatterns
    };
  }

  /**
   * Assesses current system health status
   */
  assessSystemHealth(): SystemHealth {
    const integrityReport = this.calculateIntegrity(60); // Last hour
    const indicators = this.calculateHealthIndicators(integrityReport);
    const recommendations = this.generateHealthRecommendations(integrityReport, indicators);
    
    // Calculate overall health score
    const healthScore = this.calculateHealthScore(indicators);
    
    // Determine health status
    let status: SystemHealth['status'] = 'healthy';
    if (healthScore < 50) status = 'critical';
    else if (healthScore < 80) status = 'degraded';

    // Determine trend
    const trend = this.calculateHealthTrend();

    const health: SystemHealth = {
      status,
      score: healthScore,
      indicators,
      recommendations,
      lastAssessment: new Date().toISOString(),
      trend
    };

    this.lastHealthAssessment = health;
    return health;
  }

  /**
   * Gets current reliability metrics
   */
  getReliabilityMetrics(): ReliabilityMetrics {
    const integrityReport = this.calculateIntegrity();
    const systemHealth = this.lastHealthAssessment || this.assessSystemHealth();
    const lastSuccessfulOp = this.getLastSuccessfulOperation();
    const failedOps = this.operations.filter(op => !op.success);
    
    return {
      dataIntegrity: integrityReport.successRate,
      lastSuccessfulScrape: lastSuccessfulOp?.timestamp || 'Never',
      failedOperations: this.convertToFailedOperations(failedOps),
      systemHealth,
      retryQueue: 0, // This would be provided by DataRecoveryEngine
      uptime: this.calculateUptime(),
      performanceScore: this.calculatePerformanceScore()
    };
  }

  /**
   * Generates actionable health recommendations
   */
  generateHealthRecommendations(
    report: DataIntegrityReport, 
    indicators?: HealthIndicator[]
  ): string[] {
    const recommendations: string[] = [];
    const currentIndicators = indicators || this.calculateHealthIndicators(report);

    // Success rate recommendations
    if (report.successRate < this.config.criticalFailureThreshold) {
      recommendations.push(
        'CRITICAL: System integrity is severely compromised. Immediate intervention required.'
      );
      recommendations.push(
        'Check network connectivity and authentication status immediately.'
      );
      recommendations.push(
        'Consider restarting the scraper service and clearing browser cache.'
      );
    } else if (report.successRate < this.config.warningThreshold) {
      recommendations.push(
        'WARNING: System integrity is below acceptable levels.'
      );
      recommendations.push(
        'Monitor system closely and consider preventive maintenance.'
      );
    }

    // Critical failure recommendations
    if (report.criticalFailures.length > 0) {
      recommendations.push(
        `${report.criticalFailures.length} critical failures detected. Review error logs immediately.`
      );
      
      // Analyze failure patterns for specific recommendations
      const patterns = this.analyzeFailurePatterns(
        this.operations.filter(op => !op.success && op.critical)
      );
      
      patterns.forEach(pattern => {
        if (pattern.type.includes('course_expansion')) {
          recommendations.push(
            'Course expansion failures detected. Check DULMS authentication and course access permissions.'
          );
        }
        if (pattern.type.includes('network') || pattern.type.includes('timeout')) {
          recommendations.push(
            'Network-related failures detected. Check internet connectivity and firewall settings.'
          );
        }
        if (pattern.type.includes('parsing') || pattern.type.includes('data_processing')) {
          recommendations.push(
            'Data processing failures detected. DULMS website structure may have changed.'
          );
        }
      });
    }

    // Performance recommendations
    const performanceIndicator = currentIndicators.find(i => i.name === 'Performance');
    if (performanceIndicator && performanceIndicator.status !== 'good') {
      recommendations.push(
        'System performance is degraded. Consider optimizing scraping intervals or reducing concurrent operations.'
      );
    }

    // Recovery recommendations
    if (report.recoverableFailures.length > 5) {
      recommendations.push(
        'Multiple recoverable failures detected. Enable automatic retry mechanisms.'
      );
    }

    // Data volume recommendations
    if (report.dataProcessed === 0 && report.totalOperations > 0) {
      recommendations.push(
        'No data is being processed despite active operations. Check data extraction logic.'
      );
    }

    // Trend-based recommendations
    if (this.config.enableTrendAnalysis) {
      const trendRecommendations = this.generateTrendBasedRecommendations();
      recommendations.push(...trendRecommendations);
    }

    // Default recommendation if system is healthy
    if (recommendations.length === 0 && report.successRate > 95) {
      recommendations.push('System is operating normally. Continue regular monitoring.');
    }

    return recommendations;
  }

  /**
   * Gets detailed failure analysis
   */
  getFailureAnalysis(timeRangeMinutes?: number): {
    patterns: FailurePattern[];
    topErrors: { error: string; count: number; percentage: number }[];
    timeDistribution: { hour: number; failures: number }[];
    criticalityBreakdown: { critical: number; recoverable: number };
  } {
    const operations = this.getOperationsInTimeRange(timeRangeMinutes);
    const failed = operations.filter(op => !op.success);
    
    const patterns = this.analyzeFailurePatterns(failed);
    const topErrors = this.getTopErrors(failed);
    const timeDistribution = this.getFailureTimeDistribution(failed);
    const criticalityBreakdown = {
      critical: failed.filter(op => op.critical).length,
      recoverable: failed.filter(op => !op.critical).length
    };

    return {
      patterns,
      topErrors,
      timeDistribution,
      criticalityBreakdown
    };
  }

  /**
   * Starts real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.assessSystemHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stops real-time monitoring
   */
  stopRealTimeMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Clears all monitoring data
   */
  clearMonitoringData(): void {
    this.operations = [];
    this.lastHealthAssessment = null;
    this.startTime = new Date();
    this.criticalFailureTime = null;
  }

  /**
   * Exports monitoring data for persistence
   */
  exportMonitoringData(): {
    operations: Operation[];
    config: MonitoringConfig;
    startTime: string;
    criticalFailureTime: string | null;
  } {
    return {
      operations: this.operations,
      config: this.config,
      startTime: this.startTime.toISOString(),
      criticalFailureTime: this.criticalFailureTime?.toISOString() || null
    };
  }

  /**
   * Imports monitoring data from persistence
   */
  importMonitoringData(data: {
    operations: Operation[];
    config?: MonitoringConfig;
    startTime?: string;
    criticalFailureTime?: string | null;
  }): void {
    this.operations = data.operations || [];
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }
    if (data.startTime) {
      this.startTime = new Date(data.startTime);
    }
    if (data.criticalFailureTime) {
      this.criticalFailureTime = new Date(data.criticalFailureTime);
    }
  }

  // Private helper methods

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getOperationsInTimeRange(minutes?: number): Operation[] {
    if (!minutes) return this.operations;

    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.operations.filter(op => new Date(op.timestamp) >= cutoffTime);
  }

  private getEmptyIntegrityReport(): DataIntegrityReport {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      successRate: 0,
      criticalFailures: [],
      recoverableFailures: [],
      averageOperationTime: 0,
      dataProcessed: 0,
      timeRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        durationMinutes: 0
      },
      failurePatterns: []
    };
  }

  private calculateAverageOperationTime(operations: Operation[]): number {
    if (operations.length === 0) return 0;
    const totalTime = operations.reduce((sum, op) => sum + op.duration, 0);
    return Math.round(totalTime / operations.length);
  }

  private getTimeRange(operations: Operation[]): DataIntegrityReport['timeRange'] {
    if (operations.length === 0) {
      const now = new Date().toISOString();
      return { start: now, end: now, durationMinutes: 0 };
    }

    const timestamps = operations.map(op => new Date(op.timestamp));
    const start = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const end = new Date(Math.max(...timestamps.map(t => t.getTime())));
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      durationMinutes
    };
  }

  private analyzeFailurePatterns(failedOperations: Operation[]): FailurePattern[] {
    const patterns = new Map<string, {
      count: number;
      firstOccurrence: string;
      lastOccurrence: string;
      operations: Operation[];
    }>();

    // Group failures by type and error
    failedOperations.forEach(op => {
      const key = `${op.type}:${op.error?.substring(0, 50) || 'unknown'}`;
      
      if (!patterns.has(key)) {
        patterns.set(key, {
          count: 0,
          firstOccurrence: op.timestamp,
          lastOccurrence: op.timestamp,
          operations: []
        });
      }

      const pattern = patterns.get(key)!;
      pattern.count++;
      pattern.operations.push(op);
      
      if (new Date(op.timestamp) < new Date(pattern.firstOccurrence)) {
        pattern.firstOccurrence = op.timestamp;
      }
      if (new Date(op.timestamp) > new Date(pattern.lastOccurrence)) {
        pattern.lastOccurrence = op.timestamp;
      }
    });

    // Convert to FailurePattern objects
    const totalFailures = failedOperations.length;
    return Array.from(patterns.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      percentage: totalFailures > 0 ? (data.count / totalFailures) * 100 : 0,
      firstOccurrence: data.firstOccurrence,
      lastOccurrence: data.lastOccurrence,
      trend: this.calculatePatternTrend(data.operations),
      severity: this.calculatePatternSeverity(data.count, totalFailures, data.operations)
    }));
  }

  private calculatePatternTrend(operations: Operation[]): 'increasing' | 'decreasing' | 'stable' {
    if (operations.length < 3) return 'stable';

    // Sort by timestamp
    const sorted = operations.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Compare first half vs second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstHalfRate = firstHalf.length / (firstHalf.length || 1);
    const secondHalfRate = secondHalf.length / (secondHalf.length || 1);

    if (secondHalfRate > firstHalfRate * 1.2) return 'increasing';
    if (secondHalfRate < firstHalfRate * 0.8) return 'decreasing';
    return 'stable';
  }

  private calculatePatternSeverity(
    count: number, 
    totalFailures: number, 
    operations: Operation[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const percentage = totalFailures > 0 ? (count / totalFailures) * 100 : 0;
    const hasCriticalOps = operations.some(op => op.critical);

    if (hasCriticalOps && percentage > 20) return 'critical';
    if (hasCriticalOps || percentage > 15) return 'high';
    if (percentage > 5) return 'medium';
    return 'low';
  }

  private calculateHealthIndicators(report: DataIntegrityReport): HealthIndicator[] {
    const indicators: HealthIndicator[] = [];

    // Success Rate Indicator
    indicators.push({
      name: 'Success Rate',
      status: report.successRate >= 90 ? 'good' : report.successRate >= 80 ? 'warning' : 'critical',
      value: report.successRate,
      threshold: 90,
      description: `${report.successRate.toFixed(1)}% of operations successful`,
      impact: 'high'
    });

    // Performance Indicator
    const performanceStatus = report.averageOperationTime <= this.config.performanceThreshold ? 'good' :
                            report.averageOperationTime <= this.config.performanceThreshold * 2 ? 'warning' : 'critical';
    
    indicators.push({
      name: 'Performance',
      status: performanceStatus,
      value: report.averageOperationTime,
      threshold: this.config.performanceThreshold,
      description: `Average operation time: ${report.averageOperationTime}ms`,
      impact: 'medium'
    });

    // Critical Failures Indicator
    const criticalFailureRate = report.totalOperations > 0 ? 
      (report.criticalFailures.length / report.totalOperations) * 100 : 0;
    
    indicators.push({
      name: 'Critical Failures',
      status: criticalFailureRate === 0 ? 'good' : criticalFailureRate < 5 ? 'warning' : 'critical',
      value: criticalFailureRate,
      threshold: 5,
      description: `${report.criticalFailures.length} critical failures (${criticalFailureRate.toFixed(1)}%)`,
      impact: 'high'
    });

    // Data Processing Indicator
    const dataProcessingStatus = report.dataProcessed > 0 ? 'good' : 
                               report.totalOperations === 0 ? 'good' : 'critical';
    
    indicators.push({
      name: 'Data Processing',
      status: dataProcessingStatus,
      value: report.dataProcessed,
      threshold: 1,
      description: `${this.formatBytes(report.dataProcessed)} processed`,
      impact: 'medium'
    });

    return indicators;
  }

  private calculateHealthScore(indicators: HealthIndicator[]): number {
    if (indicators.length === 0) return 0;

    const weights = {
      high: 3,
      medium: 2,
      low: 1
    };

    const scores = {
      good: 100,
      warning: 60,
      critical: 20
    };

    let totalScore = 0;
    let totalWeight = 0;

    indicators.forEach(indicator => {
      const weight = weights[indicator.impact];
      const score = scores[indicator.status];
      
      totalScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  private calculateHealthTrend(): 'improving' | 'stable' | 'declining' {
    if (!this.config.enableTrendAnalysis) return 'stable';

    // Compare operations from different time periods without calling assessSystemHealth
    const pastOperations = this.getOperationsInTimeRange(60); // Last hour
    const recentOperations = this.getOperationsInTimeRange(30); // Last 30 minutes

    if (pastOperations.length < 10 || recentOperations.length < 5) {
      return 'stable'; // Not enough data for trend analysis
    }

    const pastSuccessRate = (pastOperations.filter(op => op.success).length / pastOperations.length) * 100;
    const recentSuccessRate = (recentOperations.filter(op => op.success).length / recentOperations.length) * 100;

    if (recentSuccessRate > pastSuccessRate + 5) return 'improving';
    if (recentSuccessRate < pastSuccessRate - 5) return 'declining';
    return 'stable';
  }

  private generateTrendBasedRecommendations(): string[] {
    const recommendations: string[] = [];
    const trend = this.calculateHealthTrend();

    switch (trend) {
      case 'improving':
        recommendations.push('System health is improving. Continue current maintenance practices.');
        break;
      case 'declining':
        recommendations.push('System health is declining. Investigate recent changes and increase monitoring frequency.');
        break;
      case 'stable':
        // No trend-specific recommendations for stable systems
        break;
    }

    return recommendations;
  }

  private getLastSuccessfulOperation(): Operation | null {
    for (let i = this.operations.length - 1; i >= 0; i--) {
      if (this.operations[i].success) {
        return this.operations[i];
      }
    }
    return null;
  }

  private convertToFailedOperations(operations: Operation[]): FailedOperation[] {
    return operations.map(op => ({
      id: op.id,
      type: op.type,
      timestamp: op.timestamp,
      error: op.error || 'Unknown error',
      retryCount: 0,
      maxRetries: 3,
      critical: op.critical
    }));
  }

  private calculateUptime(): number {
    const now = new Date();
    const referenceTime = this.criticalFailureTime || this.startTime;
    return Math.floor((now.getTime() - referenceTime.getTime()) / 60000);
  }

  private calculatePerformanceScore(): number {
    const recentOps = this.getOperationsInTimeRange(30);
    if (recentOps.length === 0) return 100;

    const avgTime = this.calculateAverageOperationTime(recentOps);
    const threshold = this.config.performanceThreshold;

    if (avgTime <= threshold) return 100;
    if (avgTime <= threshold * 2) return 75;
    if (avgTime <= threshold * 3) return 50;
    return 25;
  }

  private getTopErrors(failedOperations: Operation[]): { error: string; count: number; percentage: number }[] {
    const errorCounts = new Map<string, number>();
    
    failedOperations.forEach(op => {
      const error = op.error || 'Unknown error';
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const total = failedOperations.length;
    return Array.from(errorCounts.entries())
      .map(([error, count]) => ({
        error,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 errors
  }

  private getFailureTimeDistribution(failedOperations: Operation[]): { hour: number; failures: number }[] {
    const distribution = new Array(24).fill(0).map((_, hour) => ({ hour, failures: 0 }));
    
    failedOperations.forEach(op => {
      const hour = new Date(op.timestamp).getHours();
      distribution[hour].failures++;
    });

    return distribution;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Utility function to create a DataIntegrityMonitor instance
 */
export function createDataIntegrityMonitor(config?: Partial<MonitoringConfig>): DataIntegrityMonitor {
  return new DataIntegrityMonitor(config);
}

/**
 * Utility function to assess system health from operation data
 */
export function assessSystemHealthFromOperations(
  operations: Operation[],
  config?: Partial<MonitoringConfig>
): SystemHealth {
  const monitor = new DataIntegrityMonitor(config);
  operations.forEach(op => monitor.recordOperation(op));
  return monitor.assessSystemHealth();
}