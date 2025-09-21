/**
 * Test suite for the Logger system
 */

import { logger, LogLevel, OperationType } from '../logger';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods
const consoleMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

Object.defineProperty(console, 'debug', { value: consoleMock.debug });
Object.defineProperty(console, 'info', { value: consoleMock.info });
Object.defineProperty(console, 'warn', { value: consoleMock.warn });
Object.defineProperty(console, 'error', { value: consoleMock.error });

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger.clearLogs();
  });

  describe('Basic Logging', () => {
    it('should log messages with correct level and operation', () => {
      logger.log(
        LogLevel.INFO,
        OperationType.SCRAPER_OPERATION,
        'Test message',
        { testContext: 'value' }
      );

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].operation).toBe(OperationType.SCRAPER_OPERATION);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].context).toEqual({ testContext: 'value' });
    });

    it('should log errors with stack traces', () => {
      const testError = new Error('Test error');
      
      logger.log(
        LogLevel.ERROR,
        OperationType.DATA_PROCESSING,
        'Error occurred',
        { errorContext: 'test' },
        testError
      );

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].error).toBeDefined();
      expect(logs[0].error?.name).toBe('Error');
      expect(logs[0].error?.message).toBe('Test error');
      expect(logs[0].error?.stack).toBeDefined();
    });

    it('should output to console with correct methods', () => {
      logger.log(LogLevel.DEBUG, OperationType.SCRAPER_OPERATION, 'Debug message');
      logger.log(LogLevel.INFO, OperationType.SCRAPER_OPERATION, 'Info message');
      logger.log(LogLevel.WARN, OperationType.SCRAPER_OPERATION, 'Warn message');
      logger.log(LogLevel.ERROR, OperationType.SCRAPER_OPERATION, 'Error message');

      expect(consoleMock.debug).toHaveBeenCalledTimes(1);
      expect(consoleMock.info).toHaveBeenCalledTimes(1);
      expect(consoleMock.warn).toHaveBeenCalledTimes(1);
      expect(consoleMock.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scraper Operation Logging', () => {
    it('should log successful scraper operations', () => {
      logger.logScraperOperation(
        true,
        'course_expansion',
        1500,
        { courseId: '123', dataSize: 1024 }
      );

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toContain('completed');
      expect(logs[0].context?.success).toBe(true);
      expect(logs[0].performance?.duration).toBe(1500);
    });

    it('should log failed scraper operations with errors', () => {
      const testError = new Error('Scraping failed');
      
      logger.logScraperOperation(
        false,
        'data_fetch',
        2000,
        { url: 'https://example.com' },
        testError
      );

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toContain('failed');
      expect(logs[0].context?.success).toBe(false);
      expect(logs[0].error).toBeDefined();
    });
  });

  describe('Data Processing Logging', () => {
    it('should log data processing operations', () => {
      logger.logDataProcessing(
        'data_transformation',
        100,
        80,
        500,
        ['validation error 1'],
        ['step 1', 'step 2']
      );

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.WARN); // Has validation errors
      expect(logs[0].context?.inputSize).toBe(100);
      expect(logs[0].context?.outputSize).toBe(80);
      expect(logs[0].context?.validationErrors).toEqual(['validation error 1']);
      expect(logs[0].context?.transformationSteps).toEqual(['step 1', 'step 2']);
    });

    it('should calculate data reduction percentage', () => {
      logger.logDataProcessing('compression', 1000, 500, 200);

      const logs = logger.getLogs();
      expect(logs[0].context?.dataReduction).toBe('50.00%');
    });
  });

  describe('Performance Metrics', () => {
    it('should log performance metrics', () => {
      logger.logPerformanceMetric(
        OperationType.SCRAPER_OPERATION,
        'response_time',
        1200,
        { endpoint: '/api/data' }
      );

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].context?.metricName).toBe('response_time');
      expect(logs[0].context?.value).toBe(1200);
    });
  });

  describe('Data Inconsistency Logging', () => {
    it('should log data inconsistencies with comparison details', () => {
      const expectedData = { id: 1, name: 'test' };
      const actualData = { id: 1, name: 'different' };
      
      logger.logDataInconsistency(
        'name_mismatch',
        expectedData,
        actualData,
        { field: 'name', expected: 'test', actual: 'different' }
      );

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].context?.inconsistencyType).toBe('name_mismatch');
      expect(logs[0].context?.expectedData).toEqual(expectedData);
      expect(logs[0].context?.actualData).toEqual(actualData);
      expect(logs[0].context?.dataHash).toBeDefined();
    });
  });

  describe('Error Pattern Tracking', () => {
    it('should track error patterns and frequencies', () => {
      const error1 = new Error('Network timeout');
      const error2 = new Error('Network timeout');
      const error3 = new Error('Different error');

      logger.log(LogLevel.ERROR, OperationType.SCRAPER_OPERATION, 'Error 1', {}, error1);
      logger.log(LogLevel.ERROR, OperationType.SCRAPER_OPERATION, 'Error 2', {}, error2);
      logger.log(LogLevel.ERROR, OperationType.DATA_PROCESSING, 'Error 3', {}, error3);

      const patterns = logger.getErrorPatterns();
      expect(patterns).toHaveLength(2);
      
      const networkPattern = patterns.find(p => p.errorType.includes('Network timeout'));
      expect(networkPattern?.count).toBe(2);
      expect(networkPattern?.frequency).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics Tracking', () => {
    it('should track and update performance metrics', () => {
      // Simulate multiple scraper operations
      logger.logScraperOperation(true, 'op1', 1000, {});
      logger.logScraperOperation(true, 'op2', 2000, {});
      logger.logScraperOperation(false, 'op3', 1500, {}, new Error('Failed'));

      const metrics = logger.getPerformanceMetrics();
      const scraperMetrics = metrics.find(m => m.operationType === OperationType.SCRAPER_OPERATION);
      
      expect(scraperMetrics).toBeDefined();
      expect(scraperMetrics?.totalOperations).toBe(3);
      expect(scraperMetrics?.averageDuration).toBe(1500); // (1000 + 2000 + 1500) / 3
      expect(scraperMetrics?.minDuration).toBe(1000);
      expect(scraperMetrics?.maxDuration).toBe(2000);
      expect(scraperMetrics?.failureRate).toBeCloseTo(0.33, 2); // 1 failure out of 3
    });
  });

  describe('Log Filtering', () => {
    beforeEach(() => {
      logger.log(LogLevel.DEBUG, OperationType.SCRAPER_OPERATION, 'Debug message');
      logger.log(LogLevel.INFO, OperationType.DATA_PROCESSING, 'Info message');
      logger.log(LogLevel.WARN, OperationType.SCRAPER_OPERATION, 'Warn message');
      logger.log(LogLevel.ERROR, OperationType.DATA_VALIDATION, 'Error message');
    });

    it('should filter logs by level', () => {
      const errorLogs = logger.getLogs(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe(LogLevel.ERROR);

      const warnAndAbove = logger.getLogs(LogLevel.WARN);
      expect(warnAndAbove).toHaveLength(2);
    });

    it('should filter logs by operation type', () => {
      const scraperLogs = logger.getLogs(undefined, OperationType.SCRAPER_OPERATION);
      expect(scraperLogs).toHaveLength(2);
      
      const processingLogs = logger.getLogs(undefined, OperationType.DATA_PROCESSING);
      expect(processingLogs).toHaveLength(1);
    });

    it('should limit number of returned logs', () => {
      const limitedLogs = logger.getLogs(undefined, undefined, 2);
      expect(limitedLogs).toHaveLength(2);
    });

    it('should combine filters', () => {
      const filteredLogs = logger.getLogs(LogLevel.WARN, OperationType.SCRAPER_OPERATION, 1);
      expect(filteredLogs).toHaveLength(1);
      expect(filteredLogs[0].level).toBe(LogLevel.WARN);
      expect(filteredLogs[0].operation).toBe(OperationType.SCRAPER_OPERATION);
    });
  });

  describe('Data Persistence', () => {
    it('should persist logs to localStorage', () => {
      logger.log(LogLevel.INFO, OperationType.SCRAPER_OPERATION, 'Test message');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dulms_watcher_logs',
        expect.any(String)
      );
    });

    it('should load persisted logs on initialization', () => {
      const mockLogData = {
        logs: [
          {
            id: 'test-id',
            timestamp: '2023-01-01T00:00:00.000Z',
            level: LogLevel.INFO,
            operation: OperationType.SCRAPER_OPERATION,
            message: 'Persisted message'
          }
        ],
        errorPatterns: [],
        performanceMetrics: []
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLogData));
      
      // Create new logger instance to test loading
      const newLogger = new (logger.constructor as any)();
      const logs = newLogger.getLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Persisted message');
    });
  });

  describe('Log Export', () => {
    it('should export logs in JSON format', () => {
      logger.log(LogLevel.INFO, OperationType.SCRAPER_OPERATION, 'Export test');
      
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(parsed.logs).toHaveLength(1);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.sessionId).toBeDefined();
    });
  });

  describe('Log Maintenance', () => {
    it('should maintain maximum log entries', () => {
      // Create more logs than the maximum
      for (let i = 0; i < 1100; i++) {
        logger.log(LogLevel.INFO, OperationType.SCRAPER_OPERATION, `Message ${i}`);
      }

      const logs = logger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(1000);
    });

    it('should clear all logs', () => {
      logger.log(LogLevel.INFO, OperationType.SCRAPER_OPERATION, 'Test message');
      expect(logger.getLogs()).toHaveLength(1);
      
      logger.clearLogs();
      expect(logger.getLogs()).toHaveLength(0);
      expect(logger.getErrorPatterns()).toHaveLength(0);
      expect(logger.getPerformanceMetrics()).toHaveLength(0);
    });
  });
});