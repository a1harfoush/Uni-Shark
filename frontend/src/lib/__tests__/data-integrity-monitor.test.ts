// /frontend/src/lib/__tests__/data-integrity-monitor.test.ts

import '@testing-library/jest-dom';
import {
  DataIntegrityMonitor,
  createDataIntegrityMonitor,
  assessSystemHealthFromOperations,
  type Operation,
  type MonitoringConfig,
  type DataIntegrityReport,
  type SystemHealth
} from '../data-integrity-monitor';

describe('DataIntegrityMonitor', () => {
  let monitor: DataIntegrityMonitor;
  let mockConfig: Partial<MonitoringConfig>;

  beforeEach(() => {
    mockConfig = {
      maxOperationHistory: 100,
      healthCheckInterval: 1000,
      criticalFailureThreshold: 20,
      warningThreshold: 10,
      performanceThreshold: 2000,
      enableRealTimeMonitoring: false, // Disable for tests
      enableTrendAnalysis: true
    };
    monitor = new DataIntegrityMonitor(mockConfig);
  });

  afterEach(() => {
    monitor.stopRealTimeMonitoring();
  });

  describe('Operation Recording', () => {
    it('should record successful operations correctly', () => {
      const operation = {
        type: 'data_fetch' as const,
        success: true,
        duration: 1000,
        critical: false,
        dataSize: 1024
      };

      monitor.recordOperation(operation);
      const report = monitor.calculateIntegrity();

      expect(report.totalOperations).toBe(1);
      expect(report.successfulOperations).toBe(1);
      expect(report.failedOperations).toBe(0);
      expect(report.successRate).toBe(100);
    });

    it('should record failed operations correctly', () => {
      const operation = {
        type: 'course_expansion' as const,
        success: false,
        duration: 2000,
        critical: true,
        error: 'Course expansion failed'
      };

      monitor.recordOperation(operation);
      const report = monitor.calculateIntegrity();

      expect(report.totalOperations).toBe(1);
      expect(report.successfulOperations).toBe(0);
      expect(report.failedOperations).toBe(1);
      expect(report.successRate).toBe(0);
      expect(report.criticalFailures).toContain('Course expansion failed');
    });

    it('should maintain operation history limit', () => {
      const config = { maxOperationHistory: 5 };
      const limitedMonitor = new DataIntegrityMonitor(config);

      // Add more operations than the limit
      for (let i = 0; i < 10; i++) {
        limitedMonitor.recordOperation({
          type: 'data_fetch',
          success: true,
          duration: 1000,
          critical: false
        });
      }

      const report = limitedMonitor.calculateIntegrity();
      expect(report.totalOperations).toBe(5);
    });
  });

  describe('Integrity Calculation', () => {
    beforeEach(() => {
      // Add mixed operations for testing
      const operations = [
        { type: 'data_fetch' as const, success: true, duration: 1000, critical: false, dataSize: 1024 },
        { type: 'course_expansion' as const, success: false, duration: 3000, critical: true, error: 'Network timeout' },
        { type: 'data_processing' as const, success: true, duration: 500, critical: false, dataSize: 512 },
        { type: 'scrape_operation' as const, success: false, duration: 2000, critical: false, error: 'Parsing error' },
        { type: 'data_merge' as const, success: true, duration: 800, critical: false, dataSize: 256 }
      ];

      operations.forEach(op => monitor.recordOperation(op));
    });

    it('should calculate success rate correctly', () => {
      const report = monitor.calculateIntegrity();
      
      expect(report.totalOperations).toBe(5);
      expect(report.successfulOperations).toBe(3);
      expect(report.failedOperations).toBe(2);
      expect(report.successRate).toBe(60);
    });

    it('should categorize failures correctly', () => {
      const report = monitor.calculateIntegrity();
      
      expect(report.criticalFailures).toContain('Network timeout');
      expect(report.recoverableFailures).toContain('Parsing error');
      expect(report.criticalFailures).toHaveLength(1);
      expect(report.recoverableFailures).toHaveLength(1);
    });

    it('should calculate average operation time', () => {
      const report = monitor.calculateIntegrity();
      
      // (1000 + 3000 + 500 + 2000 + 800) / 5 = 1460
      expect(report.averageOperationTime).toBe(1460);
    });

    it('should calculate total data processed', () => {
      const report = monitor.calculateIntegrity();
      
      // 1024 + 512 + 256 = 1792
      expect(report.dataProcessed).toBe(1792);
    });

    it('should handle empty operation history', () => {
      const emptyMonitor = new DataIntegrityMonitor();
      const report = emptyMonitor.calculateIntegrity();
      
      expect(report.totalOperations).toBe(0);
      expect(report.successRate).toBe(0);
      expect(report.averageOperationTime).toBe(0);
      expect(report.dataProcessed).toBe(0);
    });
  });

  describe('Failure Pattern Analysis', () => {
    beforeEach(() => {
      // Add operations with patterns
      const operations = [
        { type: 'course_expansion' as const, success: false, duration: 1000, critical: true, error: 'Network timeout' },
        { type: 'course_expansion' as const, success: false, duration: 1100, critical: true, error: 'Network timeout' },
        { type: 'data_processing' as const, success: false, duration: 500, critical: false, error: 'Parsing error' },
        { type: 'course_expansion' as const, success: false, duration: 1200, critical: true, error: 'Network timeout' },
        { type: 'data_processing' as const, success: false, duration: 600, critical: false, error: 'Parsing error' }
      ];

      operations.forEach(op => monitor.recordOperation(op));
    });

    it('should identify failure patterns', () => {
      const report = monitor.calculateIntegrity();
      
      expect(report.failurePatterns).toHaveLength(2);
      
      const networkPattern = report.failurePatterns.find(p => p.type.includes('Network timeout'));
      const parsingPattern = report.failurePatterns.find(p => p.type.includes('Parsing error'));
      
      expect(networkPattern?.count).toBe(3);
      expect(networkPattern?.percentage).toBe(60);
      expect(parsingPattern?.count).toBe(2);
      expect(parsingPattern?.percentage).toBe(40);
    });

    it('should calculate pattern severity correctly', () => {
      const report = monitor.calculateIntegrity();
      
      const networkPattern = report.failurePatterns.find(p => p.type.includes('Network timeout'));
      const parsingPattern = report.failurePatterns.find(p => p.type.includes('Parsing error'));
      
      expect(networkPattern?.severity).toBe('critical'); // High percentage + critical operations
      expect(parsingPattern?.severity).toBe('high'); // High percentage but non-critical
    });
  });

  describe('System Health Assessment', () => {
    it('should assess healthy system correctly', () => {
      // Add mostly successful operations
      for (let i = 0; i < 10; i++) {
        monitor.recordOperation({
          type: 'data_fetch',
          success: true,
          duration: 1000,
          critical: false,
          dataSize: 1024
        });
      }

      const health = monitor.assessSystemHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.score).toBeGreaterThan(80);
      expect(health.indicators).toHaveLength(4);
    });

    it('should assess degraded system correctly', () => {
      // Add mixed operations with some failures
      const operations = [
        ...Array(7).fill(null).map(() => ({ type: 'data_fetch' as const, success: true, duration: 1000, critical: false })),
        ...Array(3).fill(null).map(() => ({ type: 'data_fetch' as const, success: false, duration: 2000, critical: false, error: 'Minor error' }))
      ];

      operations.forEach(op => monitor.recordOperation(op));
      const health = monitor.assessSystemHealth();
      
      expect(health.status).toBe('degraded');
      expect(health.score).toBeLessThan(80);
      expect(health.score).toBeGreaterThan(50);
    });

    it('should assess critical system correctly', () => {
      // Add mostly failed operations
      const operations = [
        ...Array(3).fill(null).map(() => ({ type: 'data_fetch' as const, success: true, duration: 1000, critical: false })),
        ...Array(7).fill(null).map(() => ({ type: 'course_expansion' as const, success: false, duration: 3000, critical: true, error: 'Critical error' }))
      ];

      operations.forEach(op => monitor.recordOperation(op));
      const health = monitor.assessSystemHealth();
      
      expect(health.status).toBe('critical');
      expect(health.score).toBeLessThan(50);
    });

    it('should include proper health indicators', () => {
      monitor.recordOperation({
        type: 'data_fetch',
        success: true,
        duration: 1000,
        critical: false,
        dataSize: 1024
      });

      const health = monitor.assessSystemHealth();
      const indicatorNames = health.indicators.map(i => i.name);
      
      expect(indicatorNames).toContain('Success Rate');
      expect(indicatorNames).toContain('Performance');
      expect(indicatorNames).toContain('Critical Failures');
      expect(indicatorNames).toContain('Data Processing');
    });
  });

  describe('Health Recommendations', () => {
    it('should provide critical recommendations for low success rate', () => {
      // Add mostly failed operations
      for (let i = 0; i < 10; i++) {
        monitor.recordOperation({
          type: 'course_expansion',
          success: false,
          duration: 2000,
          critical: true,
          error: 'Authentication failed'
        });
      }

      const report = monitor.calculateIntegrity();
      const recommendations = monitor.generateHealthRecommendations(report);
      
      expect(recommendations.some(r => r.includes('CRITICAL'))).toBe(true);
      expect(recommendations.some(r => r.includes('network connectivity'))).toBe(true);
    });

    it('should provide specific recommendations for failure patterns', () => {
      monitor.recordOperation({
        type: 'course_expansion',
        success: false,
        duration: 2000,
        critical: true,
        error: 'Course expansion failed'
      });

      const report = monitor.calculateIntegrity();
      const recommendations = monitor.generateHealthRecommendations(report);
      
      expect(recommendations.some(r => r.includes('Course expansion'))).toBe(true);
      expect(recommendations.some(r => r.includes('authentication'))).toBe(true);
    });

    it('should provide positive recommendations for healthy systems', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordOperation({
          type: 'data_fetch',
          success: true,
          duration: 1000,
          critical: false,
          dataSize: 1024
        });
      }

      const report = monitor.calculateIntegrity();
      const recommendations = monitor.generateHealthRecommendations(report);
      
      expect(recommendations.some(r => r.includes('operating normally'))).toBe(true);
    });
  });

  describe('Reliability Metrics', () => {
    beforeEach(() => {
      const operations = [
        { type: 'data_fetch' as const, success: true, duration: 1000, critical: false, dataSize: 1024 },
        { type: 'course_expansion' as const, success: false, duration: 3000, critical: true, error: 'Network error' },
        { type: 'data_processing' as const, success: true, duration: 500, critical: false, dataSize: 512 }
      ];

      operations.forEach(op => monitor.recordOperation(op));
    });

    it('should calculate reliability metrics correctly', () => {
      const metrics = monitor.getReliabilityMetrics();
      
      expect(metrics.dataIntegrity).toBeCloseTo(66.67, 1);
      expect(metrics.lastSuccessfulScrape).toBeDefined();
      expect(metrics.failedOperations).toHaveLength(1);
      expect(metrics.systemHealth).toBeDefined();
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics.performanceScore).toBeGreaterThan(0);
    });

    it('should handle no successful operations', () => {
      const failOnlyMonitor = new DataIntegrityMonitor();
      failOnlyMonitor.recordOperation({
        type: 'course_expansion',
        success: false,
        duration: 2000,
        critical: true,
        error: 'Failed'
      });

      const metrics = failOnlyMonitor.getReliabilityMetrics();
      
      expect(metrics.dataIntegrity).toBe(0);
      expect(metrics.lastSuccessfulScrape).toBe('Never');
    });
  });

  describe('Failure Analysis', () => {
    beforeEach(() => {
      // Add operations with time distribution
      const now = new Date();
      const operations = [
        { type: 'course_expansion' as const, success: false, duration: 1000, critical: true, error: 'Error A' },
        { type: 'data_processing' as const, success: false, duration: 500, critical: false, error: 'Error A' },
        { type: 'course_expansion' as const, success: false, duration: 1200, critical: true, error: 'Error B' },
        { type: 'data_fetch' as const, success: false, duration: 800, critical: false, error: 'Error A' }
      ];

      operations.forEach(op => monitor.recordOperation(op));
    });

    it('should provide detailed failure analysis', () => {
      const analysis = monitor.getFailureAnalysis();
      
      expect(analysis.patterns).toHaveLength(4); // Each operation type:error combination creates a pattern
      expect(analysis.topErrors).toHaveLength(2);
      expect(analysis.timeDistribution).toHaveLength(24);
      expect(analysis.criticalityBreakdown.critical).toBe(2);
      expect(analysis.criticalityBreakdown.recoverable).toBe(2);
    });

    it('should identify top errors correctly', () => {
      const analysis = monitor.getFailureAnalysis();
      
      const topError = analysis.topErrors[0];
      expect(topError.error).toBe('Error A');
      expect(topError.count).toBe(3); // Error A appears in course_expansion, data_processing, and data_fetch
      expect(topError.percentage).toBe(75); // 3 out of 4 failures
    });
  });

  describe('Data Persistence', () => {
    it('should export monitoring data correctly', () => {
      monitor.recordOperation({
        type: 'data_fetch',
        success: true,
        duration: 1000,
        critical: false
      });

      const exported = monitor.exportMonitoringData();
      
      expect(exported.operations).toHaveLength(1);
      expect(exported.config).toBeDefined();
      expect(exported.startTime).toBeDefined();
    });

    it('should import monitoring data correctly', () => {
      const importData = {
        operations: [{
          id: 'test-op',
          type: 'data_fetch' as const,
          timestamp: new Date().toISOString(),
          success: true,
          duration: 1000,
          critical: false
        }],
        config: { maxOperationHistory: 50 },
        startTime: new Date().toISOString()
      };

      monitor.importMonitoringData(importData);
      const report = monitor.calculateIntegrity();
      
      expect(report.totalOperations).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    it('should create monitor with createDataIntegrityMonitor', () => {
      const config = { maxOperationHistory: 50 };
      const createdMonitor = createDataIntegrityMonitor(config);
      
      expect(createdMonitor).toBeInstanceOf(DataIntegrityMonitor);
    });

    it('should assess health from operations with utility function', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'data_fetch',
          timestamp: new Date().toISOString(),
          success: true,
          duration: 1000,
          critical: false
        }
      ];

      const health = assessSystemHealthFromOperations(operations);
      
      expect(health.status).toBe('healthy');
      expect(health.score).toBeGreaterThan(80);
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start and stop real-time monitoring', () => {
      const realtimeConfig = { ...mockConfig, enableRealTimeMonitoring: true };
      const realtimeMonitor = new DataIntegrityMonitor(realtimeConfig);
      
      // Should not throw
      expect(() => realtimeMonitor.stopRealTimeMonitoring()).not.toThrow();
      
      realtimeMonitor.stopRealTimeMonitoring();
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations with missing optional fields', () => {
      monitor.recordOperation({
        type: 'data_fetch',
        success: true,
        duration: 1000,
        critical: false
        // Missing dataSize, error, context
      });

      const report = monitor.calculateIntegrity();
      expect(report.totalOperations).toBe(1);
      expect(report.dataProcessed).toBe(0);
    });

    it('should handle very large operation durations', () => {
      monitor.recordOperation({
        type: 'data_fetch',
        success: true,
        duration: Number.MAX_SAFE_INTEGER,
        critical: false
      });

      const report = monitor.calculateIntegrity();
      expect(report.averageOperationTime).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle clearing monitoring data', () => {
      monitor.recordOperation({
        type: 'data_fetch',
        success: true,
        duration: 1000,
        critical: false
      });

      monitor.clearMonitoringData();
      const report = monitor.calculateIntegrity();
      
      expect(report.totalOperations).toBe(0);
    });
  });
});