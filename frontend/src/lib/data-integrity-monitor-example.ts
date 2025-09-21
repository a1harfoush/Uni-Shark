// /frontend/src/lib/data-integrity-monitor-example.ts

/**
 * Example usage of the DataIntegrityMonitor for DULMS Watcher
 * This file demonstrates how to integrate the monitoring system
 * with the existing scraper operations
 */

import {
  DataIntegrityMonitor,
  createDataIntegrityMonitor,
  type Operation,
  type MonitoringConfig
} from './data-integrity-monitor';

/**
 * Example configuration for production use
 */
const productionConfig: Partial<MonitoringConfig> = {
  maxOperationHistory: 500,
  healthCheckInterval: 60000, // 1 minute
  criticalFailureThreshold: 15, // 15% failure rate is critical
  warningThreshold: 5, // 5% failure rate is warning
  performanceThreshold: 3000, // 3 seconds is slow
  enableRealTimeMonitoring: true,
  enableTrendAnalysis: true
};

/**
 * Example integration with DULMS scraper operations
 */
export class DULMSIntegrityMonitor {
  private monitor: DataIntegrityMonitor;

  constructor(config?: Partial<MonitoringConfig>) {
    this.monitor = createDataIntegrityMonitor(config || productionConfig);
  }

  /**
   * Records a course expansion operation
   */
  recordCourseExpansion(success: boolean, duration: number, error?: string, courseData?: any): void {
    this.monitor.recordOperation({
      type: 'course_expansion',
      success,
      duration,
      critical: true, // Course expansion failures are critical
      error,
      context: { courseId: courseData?.id, courseName: courseData?.name }
    });
  }

  /**
   * Records a data fetch operation
   */
  recordDataFetch(success: boolean, duration: number, dataSize?: number, error?: string): void {
    this.monitor.recordOperation({
      type: 'data_fetch',
      success,
      duration,
      critical: false,
      dataSize,
      error
    });
  }

  /**
   * Records a data processing operation
   */
  recordDataProcessing(success: boolean, duration: number, dataSize?: number, error?: string): void {
    this.monitor.recordOperation({
      type: 'data_processing',
      success,
      duration,
      critical: false,
      dataSize,
      error
    });
  }

  /**
   * Records a scrape operation
   */
  recordScrapeOperation(success: boolean, duration: number, error?: string, context?: any): void {
    this.monitor.recordOperation({
      type: 'scrape_operation',
      success,
      duration,
      critical: true, // Scrape operations are critical
      error,
      context
    });
  }

  /**
   * Records a data merge operation
   */
  recordDataMerge(success: boolean, duration: number, dataSize?: number, error?: string): void {
    this.monitor.recordOperation({
      type: 'data_merge',
      success,
      duration,
      critical: false,
      dataSize,
      error
    });
  }

  /**
   * Gets current system health status
   */
  getSystemHealth() {
    return this.monitor.assessSystemHealth();
  }

  /**
   * Gets reliability metrics for dashboard display
   */
  getReliabilityMetrics() {
    return this.monitor.getReliabilityMetrics();
  }

  /**
   * Gets integrity report for the last hour
   */
  getHourlyIntegrityReport() {
    return this.monitor.calculateIntegrity(60);
  }

  /**
   * Gets detailed failure analysis
   */
  getFailureAnalysis() {
    return this.monitor.getFailureAnalysis();
  }

  /**
   * Gets health recommendations
   */
  getHealthRecommendations() {
    const report = this.monitor.calculateIntegrity();
    return this.monitor.generateHealthRecommendations(report);
  }

  /**
   * Exports monitoring data for persistence
   */
  exportData() {
    return this.monitor.exportMonitoringData();
  }

  /**
   * Imports monitoring data from persistence
   */
  importData(data: any) {
    this.monitor.importMonitoringData(data);
  }

  /**
   * Clears all monitoring data
   */
  clearData() {
    this.monitor.clearMonitoringData();
  }
}

/**
 * Example usage in a scraper function
 */
export async function exampleScraperWithMonitoring() {
  const integrityMonitor = new DULMSIntegrityMonitor();

  // Example course expansion
  const startTime = Date.now();
  try {
    // Simulate course expansion logic
    await simulateCourseExpansion();
    
    const duration = Date.now() - startTime;
    integrityMonitor.recordCourseExpansion(true, duration);
    
    console.log('Course expansion successful');
  } catch (error) {
    const duration = Date.now() - startTime;
    integrityMonitor.recordCourseExpansion(false, duration, error instanceof Error ? error.message : 'Unknown error');
    
    console.error('Course expansion failed:', error);
  }

  // Example data fetch
  const fetchStartTime = Date.now();
  try {
    const data = await simulateDataFetch();
    
    const duration = Date.now() - fetchStartTime;
    const dataSize = JSON.stringify(data).length;
    integrityMonitor.recordDataFetch(true, duration, dataSize);
    
    console.log('Data fetch successful, size:', dataSize);
  } catch (error) {
    const duration = Date.now() - fetchStartTime;
    integrityMonitor.recordDataFetch(false, duration, 0, error instanceof Error ? error.message : 'Unknown error');
    
    console.error('Data fetch failed:', error);
  }

  // Get system health after operations
  const health = integrityMonitor.getSystemHealth();
  console.log('System Health:', health.status, 'Score:', health.score);

  // Get recommendations if system is not healthy
  if (health.status !== 'healthy') {
    const recommendations = integrityMonitor.getHealthRecommendations();
    console.log('Health Recommendations:', recommendations);
  }

  // Get reliability metrics for dashboard
  const metrics = integrityMonitor.getReliabilityMetrics();
  console.log('Data Integrity:', metrics.dataIntegrity + '%');
  console.log('Last Successful Scrape:', metrics.lastSuccessfulScrape);
  console.log('System Uptime:', metrics.uptime, 'minutes');
}

/**
 * Example integration with localStorage for persistence
 */
export class PersistentDULMSIntegrityMonitor extends DULMSIntegrityMonitor {
  private storageKey = 'dulms_integrity_monitor_data';

  constructor(config?: Partial<MonitoringConfig>) {
    super(config);
    this.loadFromStorage();
  }

  /**
   * Saves monitoring data to localStorage
   */
  saveToStorage(): void {
    try {
      const data = this.exportData();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save monitoring data to localStorage:', error);
    }
  }

  /**
   * Loads monitoring data from localStorage
   */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.importData(data);
      }
    } catch (error) {
      console.warn('Failed to load monitoring data from localStorage:', error);
    }
  }

  /**
   * Override record methods to auto-save
   */
  recordCourseExpansion(success: boolean, duration: number, error?: string, courseData?: any): void {
    super.recordCourseExpansion(success, duration, error, courseData);
    this.saveToStorage();
  }

  recordDataFetch(success: boolean, duration: number, dataSize?: number, error?: string): void {
    super.recordDataFetch(success, duration, dataSize, error);
    this.saveToStorage();
  }

  recordDataProcessing(success: boolean, duration: number, dataSize?: number, error?: string): void {
    super.recordDataProcessing(success, duration, dataSize, error);
    this.saveToStorage();
  }

  recordScrapeOperation(success: boolean, duration: number, error?: string, context?: any): void {
    super.recordScrapeOperation(success, duration, error, context);
    this.saveToStorage();
  }

  recordDataMerge(success: boolean, duration: number, dataSize?: number, error?: string): void {
    super.recordDataMerge(success, duration, dataSize, error);
    this.saveToStorage();
  }
}

// Simulation functions for example
async function simulateCourseExpansion(): Promise<void> {
  // Simulate some async work
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
  
  // Simulate occasional failures
  if (Math.random() < 0.1) {
    throw new Error('Course expansion failed: Network timeout');
  }
}

async function simulateDataFetch(): Promise<any> {
  // Simulate some async work
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
  
  // Simulate occasional failures
  if (Math.random() < 0.05) {
    throw new Error('Data fetch failed: Authentication error');
  }

  // Return mock data
  return {
    courses: ['Course 1', 'Course 2'],
    quizzes: [{ id: 1, name: 'Quiz 1' }],
    assignments: [{ id: 1, name: 'Assignment 1' }]
  };
}

/**
 * Example React hook for using the integrity monitor
 */
export function useIntegrityMonitor(config?: Partial<MonitoringConfig>) {
  // In a real React component, you'd use useState and useEffect
  const monitor = new PersistentDULMSIntegrityMonitor(config);

  return {
    recordCourseExpansion: monitor.recordCourseExpansion.bind(monitor),
    recordDataFetch: monitor.recordDataFetch.bind(monitor),
    recordDataProcessing: monitor.recordDataProcessing.bind(monitor),
    recordScrapeOperation: monitor.recordScrapeOperation.bind(monitor),
    recordDataMerge: monitor.recordDataMerge.bind(monitor),
    getSystemHealth: monitor.getSystemHealth.bind(monitor),
    getReliabilityMetrics: monitor.getReliabilityMetrics.bind(monitor),
    getHealthRecommendations: monitor.getHealthRecommendations.bind(monitor),
    getFailureAnalysis: monitor.getFailureAnalysis.bind(monitor)
  };
}