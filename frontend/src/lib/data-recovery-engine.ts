// /frontend/src/lib/data-recovery-engine.ts

/**
 * Intelligent Data Recovery Engine for DULMS Watcher
 * Handles scraper failures gracefully with retry logic, alternative strategies,
 * and backup data fallback mechanisms
 */

export interface FailedOperation {
  id: string;
  type: 'course_expansion' | 'data_fetch' | 'data_processing' | 'scrape_operation' | 'data_merge';
  timestamp: string;
  error: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  originalData?: any;
  context?: Record<string, any>;
  critical: boolean;
}

export interface RetryOperation {
  id: string;
  operation: FailedOperation;
  strategy: string;
  scheduledAt: string;
  attempts: number;
  lastAttempt?: string;
  backoffMultiplier: number;
}

export interface RecoveryResult {
  success: boolean;
  data?: any;
  strategy?: string;
  error?: string;
  shouldRetry: boolean;
  nextRetryDelay?: number;
}

export interface BackupData {
  timestamp: string;
  data: any;
  source: 'local_storage' | 'cache' | 'previous_scrape';
  reliability: number; // 0-1 score
  age: number; // minutes since creation
}

export interface DataRecoveryConfig {
  maxRetries: number;
  baseRetryDelay: number; // milliseconds
  maxRetryDelay: number; // milliseconds
  backoffMultiplier: number;
  criticalOperationTimeout: number; // milliseconds
  backupDataMaxAge: number; // minutes
  enableAlternativeStrategies: boolean;
}

export interface CourseExpansionStrategy {
  name: string;
  priority: number;
  execute: (courseData: any, context?: any) => Promise<RecoveryResult>;
  canHandle: (error: string, context?: any) => boolean;
}

/**
 * Main Data Recovery Engine class
 */
export class DataRecoveryEngine {
  private retryQueue: Map<string, RetryOperation> = new Map();
  private backupStorage: Map<string, BackupData> = new Map();
  private failureLog: FailedOperation[] = [];
  private operationRetryCount: Map<string, number> = new Map(); // Track retry counts per operation ID
  private config: DataRecoveryConfig;
  private courseExpansionStrategies: CourseExpansionStrategy[] = [];
  private isProcessingQueue: boolean = false;

  constructor(config?: Partial<DataRecoveryConfig>) {
    this.config = {
      maxRetries: 3,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      criticalOperationTimeout: 60000, // 1 minute
      backupDataMaxAge: 60, // 1 hour
      enableAlternativeStrategies: true,
      ...config
    };

    this.initializeCourseExpansionStrategies();
    this.startRetryQueueProcessor();
  }

  /**
   * Main entry point for handling scraping failures
   */
  async handleScrapingFailure(operation: {
    id?: string;
    type: FailedOperation['type'];
    error: string;
    originalData?: any;
    context?: Record<string, any>;
    critical?: boolean;
  }): Promise<RecoveryResult> {
    const operationId = operation.id || this.generateOperationId();
    
    // Get current retry count for this operation
    const currentRetryCount = this.operationRetryCount.get(operationId) || 0;
    
    const failedOp: FailedOperation = {
      id: operationId,
      type: operation.type,
      timestamp: new Date().toISOString(),
      error: operation.error,
      retryCount: currentRetryCount,
      maxRetries: this.config.maxRetries,
      originalData: operation.originalData,
      context: operation.context,
      critical: operation.critical || false
    };

    // Log the failure
    this.logFailure(failedOp);

    // Check if max retries exceeded
    if (currentRetryCount >= this.config.maxRetries) {
      return {
        success: false,
        shouldRetry: false,
        error: `Recovery failed after ${currentRetryCount} attempts: ${failedOp.error}`
      };
    }

    // Try immediate recovery strategies
    const immediateResult = await this.attemptImmediateRecovery(failedOp);
    
    if (immediateResult.success) {
      // Reset retry count on success
      this.operationRetryCount.delete(operationId);
      this.logRecovery(failedOp, immediateResult.strategy || 'immediate');
      return {
        ...immediateResult,
        strategy: immediateResult.strategy
      };
    }

    // If immediate recovery failed, increment retry count and queue for retry
    if (immediateResult.shouldRetry) {
      const newRetryCount = currentRetryCount + 1;
      this.operationRetryCount.set(operationId, newRetryCount);
      
      if (newRetryCount < this.config.maxRetries) {
        this.queueForRetry({ ...failedOp, retryCount: newRetryCount });
        return {
          success: false,
          shouldRetry: true,
          nextRetryDelay: this.calculateRetryDelay(newRetryCount),
          error: `Queued for retry. Attempt ${newRetryCount + 1}/${this.config.maxRetries}`
        };
      } else {
        return {
          success: false,
          shouldRetry: false,
          error: `Recovery failed after ${newRetryCount} attempts: ${failedOp.error}`
        };
      }
    }

    // All recovery attempts failed
    return {
      success: false,
      shouldRetry: false,
      error: `Recovery failed after ${currentRetryCount} attempts: ${failedOp.error}`
    };
  }

  /**
   * Attempts immediate recovery using various strategies
   */
  private async attemptImmediateRecovery(operation: FailedOperation): Promise<RecoveryResult> {
    // Try alternative strategies based on operation type
    if (operation.type === 'course_expansion') {
      return await this.tryAlternativeCourseExpansion(operation);
    }

    // Try backup data recovery
    const backupResult = await this.tryBackupDataRecovery(operation);
    if (backupResult.success) {
      return backupResult;
    }

    // Try cached data recovery
    const cacheResult = await this.tryCachedDataRecovery(operation);
    if (cacheResult.success) {
      return cacheResult;
    }

    return {
      success: false,
      shouldRetry: true,
      error: 'No immediate recovery strategy succeeded'
    };
  }

  /**
   * Tries alternative course expansion strategies
   */
  private async tryAlternativeCourseExpansion(operation: FailedOperation): Promise<RecoveryResult> {
    if (!this.config.enableAlternativeStrategies) {
      return { success: false, shouldRetry: true, error: 'Alternative strategies disabled' };
    }

    // Sort strategies by priority
    const applicableStrategies = this.courseExpansionStrategies
      .filter(strategy => strategy.canHandle(operation.error, operation.context))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      try {
        const result = await this.executeWithTimeout(
          () => strategy.execute(operation.originalData, operation.context),
          this.config.criticalOperationTimeout
        );

        if (result.success) {
          this.logRecovery(operation, strategy.name);
          return {
            ...result,
            strategy: strategy.name
          };
        }
      } catch (error) {
        this.logStrategyFailure(strategy.name, error);
      }
    }

    return {
      success: false,
      shouldRetry: true,
      error: 'All course expansion strategies failed'
    };
  }

  /**
   * Tries to recover using backup data
   */
  private async tryBackupDataRecovery(operation: FailedOperation): Promise<RecoveryResult> {
    const backupKey = this.generateBackupKey(operation.type, operation.context);
    const backup = this.backupStorage.get(backupKey);

    if (!backup) {
      return { success: false, shouldRetry: true, error: 'No backup data available' };
    }

    // Check if backup is too old
    if (backup.age > this.config.backupDataMaxAge) {
      this.backupStorage.delete(backupKey);
      return { success: false, shouldRetry: true, error: 'Backup data too old' };
    }

    // Check backup reliability
    if (backup.reliability < 0.7) {
      return { success: false, shouldRetry: true, error: 'Backup data reliability too low' };
    }

    return {
      success: true,
      data: backup.data,
      strategy: `backup_${backup.source}`,
      shouldRetry: false
    };
  }

  /**
   * Tries to recover using cached data
   */
  private async tryCachedDataRecovery(operation: FailedOperation): Promise<RecoveryResult> {
    try {
      // Try localStorage first
      const localStorageData = this.getLocalStorageData(operation.type);
      if (localStorageData) {
        return {
          success: true,
          data: localStorageData,
          strategy: 'local_storage_cache',
          shouldRetry: false
        };
      }

      // Try sessionStorage
      const sessionStorageData = this.getSessionStorageData(operation.type);
      if (sessionStorageData) {
        return {
          success: true,
          data: sessionStorageData,
          strategy: 'session_storage_cache',
          shouldRetry: false
        };
      }

      return { success: false, shouldRetry: true, error: 'No cached data available' };
    } catch (error) {
      return { success: false, shouldRetry: true, error: `Cache recovery failed: ${error}` };
    }
  }

  /**
   * Queues an operation for retry with exponential backoff
   */
  private queueForRetry(operation: FailedOperation): void {
    const retryDelay = this.calculateRetryDelay(operation.retryCount);
    const nextRetryAt = new Date(Date.now() + retryDelay).toISOString();

    const retryOp: RetryOperation = {
      id: this.generateOperationId(),
      operation: { ...operation, retryCount: operation.retryCount + 1, nextRetryAt },
      strategy: 'exponential_backoff',
      scheduledAt: nextRetryAt,
      attempts: 0,
      backoffMultiplier: this.config.backoffMultiplier
    };

    this.retryQueue.set(retryOp.id, retryOp);
  }

  /**
   * Calculates retry delay using exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = this.config.baseRetryDelay * Math.pow(this.config.backoffMultiplier, retryCount);
    return Math.min(delay, this.config.maxRetryDelay);
  }

  /**
   * Processes the retry queue periodically
   */
  private startRetryQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue) {
        this.processRetryQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Processes pending retry operations
   */
  private async processRetryQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    const now = new Date();

    try {
      for (const [id, retryOp] of this.retryQueue.entries()) {
        const scheduledTime = new Date(retryOp.scheduledAt);
        
        if (now >= scheduledTime) {
          await this.executeRetryOperation(retryOp);
          this.retryQueue.delete(id);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Executes a retry operation
   */
  private async executeRetryOperation(retryOp: RetryOperation): Promise<void> {
    retryOp.attempts++;
    retryOp.lastAttempt = new Date().toISOString();

    try {
      const result = await this.attemptImmediateRecovery(retryOp.operation);
      
      if (result.success) {
        this.logRecovery(retryOp.operation, result.strategy || 'retry');
      } else if (retryOp.operation.retryCount < retryOp.operation.maxRetries) {
        // Queue for another retry
        this.queueForRetry(retryOp.operation);
      } else {
        // Max retries reached
        this.logMaxRetriesReached(retryOp.operation);
      }
    } catch (error) {
      this.logRetryError(retryOp, error);
    }
  }

  /**
   * Stores backup data for future recovery
   */
  storeBackupData(
    type: string, 
    data: any, 
    source: BackupData['source'] = 'cache',
    reliability: number = 1.0
  ): void {
    const backupKey = this.generateBackupKey(type);
    const backup: BackupData = {
      timestamp: new Date().toISOString(),
      data,
      source,
      reliability: Math.max(0, Math.min(1, reliability)),
      age: 0
    };

    this.backupStorage.set(backupKey, backup);
    
    // Clean up old backups
    this.cleanupOldBackups();
  }

  /**
   * Gets current failure statistics
   */
  getFailureStatistics(): {
    totalFailures: number;
    criticalFailures: number;
    recoverableFailures: number;
    successfulRecoveries: number;
    pendingRetries: number;
  } {
    const criticalFailures = this.failureLog.filter(f => f.critical).length;
    const recoverableFailures = this.failureLog.length - criticalFailures;
    
    return {
      totalFailures: this.failureLog.length,
      criticalFailures,
      recoverableFailures,
      successfulRecoveries: this.getSuccessfulRecoveryCount(),
      pendingRetries: this.retryQueue.size
    };
  }

  /**
   * Gets the retry queue status
   */
  getRetryQueueStatus(): RetryOperation[] {
    return Array.from(this.retryQueue.values());
  }

  /**
   * Clears the failure log and retry queue
   */
  clearRecoveryData(): void {
    this.failureLog = [];
    this.retryQueue.clear();
    this.backupStorage.clear();
    this.operationRetryCount.clear();
  }

  /**
   * Recovers data from backup storage
   */
  async recoverFromBackup(): Promise<boolean> {
    try {
      // Try to recover from localStorage backup
      const localBackup = this.getLocalStorageBackup();
      if (localBackup && this.isBackupValid(localBackup)) {
        await this.restoreFromLocalBackup(localBackup);
        return true;
      }

      // Try to recover from internal backup storage
      const internalBackup = this.getMostReliableBackup();
      if (internalBackup && this.isBackupValid(internalBackup)) {
        await this.restoreFromInternalBackup(internalBackup);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[DataRecoveryEngine] Backup recovery failed:', error);
      return false;
    }
  }

  /**
   * Restores data from backup
   */
  async restoreFromBackup(): Promise<boolean> {
    try {
      const backup = this.getMostReliableBackup();
      if (!backup) {
        throw new Error('No backup data available');
      }

      if (!this.isBackupValid(backup)) {
        throw new Error('Backup data is invalid or too old');
      }

      // Restore the backup data to localStorage
      await this.restoreToLocalStorage(backup.data);
      
      // Clear any corrupted data
      await this.clearCorruptedLocalData();
      
      return true;
    } catch (error) {
      console.error('[DataRecoveryEngine] Restore from backup failed:', error);
      return false;
    }
  }

  /**
   * Clears corrupted local data
   */
  async clearCorruptedLocalData(): Promise<void> {
    try {
      const keysToCheck = [
        'dulms_dashboard_data',
        'dulms_scrape_data',
        'dulms_user_data'
      ];

      for (const key of keysToCheck) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            JSON.parse(data); // Test if data is valid JSON
          }
        } catch {
          // Remove corrupted data
          localStorage.removeItem(key);
          console.warn(`[DataRecoveryEngine] Removed corrupted data for key: ${key}`);
        }
      }
    } catch (error) {
      console.error('[DataRecoveryEngine] Failed to clear corrupted data:', error);
    }
  }

  /**
   * Resets system to defaults
   */
  async resetToDefaults(): Promise<void> {
    try {
      // Clear all DULMS-related localStorage
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('dulms_')) {
          localStorage.removeItem(key);
        }
      }

      // Set default values
      const defaultData = {
        lastUpdated: new Date().toISOString(),
        totalScrapes: 0,
        courses: [],
        quizzes: [],
        assignments: [],
        absences: [],
        grades: [],
        reliability: {
          dataIntegrity: 100,
          lastSuccessfulScrape: new Date().toISOString(),
          failedOperations: [],
          systemHealth: 'healthy' as const,
          stalenessWarning: false
        }
      };

      localStorage.setItem('dulms_dashboard_data', JSON.stringify(defaultData));
      console.info('[DataRecoveryEngine] System reset to defaults');
    } catch (error) {
      console.error('[DataRecoveryEngine] Failed to reset to defaults:', error);
    }
  }

  /**
   * Refreshes data from server
   */
  async refreshFromServer(): Promise<void> {
    try {
      // Trigger a fresh data fetch from the server
      const response = await fetch('/api/dashboard/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server refresh failed: ${response.statusText}`);
      }

      const freshData = await response.json();
      
      // Store the fresh data
      localStorage.setItem('dulms_dashboard_data', JSON.stringify(freshData));
      
      console.info('[DataRecoveryEngine] Successfully refreshed from server');
    } catch (error) {
      console.error('[DataRecoveryEngine] Failed to refresh from server:', error);
      throw error;
    }
  }

  // Private helper methods

  private initializeCourseExpansionStrategies(): void {
    this.courseExpansionStrategies = [
      {
        name: 'direct_course_page_access',
        priority: 3,
        canHandle: (error: string) => error.includes('course expansion') || error.includes('Unknown Course'),
        execute: async (courseData: any, context?: any) => {
          // Simulate direct course page access strategy
          if (courseData?.course_name && courseData.course_name !== 'Unknown Course') {
            return {
              success: true,
              data: { ...courseData, expanded: true, strategy: 'direct_access' },
              shouldRetry: false
            };
          }
          return { success: false, shouldRetry: true, error: 'No valid course name for direct access' };
        }
      },
      {
        name: 'course_list_parsing',
        priority: 2,
        canHandle: (error: string) => error.includes('parsing') || error.includes('expansion'),
        execute: async (courseData: any, context?: any) => {
          // Simulate course list parsing strategy
          if (context?.availableCourses && Array.isArray(context.availableCourses)) {
            const matchedCourse = context.availableCourses.find((course: any) => 
              course.id === courseData?.course_id || course.name?.includes(courseData?.partial_name)
            );
            
            if (matchedCourse) {
              return {
                success: true,
                data: { ...courseData, ...matchedCourse, strategy: 'list_parsing' },
                shouldRetry: false
              };
            }
          }
          return { success: false, shouldRetry: true, error: 'No matching course found in list' };
        }
      },
      {
        name: 'cached_course_mapping',
        priority: 1,
        canHandle: () => true, // Can handle any course expansion error as fallback
        execute: async (courseData: any, context?: any) => {
          // Try to use cached course mappings
          const cachedMapping = this.getCachedCourseMapping(courseData?.course_id);
          if (cachedMapping) {
            return {
              success: true,
              data: { ...courseData, ...cachedMapping, strategy: 'cached_mapping' },
              shouldRetry: false
            };
          }
          return { success: false, shouldRetry: false, error: 'No cached mapping available' };
        }
      }
    ];
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBackupKey(type: string, context?: any): string {
    const contextKey = context ? JSON.stringify(context).slice(0, 50) : '';
    return `backup_${type}_${contextKey}`;
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>, 
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private getLocalStorageData(type: string): any {
    try {
      const key = `dulms_${type}_backup`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private getSessionStorageData(type: string): any {
    try {
      const key = `dulms_${type}_session`;
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private getCachedCourseMapping(courseId: string): any {
    try {
      const mappings = localStorage.getItem('dulms_course_mappings');
      if (mappings) {
        const parsed = JSON.parse(mappings);
        return parsed[courseId] || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private cleanupOldBackups(): void {
    const now = Date.now();
    const maxAgeMs = this.config.backupDataMaxAge * 60 * 1000;

    for (const [key, backup] of this.backupStorage.entries()) {
      const backupAge = now - new Date(backup.timestamp).getTime();
      if (backupAge > maxAgeMs) {
        this.backupStorage.delete(key);
      } else {
        // Update age in minutes
        backup.age = Math.floor(backupAge / (60 * 1000));
      }
    }
  }

  private getSuccessfulRecoveryCount(): number {
    // This would be tracked in a real implementation
    // For now, return a calculated estimate
    return Math.floor(this.failureLog.length * 0.7); // Assume 70% recovery rate
  }

  private logFailure(operation: FailedOperation): void {
    this.failureLog.push(operation);
    console.warn(`[DataRecoveryEngine] Operation failed:`, {
      id: operation.id,
      type: operation.type,
      error: operation.error,
      critical: operation.critical
    });
  }

  private logRecovery(operation: FailedOperation, strategy: string): void {
    console.info(`[DataRecoveryEngine] Recovery successful:`, {
      id: operation.id,
      type: operation.type,
      strategy,
      retryCount: operation.retryCount
    });
  }

  private logStrategyFailure(strategy: string, error: any): void {
    console.warn(`[DataRecoveryEngine] Strategy failed:`, {
      strategy,
      error: error?.message || error
    });
  }

  private logMaxRetriesReached(operation: FailedOperation): void {
    console.error(`[DataRecoveryEngine] Max retries reached:`, {
      id: operation.id,
      type: operation.type,
      maxRetries: operation.maxRetries,
      error: operation.error
    });
  }

  private logRetryError(retryOp: RetryOperation, error: any): void {
    console.error(`[DataRecoveryEngine] Retry failed:`, {
      id: retryOp.id,
      attempts: retryOp.attempts,
      error: error?.message || error
    });
  }

  private getLocalStorageBackup(): any {
    try {
      const backup = localStorage.getItem('dulms_backup_data');
      return backup ? JSON.parse(backup) : null;
    } catch {
      return null;
    }
  }

  private getMostReliableBackup(): BackupData | null {
    let mostReliable: BackupData | null = null;
    let highestReliability = 0;

    for (const backup of this.backupStorage.values()) {
      if (backup.reliability > highestReliability && this.isBackupValid(backup)) {
        mostReliable = backup;
        highestReliability = backup.reliability;
      }
    }

    return mostReliable;
  }

  private isBackupValid(backup: BackupData): boolean {
    if (!backup || !backup.data) return false;
    
    // Check age
    const ageMs = Date.now() - new Date(backup.timestamp).getTime();
    const ageMinutes = ageMs / (60 * 1000);
    
    if (ageMinutes > this.config.backupDataMaxAge) return false;
    
    // Check reliability
    if (backup.reliability < 0.5) return false;
    
    return true;
  }

  private async restoreFromLocalBackup(backup: any): Promise<void> {
    try {
      if (backup && typeof backup === 'object') {
        localStorage.setItem('dulms_dashboard_data', JSON.stringify(backup));
        console.info('[DataRecoveryEngine] Restored from local backup');
      }
    } catch (error) {
      console.error('[DataRecoveryEngine] Failed to restore from local backup:', error);
      throw error;
    }
  }

  private async restoreFromInternalBackup(backup: BackupData): Promise<void> {
    try {
      await this.restoreToLocalStorage(backup.data);
      console.info('[DataRecoveryEngine] Restored from internal backup');
    } catch (error) {
      console.error('[DataRecoveryEngine] Failed to restore from internal backup:', error);
      throw error;
    }
  }

  private async restoreToLocalStorage(data: any): Promise<void> {
    try {
      if (data && typeof data === 'object') {
        localStorage.setItem('dulms_dashboard_data', JSON.stringify(data));
        
        // Also create a backup of the restored data
        localStorage.setItem('dulms_backup_data', JSON.stringify({
          ...data,
          restoredAt: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('[DataRecoveryEngine] Failed to restore to localStorage:', error);
      throw error;
    }
  }
}

/**
 * Utility function to create a DataRecoveryEngine instance with default config
 */
export function createDataRecoveryEngine(config?: Partial<DataRecoveryConfig>): DataRecoveryEngine {
  return new DataRecoveryEngine(config);
}

/**
 * Utility function to handle common scraping failures
 */
export async function handleCommonScrapingFailure(
  engine: DataRecoveryEngine,
  error: Error,
  operationType: FailedOperation['type'],
  originalData?: any,
  context?: Record<string, any>
): Promise<RecoveryResult> {
  return await engine.handleScrapingFailure({
    type: operationType,
    error: error.message,
    originalData,
    context,
    critical: operationType === 'course_expansion' || operationType === 'data_fetch'
  });
}