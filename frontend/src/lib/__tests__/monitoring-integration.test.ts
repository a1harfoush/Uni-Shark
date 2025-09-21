/**
 * Test suite for the Monitoring Integration system
 */

import { monitoring, monitorScraping, monitorDataProcessing } from '../monitoring-integration';
import { OperationType, LogLevel } from '../logger';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock all dependencies
jest.mock('../logger', () => ({
  logger: {
    log: jest.fn(),
    logScraperOperation: jest.fn(),
    logDataProcessing: jest.fn(),
    logDataInconsistency: jest.fn(),
    getLogs: jest.fn().mockReturnValue([]),
    exportLogs: jest.fn().mockReturnValue('{}')
  },
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
  },
  OperationType: {
    SCRAPER_OPERATION: 'scraper_operation',
    DATA_PROCESSING: 'data_processing',
    DATA_VALIDATION: 'data_validation',
    PERFORMANCE_METRIC: 'performance_metric'
  }
}));

jest.mock('../performance-monitor', () => ({
  performanceMonitor: {
    startTimer: jest.fn().mockReturnValue('timer-id'),
    endTimer: jest.fn().mockReturnValue(1000),
    setThresholds: jest.fn(),
    startContinuousMonitoring: jest.fn().mockReturnValue(() => {}),
    getPerformanceMetrics: jest.fn().mockReturnValue([]),
    getPerformanceTrends: jest.fn().mockReturnValue([])
  }
}));

jest.mock('../error-tracker', () => ({
  errorTracker: {
    trackError: jest.fn().mockReturnValue('error-id'),
    trackNetworkError: jest.fn().mockReturnValue('network-error-id'),
    trackDataProcessingError: jest.fn().mockReturnValue('processing-error-id'),
    trackValidationError: jest.fn().mockReturnValue('validation-error-id'),
    getErrorAnalysis: jest.fn().mockReturnValue({
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      topErrors: [],
      recentErrors: [],
      patterns: []
    }),
    exportErrors: jest.fn().mockReturnValue('{}')
  }
}));

describe('MonitoringIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      monitoring.initialize();
      
      const { logger } = require('../logger');
      expect(logger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        OperationType.PERFORMANCE_METRIC,
        'Monitoring system initialized',
        expect.objectContaining({
          config: expect.objectContaining({
            enablePerformanceMonitoring: true,
            enableErrorTracking: true,
            enableDetailedLogging: true
          })
        })
      );
    });

    it('should initialize with custom configuration', () => {
      monitoring.initialize({
        enablePerformanceMonitoring: false,
        logLevel: LogLevel.ERROR,
        performanceThresholds: {
          slowOperationMs: 2000,
          memoryLeakMb: 100
        }
      });

      const { performanceMonitor } = require('../performance-monitor');
      expect(performanceMonitor.setThresholds).toHaveBeenCalledWith({
        slowOperationMs: 2000,
        memoryLeakMb: 100
      });
    });

    it('should start continuous monitoring when enabled', () => {
      monitoring.initialize({ enablePerformanceMonitoring: true });

      const { performanceMonitor } = require('../performance-monitor');
      expect(performanceMonitor.startContinuousMonitoring).toHaveBeenCalledWith(60000);
    });
  });

  describe('Scraping Operation Monitoring', () => {
    it('should monitor successful scraping operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ data: 'test', size: 100 });
      const context = {
        operation: 'course_expansion',
        courseId: '123',
        url: 'https://example.com'
      };

      const result = await monitoring.monitorScrapingOperation(context, mockOperation);

      expect(result).toEqual({ data: 'test', size: 100 });
      expect(mockOperation).toHaveBeenCalledTimes(1);

      const { logger } = require('../logger');
      const { performanceMonitor } = require('../performance-monitor');

      expect(performanceMonitor.startTimer).toHaveBeenCalledWith(
        OperationType.SCRAPER_OPERATION,
        context
      );
      expect(performanceMonitor.endTimer).toHaveBeenCalledWith(
        'timer-id',
        expect.objectContaining({ success: true })
      );
      expect(logger.logScraperOperation).toHaveBeenCalledWith(
        true,
        context.operation,
        expect.any(Number),
        expect.objectContaining({ ...context, success: true })
      );
    });

    it('should monitor failed scraping operations', async () => {
      const mockError = new Error('Scraping failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);
      const context = {
        operation: 'data_fetch',
        url: 'https://example.com'
      };

      await expect(
        monitoring.monitorScrapingOperation(context, mockOperation)
      ).rejects.toThrow('Scraping failed');

      const { logger } = require('../logger');
      const { performanceMonitor } = require('../performance-monitor');
      const { errorTracker } = require('../error-tracker');

      expect(errorTracker.trackNetworkError).toHaveBeenCalledWith(
        mockError,
        context.url,
        'GET',
        undefined,
        expect.any(Number)
      );
      expect(performanceMonitor.endTimer).toHaveBeenCalledWith(
        'timer-id',
        expect.objectContaining({ success: false, error: 'Scraping failed' })
      );
      expect(logger.logScraperOperation).toHaveBeenCalledWith(
        false,
        context.operation,
        expect.any(Number),
        expect.objectContaining({ success: false }),
        mockError
      );
    });

    it('should use convenience function for scraping monitoring', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const context = { operation: 'test_scraping' };

      const result = await monitorScraping(context, mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Processing Monitoring', () => {
    it('should monitor successful data processing operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue(['processed', 'data']);
      const context = {
        operation: 'data_transformation',
        inputSize: 1000,
        transformationSteps: ['step1', 'step2']
      };

      const result = await monitoring.monitorDataProcessing(context, mockOperation);

      expect(result).toEqual(['processed', 'data']);
      expect(mockOperation).toHaveBeenCalledTimes(1);

      const { logger } = require('../logger');
      const { performanceMonitor } = require('../performance-monitor');

      expect(performanceMonitor.startTimer).toHaveBeenCalledWith(
        OperationType.DATA_PROCESSING,
        context
      );
      expect(logger.logDataProcessing).toHaveBeenCalledWith(
        context.operation,
        context.inputSize,
        expect.any(Number), // output size
        expect.any(Number), // duration
        [], // no validation errors
        context.transformationSteps
      );
    });

    it('should monitor failed data processing operations', async () => {
      const mockError = new Error('Processing failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);
      const context = {
        operation: 'data_validation',
        inputSize: 500
      };

      await expect(
        monitoring.monitorDataProcessing(context, mockOperation)
      ).rejects.toThrow('Processing failed');

      const { errorTracker } = require('../error-tracker');
      expect(errorTracker.trackDataProcessingError).toHaveBeenCalledWith(
        mockError,
        context.operation,
        { size: context.inputSize },
        undefined
      );
    });

    it('should handle synchronous data processing operations', async () => {
      const mockOperation = jest.fn().mockReturnValue('sync result');
      const context = {
        operation: 'sync_processing',
        inputSize: 200
      };

      const result = await monitoring.monitorDataProcessing(context, mockOperation);

      expect(result).toBe('sync result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should use convenience function for data processing monitoring', async () => {
      const mockOperation = jest.fn().mockResolvedValue('processed');
      const context = { operation: 'test_processing', inputSize: 100 };

      const result = await monitorDataProcessing(context, mockOperation);

      expect(result).toBe('processed');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation Monitoring', () => {
    it('should monitor successful validation', () => {
      const testData = { id: 1, name: 'test' };
      const validator = jest.fn().mockReturnValue(true);

      const result = monitoring.validateWithMonitoring(
        testData,
        'user_validation',
        ['required_id', 'required_name'],
        validator
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(validator).toHaveBeenCalledWith(testData);

      const { logger } = require('../logger');
      expect(logger.log).toHaveBeenCalledWith(
        LogLevel.DEBUG,
        OperationType.DATA_VALIDATION,
        expect.stringContaining('Validation user_validation passed'),
        expect.objectContaining({ isValid: true })
      );
    });

    it('should monitor validation with error array', () => {
      const testData = { id: null, name: '' };
      const validator = jest.fn().mockReturnValue(['ID is required', 'Name is required']);

      const result = monitoring.validateWithMonitoring(
        testData,
        'user_validation',
        ['required_id', 'required_name'],
        validator
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['ID is required', 'Name is required']);

      const { errorTracker } = require('../error-tracker');
      expect(errorTracker.trackValidationError).toHaveBeenCalledWith(
        expect.any(Error),
        'user_validation',
        testData,
        ['required_id', 'required_name']
      );
    });

    it('should handle validation exceptions', () => {
      const testData = { invalid: 'data' };
      const validator = jest.fn().mockImplementation(() => {
        throw new Error('Validation crashed');
      });

      const result = monitoring.validateWithMonitoring(
        testData,
        'crash_validation',
        ['test_rule'],
        validator
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Validation crashed']);

      const { errorTracker } = require('../error-tracker');
      expect(errorTracker.trackValidationError).toHaveBeenCalledWith(
        expect.any(Error),
        'crash_validation',
        testData,
        ['test_rule']
      );
    });
  });

  describe('Data Inconsistency Logging', () => {
    it('should log data inconsistencies', () => {
      const expectedData = { id: 1, name: 'expected' };
      const actualData = { id: 1, name: 'actual' };

      monitoring.logDataInconsistency(
        'name_mismatch',
        expectedData,
        actualData,
        { source: 'test' }
      );

      const { logger } = require('../logger');
      expect(logger.logDataInconsistency).toHaveBeenCalledWith(
        'name_mismatch',
        expectedData,
        actualData,
        expect.objectContaining({ source: 'test' })
      );
    });

    it('should track significant inconsistencies as errors', () => {
      const expectedData = { id: 1, name: 'test' };
      const actualData = 'wrong type'; // Type mismatch is significant

      monitoring.logDataInconsistency(
        'type_mismatch',
        expectedData,
        actualData
      );

      const { errorTracker } = require('../error-tracker');
      expect(errorTracker.trackError).toHaveBeenCalledWith(
        expect.any(Error),
        OperationType.DATA_VALIDATION,
        expect.objectContaining({
          inconsistencyType: 'type_mismatch'
        })
      );
    });
  });

  describe('Monitoring Reports', () => {
    it('should generate comprehensive monitoring report', () => {
      const report = monitoring.getMonitoringReport();

      expect(report).toHaveProperty('logs');
      expect(report).toHaveProperty('errors');
      expect(report).toHaveProperty('performance');
      expect(report).toHaveProperty('systemHealth');
      expect(report.systemHealth).toHaveProperty('status');
      expect(report.systemHealth).toHaveProperty('issues');
      expect(report.systemHealth).toHaveProperty('recommendations');
    });

    it('should export monitoring data', () => {
      const exportData = monitoring.exportMonitoringData();
      const parsed = JSON.parse(exportData);

      expect(parsed).toHaveProperty('logs');
      expect(parsed).toHaveProperty('errors');
      expect(parsed).toHaveProperty('performance');
      expect(parsed).toHaveProperty('systemHealth');
      expect(parsed).toHaveProperty('logExport');
      expect(parsed).toHaveProperty('errorExport');
      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed).toHaveProperty('config');
    });
  });

  describe('System Health Assessment', () => {
    it('should assess healthy system status', () => {
      // Mock healthy system
      const { errorTracker } = require('../error-tracker');
      errorTracker.getErrorAnalysis.mockReturnValue({
        totalErrors: 5,
        errorsBySeverity: { critical: 0, high: 2, medium: 3 }
      });

      const { performanceMonitor } = require('../performance-monitor');
      performanceMonitor.getPerformanceTrends.mockReturnValue([
        { operation: 'test', trend: 'stable', changePercent: 2 }
      ]);

      const report = monitoring.getMonitoringReport();
      expect(report.systemHealth.status).toBe('healthy');
      expect(report.systemHealth.issues).toHaveLength(0);
    });

    it('should assess degraded system status', () => {
      // Mock degraded system
      const { errorTracker } = require('../error-tracker');
      errorTracker.getErrorAnalysis.mockReturnValue({
        totalErrors: 60,
        errorsBySeverity: { critical: 0, high: 20, medium: 40 }
      });

      const { performanceMonitor } = require('../performance-monitor');
      performanceMonitor.getPerformanceTrends.mockReturnValue([
        { operation: 'test', trend: 'degrading', changePercent: 25 }
      ]);

      const report = monitoring.getMonitoringReport();
      expect(report.systemHealth.status).toBe('degraded');
      expect(report.systemHealth.issues.length).toBeGreaterThan(0);
      expect(report.systemHealth.recommendations.length).toBeGreaterThan(0);
    });

    it('should assess critical system status', () => {
      // Mock critical system
      const { errorTracker } = require('../error-tracker');
      errorTracker.getErrorAnalysis.mockReturnValue({
        totalErrors: 20,
        errorsBySeverity: { critical: 5, high: 10, medium: 5 }
      });

      const report = monitoring.getMonitoringReport();
      expect(report.systemHealth.status).toBe('critical');
      expect(report.systemHealth.issues).toContain('5 critical errors detected');
      expect(report.systemHealth.recommendations).toContain('Address critical errors immediately');
    });
  });

  describe('Configuration Management', () => {
    it('should respect logging level configuration', async () => {
      // Clear previous mock calls
      const { logger } = require('../logger');
      logger.log.mockClear();
      
      monitoring.initialize({ logLevel: LogLevel.ERROR });

      const mockOperation = jest.fn().mockResolvedValue('success');
      await monitoring.monitorScrapingOperation(
        { operation: 'test' },
        mockOperation
      );

      // Should have initialization log (which is INFO level) but no operation logs at INFO level
      const infoCalls = logger.log.mock.calls.filter(call => call[0] === LogLevel.INFO);
      // Allow for the initialization log
      expect(infoCalls.length).toBeLessThanOrEqual(1);
      
      // Check that the initialization log is the only INFO log
      if (infoCalls.length === 1) {
        expect(infoCalls[0][2]).toContain('Monitoring system initialized');
      }
    });

    it('should respect monitoring feature toggles', async () => {
      monitoring.initialize({
        enablePerformanceMonitoring: false,
        enableErrorTracking: false,
        enableDetailedLogging: false
      });

      const mockError = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(mockError);

      await expect(
        monitoring.monitorScrapingOperation({ operation: 'test' }, mockOperation)
      ).rejects.toThrow('Test error');

      const { performanceMonitor } = require('../performance-monitor');
      const { errorTracker } = require('../error-tracker');
      const { logger } = require('../logger');

      expect(performanceMonitor.startTimer).not.toHaveBeenCalled();
      expect(errorTracker.trackError).not.toHaveBeenCalled();
      expect(logger.logScraperOperation).not.toHaveBeenCalled();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown monitoring system', () => {
      monitoring.shutdown();

      const { logger } = require('../logger');
      expect(logger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        OperationType.PERFORMANCE_METRIC,
        'Monitoring system shutdown'
      );
    });
  });
});