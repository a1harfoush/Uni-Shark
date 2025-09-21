/**
 * Tests for Background Retry Service
 */

import { BackgroundRetryService, RetryOperation } from '../retry-service';

// Mock timers
jest.useFakeTimers();

describe('BackgroundRetryService', () => {
  let retryService: BackgroundRetryService;
  let mockOperation: jest.Mock;

  beforeEach(() => {
    retryService = new BackgroundRetryService();
    mockOperation = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    retryService.stop();
    retryService.clearQueue();
  });

  describe('Queue Management', () => {
    it('should add operations to retry queue', () => {
      retryService.addToRetryQueue(
        'test-op-1',
        'data_fetch',
        mockOperation,
        'Network error',
        'high'
      );

      const status = retryService.getQueueStatus();
      expect(status.totalOperations).toBe(1);
      expect(status.operationsByType.data_fetch).toBe(1);
      expect(status.operationsByPriority.high).toBe(1);
    });

    it('should remove operations from retry queue', () => {
      retryService.addToRetryQueue(
        'test-op-1',
        'data_fetch',
        mockOperation,
        'Network error'
      );

      const removed = retryService.removeFromRetryQueue('test-op-1');
      expect(removed).toBe(true);
      expect(retryService.getQueueStatus().totalOperations).toBe(0);
    });

    it('should return false when removing non-existent operation', () => {
      const removed = retryService.removeFromRetryQueue('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear entire queue', () => {
      retryService.addToRetryQueue('op-1', 'data_fetch', mockOperation, 'Error 1');
      retryService.addToRetryQueue('op-2', 'data_processing', mockOperation, 'Error 2');

      retryService.clearQueue();
      expect(retryService.getQueueStatus().totalOperations).toBe(0);
    });
  });

  describe('Service Lifecycle', () => {
    it('should start and stop service', () => {
      expect(retryService['isRunning']).toBe(false);
      
      retryService.start();
      expect(retryService['isRunning']).toBe(true);
      
      retryService.stop();
      expect(retryService['isRunning']).toBe(false);
    });

    it('should auto-start when adding operations', () => {
      expect(retryService['isRunning']).toBe(false);
      
      retryService.addToRetryQueue(
        'test-op',
        'data_fetch',
        mockOperation,
        'Error'
      );
      
      expect(retryService['isRunning']).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should calculate exponential backoff correctly', () => {
      const service = new BackgroundRetryService({
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        jitterFactor: 0
      });

      // Access private method for testing
      const calculateNextRetryTime = service['calculateNextRetryTime'].bind(service);
      
      const retry0 = new Date(calculateNextRetryTime(0)).getTime();
      const retry1 = new Date(calculateNextRetryTime(1)).getTime();
      const retry2 = new Date(calculateNextRetryTime(2)).getTime();

      const now = Date.now();
      
      expect(retry0 - now).toBeCloseTo(1000, -2); // ~1 second
      expect(retry1 - now).toBeCloseTo(2000, -2); // ~2 seconds
      expect(retry2 - now).toBeCloseTo(4000, -2); // ~4 seconds
    });

    it('should respect max delay', () => {
      const service = new BackgroundRetryService({
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 5000,
        jitterFactor: 0
      });

      const calculateNextRetryTime = service['calculateNextRetryTime'].bind(service);
      const retryTime = new Date(calculateNextRetryTime(10)).getTime();
      const now = Date.now();
      
      expect(retryTime - now).toBeLessThanOrEqual(5000);
    });

    it('should get max retries based on operation type', () => {
      const getMaxRetriesForType = retryService['getMaxRetriesForType'].bind(retryService);
      
      expect(getMaxRetriesForType('course_expansion')).toBe(5);
      expect(getMaxRetriesForType('data_fetch')).toBe(3);
      expect(getMaxRetriesForType('data_processing')).toBe(2);
      expect(getMaxRetriesForType('scrape_operation')).toBe(4);
    });
  });

  describe('Operation Processing', () => {
    it('should execute successful retry', async () => {
      const successfulOperation = jest.fn().mockResolvedValue('success');
      const onRetrySuccess = jest.fn();

      const service = new BackgroundRetryService({}, { onRetrySuccess });
      
      service.addToRetryQueue(
        'success-op',
        'data_fetch',
        successfulOperation,
        'Initial error'
      );

      // Manually trigger retry processing
      await service.processImmediately();

      expect(successfulOperation).toHaveBeenCalled();
      expect(onRetrySuccess).toHaveBeenCalled();
      expect(service.getQueueStatus().totalOperations).toBe(0);
    });

    it('should handle failed retry within max attempts', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Still failing'));
      const onRetryFailure = jest.fn();

      const service = new BackgroundRetryService({}, { onRetryFailure });
      
      service.addToRetryQueue(
        'failing-op',
        'data_fetch',
        failingOperation,
        'Initial error'
      );

      await service.processImmediately();

      expect(failingOperation).toHaveBeenCalled();
      expect(onRetryFailure).toHaveBeenCalled();
      expect(service.getQueueStatus().totalOperations).toBe(1); // Still in queue
    });

    it('should remove operation after max retries reached', async () => {
      const alwaysFailingOperation = jest.fn().mockRejectedValue(new Error('Always fails'));
      const onMaxRetriesReached = jest.fn();

      const service = new BackgroundRetryService({}, { onMaxRetriesReached });
      
      service.addToRetryQueue(
        'max-retries-op',
        'data_fetch',
        alwaysFailingOperation,
        'Initial error'
      );

      // Simulate multiple retry attempts
      const operation = service.getOperationDetails('max-retries-op')!;
      operation.retryCount = operation.maxRetries; // Set to max

      await service.processImmediately();

      expect(onMaxRetriesReached).toHaveBeenCalled();
      expect(service.getQueueStatus().totalOperations).toBe(0);
    });
  });

  describe('Priority Handling', () => {
    it('should process operations in priority order', () => {
      retryService.addToRetryQueue('low-op', 'data_fetch', mockOperation, 'Error', 'low');
      retryService.addToRetryQueue('high-op', 'data_fetch', mockOperation, 'Error', 'high');
      retryService.addToRetryQueue('critical-op', 'data_fetch', mockOperation, 'Error', 'critical');

      const readyOperations = retryService['getOperationsReadyForRetry']();
      
      expect(readyOperations[0].id).toBe('critical-op');
      expect(readyOperations[1].id).toBe('high-op');
      expect(readyOperations[2].id).toBe('low-op');
    });
  });

  describe('Event Handling', () => {
    it('should trigger onQueueEmpty when queue becomes empty', async () => {
      const onQueueEmpty = jest.fn();
      const service = new BackgroundRetryService({}, { onQueueEmpty });
      
      // Process empty queue
      await service.processImmediately();
      
      expect(onQueueEmpty).toHaveBeenCalled();
    });

    it('should trigger onRetryStart when retry begins', async () => {
      const onRetryStart = jest.fn();
      const service = new BackgroundRetryService({}, { onRetryStart });
      
      service.addToRetryQueue(
        'start-op',
        'data_fetch',
        jest.fn().mockResolvedValue('success'),
        'Error'
      );

      await service.processImmediately();
      
      expect(onRetryStart).toHaveBeenCalled();
    });
  });

  describe('Operation Details', () => {
    it('should return operation details', () => {
      retryService.addToRetryQueue(
        'detail-op',
        'data_processing',
        mockOperation,
        'Test error',
        'medium',
        { key: 'value' }
      );

      const details = retryService.getOperationDetails('detail-op');
      
      expect(details).toBeTruthy();
      expect(details!.id).toBe('detail-op');
      expect(details!.type).toBe('data_processing');
      expect(details!.error).toBe('Test error');
      expect(details!.priority).toBe('medium');
      expect(details!.metadata).toEqual({ key: 'value' });
    });

    it('should return null for non-existent operation', () => {
      const details = retryService.getOperationDetails('non-existent');
      expect(details).toBeNull();
    });
  });

  describe('Queue Status', () => {
    it('should provide accurate queue status', () => {
      retryService.addToRetryQueue('op1', 'data_fetch', mockOperation, 'Error', 'high');
      retryService.addToRetryQueue('op2', 'data_fetch', mockOperation, 'Error', 'low');
      retryService.addToRetryQueue('op3', 'data_processing', mockOperation, 'Error', 'medium');

      const status = retryService.getQueueStatus();

      expect(status.totalOperations).toBe(3);
      expect(status.activeRetries).toBe(0);
      expect(status.pendingRetries).toBe(3);
      expect(status.operationsByType).toEqual({
        data_fetch: 2,
        data_processing: 1
      });
      expect(status.operationsByPriority).toEqual({
        high: 1,
        low: 1,
        medium: 1
      });
    });
  });
});