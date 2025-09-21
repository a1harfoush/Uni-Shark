/**
 * Tests for Smart Recovery Strategies
 */

import { SmartRecoveryEngine, RecoveryStrategy, FailureContext } from '../recovery-strategies';
import { RetryOperation } from '../retry-service';

// Mock network monitor
jest.mock('../network-monitor', () => ({
  networkMonitor: {
    getNetworkStatus: jest.fn(() => ({
      isOnline: true,
      connectionType: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      rtt: 100
    })),
    isSlowConnection: jest.fn(() => false),
    getConnectionQuality: jest.fn(() => 85)
  }
}));

describe('SmartRecoveryEngine', () => {
  let recoveryEngine: SmartRecoveryEngine;
  let mockOperation: RetryOperation;

  beforeEach(() => {
    recoveryEngine = new SmartRecoveryEngine();
    mockOperation = {
      id: 'test-operation',
      type: 'data_fetch',
      operation: jest.fn(),
      timestamp: new Date().toISOString(),
      error: 'Network error',
      retryCount: 1,
      maxRetries: 3,
      nextRetryAt: new Date(Date.now() + 5000).toISOString(),
      priority: 'medium'
    };
  });

  describe('Strategy Registration', () => {
    it('should register custom strategies', () => {
      const customStrategy: RecoveryStrategy = {
        name: 'CustomStrategy',
        priority: 100,
        canHandle: () => true,
        execute: async () => ({ success: true, action: 'retry', message: 'Custom recovery' })
      };

      recoveryEngine.registerStrategy(customStrategy);
      
      // Verify strategy is registered by checking it gets called
      const strategies = recoveryEngine['strategies'];
      expect(strategies).toContainEqual(customStrategy);
    });

    it('should sort strategies by priority', () => {
      const lowPriorityStrategy: RecoveryStrategy = {
        name: 'LowPriority',
        priority: 10,
        canHandle: () => true,
        execute: async () => ({ success: true, action: 'retry', message: 'Low priority' })
      };

      const highPriorityStrategy: RecoveryStrategy = {
        name: 'HighPriority',
        priority: 90,
        canHandle: () => true,
        execute: async () => ({ success: true, action: 'retry', message: 'High priority' })
      };

      recoveryEngine.registerStrategy(lowPriorityStrategy);
      recoveryEngine.registerStrategy(highPriorityStrategy);

      const strategies = recoveryEngine['strategies'];
      const customStrategies = strategies.filter(s => 
        s.name === 'LowPriority' || s.name === 'HighPriority'
      );

      expect(customStrategies[0].name).toBe('HighPriority');
      expect(customStrategies[1].name).toBe('LowPriority');
    });
  });

  describe('Error Categorization', () => {
    it('should categorize network errors', () => {
      const categorizeError = recoveryEngine['categorizeError'].bind(recoveryEngine);
      
      expect(categorizeError(new Error('Network request failed'))).toBe('network');
      expect(categorizeError(new Error('fetch error'))).toBe('network');
    });

    it('should categorize timeout errors', () => {
      const categorizeError = recoveryEngine['categorizeError'].bind(recoveryEngine);
      
      expect(categorizeError(new Error('Request timeout'))).toBe('timeout');
      expect(categorizeError(new Error('Operation timed out'))).toBe('timeout');
    });

    it('should categorize authentication errors', () => {
      const categorizeError = recoveryEngine['categorizeError'].bind(recoveryEngine);
      
      expect(categorizeError(new Error('Unauthorized access'))).toBe('authentication');
      expect(categorizeError(new Error('Auth token expired'))).toBe('authentication');
    });

    it('should categorize rate limit errors', () => {
      const categorizeError = recoveryEngine['categorizeError'].bind(recoveryEngine);
      
      expect(categorizeError(new Error('Rate limit exceeded'))).toBe('rate_limit');
      expect(categorizeError(new Error('Too many requests'))).toBe('rate_limit');
    });

    it('should categorize unknown errors', () => {
      const categorizeError = recoveryEngine['categorizeError'].bind(recoveryEngine);
      
      expect(categorizeError(new Error('Some random error'))).toBe('unknown');
    });
  });

  describe('Failure Context Building', () => {
    it('should build comprehensive failure context', async () => {
      const error = new Error('Network timeout');
      const context = await recoveryEngine['buildFailureContext'](mockOperation, error);

      expect(context.errorType).toBe('timeout');
      expect(context.errorMessage).toBe('Network timeout');
      expect(context.operationType).toBe('data_fetch');
      expect(context.timestamp).toBeDefined();
      expect(context.networkStatus).toBeDefined();
    });

    it('should include previous failures in context', async () => {
      const error = new Error('Test error');
      
      // Record a previous failure
      recoveryEngine['recordFailure']('test-operation', {
        errorType: 'network',
        errorMessage: 'Previous error',
        operationType: 'data_fetch',
        timestamp: new Date().toISOString()
      });

      const context = await recoveryEngine['buildFailureContext'](mockOperation, error);
      expect(context.previousFailures).toHaveLength(1);
    });
  });

  describe('Default Recovery Strategies', () => {
    describe('Network Failure Recovery', () => {
      it('should handle network failures when online', async () => {
        const error = new Error('Network request failed');
        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('retry');
        expect(result.delay).toBeDefined();
        expect(result.message).toContain('Network issue detected');
      });

      it('should skip retry when offline', async () => {
        // Mock offline status
        const { networkMonitor } = require('../network-monitor');
        networkMonitor.getNetworkStatus.mockReturnValue({ isOnline: false });

        const error = new Error('Network request failed');
        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('skip');
        expect(result.message).toContain('Network is offline');
      });

      it('should increase delay for slow connections', async () => {
        // Mock slow connection
        const { networkMonitor } = require('../network-monitor');
        networkMonitor.isSlowConnection.mockReturnValue(true);

        const error = new Error('Network request failed');
        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('retry');
        expect(result.delay).toBe(10000); // Longer delay for slow connections
      });
    });

    describe('Rate Limit Recovery', () => {
      it('should handle rate limit errors', async () => {
        const error = new Error('Rate limit exceeded');
        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('retry');
        expect(result.delay).toBeDefined();
        expect(result.message).toContain('Rate limit hit');
      });

      it('should extract retry-after header', () => {
        const extractRetryAfter = recoveryEngine['extractRetryAfter'].bind(recoveryEngine);
        
        expect(extractRetryAfter('Rate limit exceeded. Retry after: 30')).toBe(30000);
        expect(extractRetryAfter('Too many requests')).toBeNull();
      });
    });

    describe('Server Error Recovery', () => {
      it('should retry server errors with exponential backoff', async () => {
        const error = new Error('Internal server error 500');
        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('retry');
        expect(result.delay).toBeGreaterThan(0);
        expect(result.message).toContain('Server error detected');
      });

      it('should escalate persistent server errors', async () => {
        const error = new Error('Internal server error 500');
        
        // Simulate multiple previous failures
        for (let i = 0; i < 4; i++) {
          recoveryEngine['recordFailure']('test-operation', {
            errorType: 'server_error',
            errorMessage: 'Server error',
            operationType: 'data_fetch',
            timestamp: new Date().toISOString()
          });
        }

        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('escalate');
        expect(result.message).toContain('Persistent server errors');
      });
    });

    describe('Parsing Error Recovery', () => {
      it('should use fallback for data processing parsing errors', async () => {
        const dataProcessingOperation = { ...mockOperation, type: 'data_processing' as const };
        const error = new Error('JSON parse error');
        
        const result = await recoveryEngine.attemptRecovery(dataProcessingOperation, error);

        expect(result.action).toBe('fallback');
        expect(result.modifiedOperation?.metadata?.useFallbackParser).toBe(true);
      });

      it('should escalate parsing errors for other operations', async () => {
        const error = new Error('JSON parse error');
        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('escalate');
        expect(result.message).toContain('manual intervention');
      });
    });

    describe('Timeout Recovery', () => {
      it('should handle timeouts with appropriate delays', async () => {
        const error = new Error('Request timeout');
        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('retry');
        expect(result.delay).toBe(8000);
        expect(result.message).toContain('Timeout detected');
      });

      it('should use longer delay for poor connections', async () => {
        // Mock poor connection quality
        const { networkMonitor } = require('../network-monitor');
        networkMonitor.getConnectionQuality.mockReturnValue(25);

        const error = new Error('Request timeout');
        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('retry');
        expect(result.delay).toBe(15000); // Longer delay for poor connections
      });
    });

    describe('Repeating Pattern Recovery', () => {
      it('should detect and escalate repeating patterns', async () => {
        // Create alternating pattern
        const failures = [
          { errorType: 'network', errorMessage: 'Error 1', operationType: 'data_fetch' as const, timestamp: new Date().toISOString() },
          { errorType: 'timeout', errorMessage: 'Error 2', operationType: 'data_fetch' as const, timestamp: new Date().toISOString() },
          { errorType: 'network', errorMessage: 'Error 3', operationType: 'data_fetch' as const, timestamp: new Date().toISOString() },
          { errorType: 'timeout', errorMessage: 'Error 4', operationType: 'data_fetch' as const, timestamp: new Date().toISOString() }
        ];

        failures.forEach(failure => {
          recoveryEngine['recordFailure']('test-operation', failure);
        });

        const error = new Error('Network error');
        const result = await recoveryEngine.attemptRecovery(mockOperation, error);

        expect(result.action).toBe('escalate');
        expect(result.message).toContain('Repeating failure pattern');
      });
    });
  });

  describe('Failure Pattern Analysis', () => {
    it('should analyze failure patterns correctly', () => {
      const failures: FailureContext[] = [
        { errorType: 'network', errorMessage: 'Error 1', operationType: 'data_fetch', timestamp: '2023-01-01T10:00:00Z' },
        { errorType: 'network', errorMessage: 'Error 2', operationType: 'data_fetch', timestamp: '2023-01-01T10:01:00Z' },
        { errorType: 'timeout', errorMessage: 'Error 3', operationType: 'data_fetch', timestamp: '2023-01-01T10:02:00Z' }
      ];

      const patterns = recoveryEngine['analyzeFailurePatterns'](failures);

      expect(patterns.mostCommonError).toBe('network');
      expect(patterns.errorDistribution.network).toBe(2);
      expect(patterns.errorDistribution.timeout).toBe(1);
      expect(patterns.averageInterval).toBeGreaterThan(0);
    });

    it('should detect repeating patterns', () => {
      const detectRepeatingPattern = recoveryEngine['detectRepeatingPattern'].bind(recoveryEngine);
      
      expect(detectRepeatingPattern(['A', 'B', 'A', 'B'])).toBe(true);
      expect(detectRepeatingPattern(['A', 'B', 'C', 'D'])).toBe(false);
      expect(detectRepeatingPattern(['A', 'B'])).toBe(false); // Too short
    });
  });

  describe('Statistics and Metrics', () => {
    it('should track recovery statistics', async () => {
      const error = new Error('Network error');
      
      // Attempt recovery multiple times
      await recoveryEngine.attemptRecovery(mockOperation, error);
      await recoveryEngine.attemptRecovery(mockOperation, error);

      const stats = recoveryEngine.getRecoveryStats();
      expect(stats.NetworkFailureRecovery).toBeDefined();
      expect(stats.NetworkFailureRecovery.attempts).toBeGreaterThan(0);
    });

    it('should calculate success rates correctly', async () => {
      // Mock a strategy that always succeeds
      const alwaysSuccessStrategy: RecoveryStrategy = {
        name: 'AlwaysSuccess',
        priority: 200,
        canHandle: () => true,
        execute: async () => ({ success: true, action: 'retry', message: 'Always works' })
      };

      recoveryEngine.registerStrategy(alwaysSuccessStrategy);

      const error = new Error('Test error');
      await recoveryEngine.attemptRecovery(mockOperation, error);

      const stats = recoveryEngine.getRecoveryStats();
      expect(stats.AlwaysSuccess.successRate).toBe(100);
    });

    it('should provide failure patterns for analysis', async () => {
      const error = new Error('Network error');
      
      // Create multiple failures for same operation
      await recoveryEngine.attemptRecovery(mockOperation, error);
      await recoveryEngine.attemptRecovery(mockOperation, error);

      const patterns = recoveryEngine.getFailurePatterns();
      expect(patterns['test-operation']).toBeDefined();
      expect(patterns['test-operation'].totalFailures).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no applicable strategies', async () => {
      // Create a strategy that never applies
      const neverAppliesStrategy: RecoveryStrategy = {
        name: 'NeverApplies',
        priority: 1000,
        canHandle: () => false,
        execute: async () => ({ success: false, action: 'retry', message: 'Never called' })
      };

      // Clear existing strategies and add only the non-applicable one
      recoveryEngine['strategies'] = [neverAppliesStrategy];

      const error = new Error('Test error');
      const result = await recoveryEngine.attemptRecovery(mockOperation, error);

      expect(result.success).toBe(false);
      expect(result.action).toBe('retry');
      expect(result.message).toContain('No specific recovery strategy found');
    });

    it('should handle strategy execution errors', async () => {
      const failingStrategy: RecoveryStrategy = {
        name: 'FailingStrategy',
        priority: 1000,
        canHandle: () => true,
        execute: async () => { throw new Error('Strategy failed'); }
      };

      recoveryEngine.registerStrategy(failingStrategy);

      const error = new Error('Test error');
      const result = await recoveryEngine.attemptRecovery(mockOperation, error);

      // Should fall back to default behavior
      expect(result.action).toBe('retry');
    });

    it('should limit failure history size', () => {
      // Add more failures than the limit
      for (let i = 0; i < 15; i++) {
        recoveryEngine['recordFailure']('test-operation', {
          errorType: 'network',
          errorMessage: `Error ${i}`,
          operationType: 'data_fetch',
          timestamp: new Date().toISOString()
        });
      }

      const history = recoveryEngine['failureHistory'].get('test-operation');
      expect(history?.length).toBeLessThanOrEqual(10);
    });
  });
});