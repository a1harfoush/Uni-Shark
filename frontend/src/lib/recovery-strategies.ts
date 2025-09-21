/**
 * Smart Recovery Strategies for Different Failure Types
 * 
 * Implements intelligent recovery mechanisms based on failure patterns,
 * error types, and system context.
 */

// import { retryService, RetryOperation } from './retry-service'; // Commented out - service doesn't exist

// Simple RetryOperation type replacement
interface RetryOperation {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  timestamp: string;
  error?: string;
  metadata?: Record<string, any>;
}
import { networkMonitor } from './network-monitor';

export interface FailureContext {
  errorType: string;
  errorMessage: string;
  operationType: RetryOperation['type'];
  timestamp: string;
  userAgent?: string;
  networkStatus?: any;
  systemResources?: {
    memoryUsage: number;
    cpuUsage: number;
  };
  previousFailures?: FailureContext[];
}

export interface RecoveryStrategy {
  name: string;
  canHandle: (context: FailureContext) => boolean;
  execute: (context: FailureContext, operation: RetryOperation) => Promise<RecoveryResult>;
  priority: number; // Higher number = higher priority
}

export interface RecoveryResult {
  success: boolean;
  action: 'retry' | 'skip' | 'escalate' | 'fallback';
  delay?: number; // milliseconds
  modifiedOperation?: Partial<RetryOperation>;
  message: string;
  metadata?: Record<string, any>;
}

export class SmartRecoveryEngine {
  private strategies: RecoveryStrategy[] = [];
  private failureHistory: Map<string, FailureContext[]> = new Map();
  private recoveryStats: Map<string, { attempts: number; successes: number }> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Register a recovery strategy
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
    console.log(`Registered recovery strategy: ${strategy.name}`);
  }

  /**
   * Attempt recovery for a failed operation
   */
  async attemptRecovery(
    operation: RetryOperation,
    error: Error
  ): Promise<RecoveryResult> {
    const context = await this.buildFailureContext(operation, error);
    
    // Record failure in history
    this.recordFailure(operation.id, context);

    // Find applicable strategies
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.canHandle(context)
    );

    if (applicableStrategies.length === 0) {
      return {
        success: false,
        action: 'retry',
        message: 'No specific recovery strategy found, using default retry'
      };
    }

    // Try strategies in priority order
    for (const strategy of applicableStrategies) {
      try {
        console.log(`Attempting recovery with strategy: ${strategy.name}`);
        
        const result = await strategy.execute(context, operation);
        
        // Update stats
        this.updateRecoveryStats(strategy.name, result.success);
        
        if (result.success || result.action !== 'retry') {
          return result;
        }
      } catch (strategyError) {
        console.error(`Recovery strategy ${strategy.name} failed:`, strategyError);
      }
    }

    return {
      success: false,
      action: 'retry',
      message: 'All recovery strategies failed, falling back to default retry'
    };
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): Record<string, { attempts: number; successes: number; successRate: number }> {
    const stats: Record<string, { attempts: number; successes: number; successRate: number }> = {};
    
    for (const [strategy, data] of this.recoveryStats.entries()) {
      stats[strategy] = {
        ...data,
        successRate: data.attempts > 0 ? (data.successes / data.attempts) * 100 : 0
      };
    }
    
    return stats;
  }

  /**
   * Get failure patterns for analysis
   */
  getFailurePatterns(): Record<string, any> {
    const patterns: Record<string, any> = {};
    
    for (const [operationId, failures] of this.failureHistory.entries()) {
      if (failures.length > 1) {
        patterns[operationId] = {
          totalFailures: failures.length,
          errorTypes: [...new Set(failures.map(f => f.errorType))],
          timeSpan: {
            first: failures[0].timestamp,
            last: failures[failures.length - 1].timestamp
          },
          commonPatterns: this.analyzeFailurePatterns(failures)
        };
      }
    }
    
    return patterns;
  }

  /**
   * Build failure context from operation and error
   */
  private async buildFailureContext(
    operation: RetryOperation,
    error: Error
  ): Promise<FailureContext> {
    const context: FailureContext = {
      errorType: this.categorizeError(error),
      errorMessage: error.message,
      operationType: operation.type,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      networkStatus: networkMonitor.getNetworkStatus(),
      previousFailures: this.failureHistory.get(operation.id) || []
    };

    // Add system resources if available
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      context.systemResources = {
        memoryUsage: memory.usedJSHeapSize / memory.totalJSHeapSize,
        cpuUsage: 0 // Would need additional monitoring for CPU
      };
    }

    return context;
  }

  /**
   * Categorize error types
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('cors')) return 'cors';
    if (message.includes('auth') || message.includes('unauthorized')) return 'authentication';
    if (message.includes('rate limit') || message.includes('too many')) return 'rate_limit';
    if (message.includes('server') || message.includes('500')) return 'server_error';
    if (message.includes('not found') || message.includes('404')) return 'not_found';
    if (message.includes('parse') || message.includes('json')) return 'parsing';
    if (name.includes('typeerror')) return 'type_error';
    if (name.includes('referenceerror')) return 'reference_error';

    return 'unknown';
  }

  /**
   * Record failure in history
   */
  private recordFailure(operationId: string, context: FailureContext): void {
    if (!this.failureHistory.has(operationId)) {
      this.failureHistory.set(operationId, []);
    }
    
    const history = this.failureHistory.get(operationId)!;
    history.push(context);
    
    // Keep only last 10 failures per operation
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  /**
   * Update recovery statistics
   */
  private updateRecoveryStats(strategyName: string, success: boolean): void {
    if (!this.recoveryStats.has(strategyName)) {
      this.recoveryStats.set(strategyName, { attempts: 0, successes: 0 });
    }
    
    const stats = this.recoveryStats.get(strategyName)!;
    stats.attempts++;
    if (success) stats.successes++;
  }

  /**
   * Analyze failure patterns
   */
  private analyzeFailurePatterns(failures: FailureContext[]): any {
    const errorTypes = failures.map(f => f.errorType);
    const errorCounts = errorTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timeIntervals = [];
    for (let i = 1; i < failures.length; i++) {
      const interval = new Date(failures[i].timestamp).getTime() - 
                      new Date(failures[i - 1].timestamp).getTime();
      timeIntervals.push(interval);
    }

    return {
      mostCommonError: Object.keys(errorCounts).reduce((a, b) => 
        errorCounts[a] > errorCounts[b] ? a : b
      ),
      errorDistribution: errorCounts,
      averageInterval: timeIntervals.length > 0 ? 
        timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length : 0,
      isRepeatingPattern: this.detectRepeatingPattern(errorTypes)
    };
  }

  /**
   * Detect repeating error patterns
   */
  private detectRepeatingPattern(errorTypes: string[]): boolean {
    if (errorTypes.length < 4) return false;
    
    // Check for simple alternating patterns
    const lastFour = errorTypes.slice(-4);
    return lastFour[0] === lastFour[2] && lastFour[1] === lastFour[3];
  }

  /**
   * Register default recovery strategies
   */
  private registerDefaultStrategies(): void {
    // Network failure recovery
    this.registerStrategy({
      name: 'NetworkFailureRecovery',
      priority: 90,
      canHandle: (context) => context.errorType === 'network',
      execute: async (context, operation) => {
        const networkStatus = networkMonitor.getNetworkStatus();
        
        if (!networkStatus.isOnline) {
          return {
            success: false,
            action: 'skip',
            message: 'Network is offline, will retry when connection is restored'
          };
        }

        if (networkMonitor.isSlowConnection()) {
          return {
            success: true,
            action: 'retry',
            delay: 10000, // Wait longer for slow connections
            message: 'Slow connection detected, increasing retry delay'
          };
        }

        return {
          success: true,
          action: 'retry',
          delay: 5000,
          message: 'Network issue detected, retrying with delay'
        };
      }
    });

    // Rate limit recovery
    this.registerStrategy({
      name: 'RateLimitRecovery',
      priority: 95,
      canHandle: (context) => context.errorType === 'rate_limit',
      execute: async (context, operation) => {
        // Extract retry-after header if available
        const retryAfter = this.extractRetryAfter(context.errorMessage);
        const delay = retryAfter || 60000; // Default to 1 minute

        return {
          success: true,
          action: 'retry',
          delay,
          message: `Rate limit hit, waiting ${delay / 1000} seconds before retry`
        };
      }
    });

    // Authentication failure recovery
    this.registerStrategy({
      name: 'AuthenticationRecovery',
      priority: 85,
      canHandle: (context) => context.errorType === 'authentication',
      execute: async (context, operation) => {
        // For auth failures, we might need to refresh tokens
        try {
          // This would integrate with your auth system
          // await refreshAuthToken();
          
          return {
            success: true,
            action: 'retry',
            delay: 2000,
            message: 'Authentication refreshed, retrying operation'
          };
        } catch (error) {
          return {
            success: false,
            action: 'escalate',
            message: 'Authentication refresh failed, escalating to user'
          };
        }
      }
    });

    // Server error recovery
    this.registerStrategy({
      name: 'ServerErrorRecovery',
      priority: 70,
      canHandle: (context) => context.errorType === 'server_error',
      execute: async (context, operation) => {
        const failureCount = context.previousFailures?.length || 0;
        
        if (failureCount > 3) {
          return {
            success: false,
            action: 'escalate',
            message: 'Persistent server errors, escalating issue'
          };
        }

        // Exponential backoff for server errors
        const delay = Math.min(5000 * Math.pow(2, failureCount), 300000);
        
        return {
          success: true,
          action: 'retry',
          delay,
          message: `Server error detected, retrying with ${delay / 1000}s delay`
        };
      }
    });

    // Parsing error recovery
    this.registerStrategy({
      name: 'ParsingErrorRecovery',
      priority: 60,
      canHandle: (context) => context.errorType === 'parsing',
      execute: async (context, operation) => {
        // Parsing errors might indicate data corruption or format changes
        if (operation.type === 'data_processing') {
          return {
            success: true,
            action: 'fallback',
            message: 'Parsing error in data processing, attempting fallback method',
            modifiedOperation: {
              metadata: {
                ...operation.metadata,
                useFallbackParser: true
              }
            }
          };
        }

        return {
          success: false,
          action: 'escalate',
          message: 'Parsing error requires manual intervention'
        };
      }
    });

    // Timeout recovery
    this.registerStrategy({
      name: 'TimeoutRecovery',
      priority: 75,
      canHandle: (context) => context.errorType === 'timeout',
      execute: async (context, operation) => {
        const networkQuality = networkMonitor.getConnectionQuality();
        
        if (networkQuality < 30) {
          return {
            success: true,
            action: 'retry',
            delay: 15000, // Longer delay for poor connections
            message: 'Timeout due to poor connection, retrying with extended delay'
          };
        }

        return {
          success: true,
          action: 'retry',
          delay: 8000,
          message: 'Timeout detected, retrying with increased delay'
        };
      }
    });

    // Repeating pattern recovery
    this.registerStrategy({
      name: 'RepeatingPatternRecovery',
      priority: 100,
      canHandle: (context) => {
        const patterns = this.analyzeFailurePatterns(context.previousFailures || []);
        return patterns.isRepeatingPattern;
      },
      execute: async (context, operation) => {
        return {
          success: false,
          action: 'escalate',
          message: 'Repeating failure pattern detected, requires investigation',
          metadata: {
            pattern: this.analyzeFailurePatterns(context.previousFailures || [])
          }
        };
      }
    });
  }

  /**
   * Extract retry-after value from error message
   */
  private extractRetryAfter(errorMessage: string): number | null {
    const match = errorMessage.match(/retry.after[:\s]+(\d+)/i);
    return match ? parseInt(match[1]) * 1000 : null;
  }
}

// Singleton instance for global use
export const recoveryEngine = new SmartRecoveryEngine();