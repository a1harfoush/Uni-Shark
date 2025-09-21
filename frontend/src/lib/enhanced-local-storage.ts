// Enhanced Local Storage Schema for Reliability Data
// Implements comprehensive data structure for reliability metrics, backup data, and operation logging

export interface FailedOperation {
  id: string;
  type: 'course_expansion' | 'data_fetch' | 'data_processing' | 'data_merge';
  timestamp: string;
  error: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  context?: any;
  stackTrace?: string;
}

export interface RetryOperation {
  id: string;
  operation: FailedOperation;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  queuedAt: string;
  lastAttemptAt?: string;
  completedAt?: string;
}

export interface OperationLog {
  id: string;
  timestamp: string;
  operation: string;
  operationType: 'scraper_operation' | 'data_processing' | 'data_merge' | 'backup_restore' | 'data_migration';
  success: boolean;
  duration: number;
  error?: string;
  dataSize?: number;
  metadata?: {
    itemsProcessed?: number;
    duplicatesFound?: number;
    newItemsAdded?: number;
    failedItems?: number;
  };
}

export interface PerformanceMetrics {
  averageOperationTime: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  lastCalculatedAt: string;
  operationTimes: number[]; // Keep last 100 operation times for rolling average
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    timestamp: string;
  };
}

export interface ErrorRecord {
  id: string;
  timestamp: string;
  error: string;
  stackTrace?: string;
  context: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: string;
  resolution?: string;
}

export interface ReliabilityMetrics {
  dataIntegrity: number; // 0-100 percentage
  lastSuccessfulScrape: string;
  failedOperations: FailedOperation[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
  retryQueue: RetryOperation[];
  stalenessWarning: boolean;
  lastHealthCheck: string;
  consecutiveFailures: number;
  recoveryAttempts: number;
}

export interface BackupData {
  lastBackupTime: string;
  backupData: any;
  recoveryAttempts: number;
  backupVersion: string;
  backupSize: number;
  backupIntegrity: boolean;
  autoBackupEnabled: boolean;
  backupHistory: {
    timestamp: string;
    size: number;
    success: boolean;
    error?: string;
  }[];
}

export interface MonitoringData {
  operationLog: OperationLog[];
  performanceMetrics: PerformanceMetrics;
  errorHistory: ErrorRecord[];
  lastMonitoringUpdate: string;
  monitoringEnabled: boolean;
  logRetentionDays: number;
}

export interface DataMigrationInfo {
  currentVersion: string;
  lastMigrationAt: string;
  migrationHistory: {
    fromVersion: string;
    toVersion: string;
    timestamp: string;
    success: boolean;
    error?: string;
  }[];
  pendingMigrations: string[];
}

// Enhanced Local Storage Data Structure
export interface EnhancedLocalData {
  // Schema version for migration purposes
  schemaVersion: string;
  
  // Existing data structure (preserved for backward compatibility)
  lastUpdated: string;
  totalScrapes: number;
  courses: string[];
  quizzes: any[];
  assignments: any[];
  absences: any[];
  grades: any[];
  course_registration?: any;
  rawData?: any[];
  lastProcessedScrapeId?: string;
  
  // Enhanced reliability data
  reliability: ReliabilityMetrics;
  
  // Backup and recovery data
  backup: BackupData;
  
  // Monitoring and logging
  monitoring: MonitoringData;
  
  // Data migration information
  migration: DataMigrationInfo;
  
  // User preferences for reliability features
  preferences: {
    enableAutoBackup: boolean;
    enableDetailedLogging: boolean;
    enablePerformanceMonitoring: boolean;
    maxLogRetentionDays: number;
    maxRetryAttempts: number;
    stalenessThresholdMinutes: number;
  };
}

// Default values for enhanced data structure
export const DEFAULT_ENHANCED_DATA: Partial<EnhancedLocalData> = {
  schemaVersion: '1.0.0',
  reliability: {
    dataIntegrity: 100,
    lastSuccessfulScrape: '',
    failedOperations: [],
    systemHealth: 'healthy',
    retryQueue: [],
    stalenessWarning: false,
    lastHealthCheck: new Date().toISOString(),
    consecutiveFailures: 0,
    recoveryAttempts: 0
  },
  backup: {
    lastBackupTime: '',
    backupData: null,
    recoveryAttempts: 0,
    backupVersion: '1.0.0',
    backupSize: 0,
    backupIntegrity: true,
    autoBackupEnabled: true,
    backupHistory: []
  },
  monitoring: {
    operationLog: [],
    performanceMetrics: {
      averageOperationTime: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      lastCalculatedAt: new Date().toISOString(),
      operationTimes: []
    },
    errorHistory: [],
    lastMonitoringUpdate: new Date().toISOString(),
    monitoringEnabled: true,
    logRetentionDays: 30
  },
  migration: {
    currentVersion: '1.0.0',
    lastMigrationAt: new Date().toISOString(),
    migrationHistory: [],
    pendingMigrations: []
  },
  preferences: {
    enableAutoBackup: true,
    enableDetailedLogging: true,
    enablePerformanceMonitoring: true,
    maxLogRetentionDays: 30,
    maxRetryAttempts: 3,
    stalenessThresholdMinutes: 15
  }
};

/**
 * Enhanced Local Storage Manager
 * Handles all operations related to the enhanced local storage schema
 */
export class EnhancedLocalStorageManager {
  private storageKey: string;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.storageKey = `userScrapeData_${userId}`;
  }

  /**
   * Gets the enhanced data structure, migrating legacy data if necessary
   */
  getEnhancedData(): EnhancedLocalData {
    try {
      const stored = localStorage.getItem(this.storageKey);
      
      if (!stored) {
        return this.createDefaultEnhancedData();
      }

      const data = JSON.parse(stored);
      
      // Check if this is legacy data that needs migration
      if (!data.schemaVersion) {
        return this.migrateLegacyData(data);
      }

      // Ensure all required properties exist (in case of partial data)
      return this.ensureDataIntegrity(data);
    } catch (error) {
      console.error('Error reading enhanced local storage:', error);
      this.logError('storage_read_error', error, { storageKey: this.storageKey });
      return this.createDefaultEnhancedData();
    }
  }

  /**
   * Saves enhanced data to local storage
   */
  saveEnhancedData(data: EnhancedLocalData): boolean {
    try {
      // Update last modified timestamp
      data.lastUpdated = new Date().toISOString();
      data.monitoring.lastMonitoringUpdate = new Date().toISOString();
      
      // Clean up old data to prevent storage bloat
      this.cleanupOldData(data);
      
      // Save to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      
      // Log successful operation
      this.logOperation('data_save', true, 0, JSON.stringify(data).length);
      
      return true;
    } catch (error) {
      console.error('Error saving enhanced local storage:', error);
      this.logError('storage_save_error', error, { dataSize: JSON.stringify(data).length });
      return false;
    }
  }

  /**
   * Creates default enhanced data structure
   */
  private createDefaultEnhancedData(): EnhancedLocalData {
    return {
      ...DEFAULT_ENHANCED_DATA,
      lastUpdated: new Date().toISOString(),
      totalScrapes: 0,
      courses: [],
      quizzes: [],
      assignments: [],
      absences: [],
      grades: []
    } as EnhancedLocalData;
  }

  /**
   * Migrates legacy data to enhanced schema
   */
  private migrateLegacyData(legacyData: any): EnhancedLocalData {
    const startTime = Date.now();
    
    try {
      const enhanced: EnhancedLocalData = {
        ...DEFAULT_ENHANCED_DATA,
        // Preserve existing data
        lastUpdated: legacyData.lastUpdated || new Date().toISOString(),
        totalScrapes: legacyData.totalScrapes || 0,
        courses: legacyData.courses || [],
        quizzes: legacyData.quizzes || [],
        assignments: legacyData.assignments || [],
        absences: legacyData.absences || [],
        grades: legacyData.grades || [],
        course_registration: legacyData.course_registration,
        rawData: legacyData.rawData || [],
        lastProcessedScrapeId: legacyData.lastProcessedScrapeId
      } as EnhancedLocalData;

      // Calculate initial reliability metrics from existing data
      enhanced.reliability.dataIntegrity = this.calculateDataIntegrity(legacyData);
      enhanced.reliability.lastSuccessfulScrape = legacyData.lastUpdated || '';
      
      // Record migration
      enhanced.migration.migrationHistory.push({
        fromVersion: 'legacy',
        toVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        success: true
      });

      const duration = Date.now() - startTime;
      this.logOperation('data_migration', true, duration, JSON.stringify(enhanced).length, {
        migratedFrom: 'legacy',
        itemsCount: {
          courses: enhanced.courses.length,
          quizzes: enhanced.quizzes.length,
          assignments: enhanced.assignments.length,
          absences: enhanced.absences.length,
          grades: enhanced.grades.length
        }
      });

      return enhanced;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logOperation('data_migration', false, duration, 0);
      this.logError('migration_error', error, { legacyDataKeys: Object.keys(legacyData) });
      
      // Return default data if migration fails
      return this.createDefaultEnhancedData();
    }
  }

  /**
   * Ensures data integrity by filling in missing properties
   */
  private ensureDataIntegrity(data: any): EnhancedLocalData {
    const enhanced = { ...DEFAULT_ENHANCED_DATA, ...data };
    
    // Ensure nested objects exist
    enhanced.reliability = { ...DEFAULT_ENHANCED_DATA.reliability, ...data.reliability };
    enhanced.backup = { ...DEFAULT_ENHANCED_DATA.backup, ...data.backup };
    enhanced.monitoring = { ...DEFAULT_ENHANCED_DATA.monitoring, ...data.monitoring };
    enhanced.migration = { ...DEFAULT_ENHANCED_DATA.migration, ...data.migration };
    enhanced.preferences = { ...DEFAULT_ENHANCED_DATA.preferences, ...data.preferences };
    
    // Ensure arrays exist
    enhanced.courses = data.courses || [];
    enhanced.quizzes = data.quizzes || [];
    enhanced.assignments = data.assignments || [];
    enhanced.absences = data.absences || [];
    enhanced.grades = data.grades || [];
    enhanced.reliability.failedOperations = data.reliability?.failedOperations || [];
    enhanced.reliability.retryQueue = data.reliability?.retryQueue || [];
    enhanced.monitoring.operationLog = data.monitoring?.operationLog || [];
    enhanced.monitoring.errorHistory = data.monitoring?.errorHistory || [];
    enhanced.backup.backupHistory = data.backup?.backupHistory || [];
    enhanced.migration.migrationHistory = data.migration?.migrationHistory || [];
    enhanced.migration.pendingMigrations = data.migration?.pendingMigrations || [];

    return enhanced as EnhancedLocalData;
  }

  /**
   * Calculates data integrity percentage from existing data
   */
  private calculateDataIntegrity(data: any): number {
    const totalScrapes = data.totalScrapes || 0;
    if (totalScrapes === 0) return 100;
    
    // Simple calculation based on data completeness
    const hasQuizzes = (data.quizzes || []).length > 0;
    const hasAssignments = (data.assignments || []).length > 0;
    const hasCourses = (data.courses || []).length > 0;
    
    const completenessScore = [hasQuizzes, hasAssignments, hasCourses].filter(Boolean).length;
    return Math.round((completenessScore / 3) * 100);
  }

  /**
   * Cleans up old data to prevent storage bloat
   */
  private cleanupOldData(data: EnhancedLocalData): void {
    const maxLogEntries = 1000;
    const maxErrorEntries = 500;
    const maxBackupHistory = 10;
    const maxOperationTimes = 100;

    // Cleanup operation logs
    if (data.monitoring.operationLog.length > maxLogEntries) {
      data.monitoring.operationLog = data.monitoring.operationLog
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxLogEntries);
    }

    // Cleanup error history
    if (data.monitoring.errorHistory.length > maxErrorEntries) {
      data.monitoring.errorHistory = data.monitoring.errorHistory
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxErrorEntries);
    }

    // Cleanup backup history
    if (data.backup.backupHistory.length > maxBackupHistory) {
      data.backup.backupHistory = data.backup.backupHistory
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxBackupHistory);
    }

    // Cleanup performance metrics operation times
    if (data.monitoring.performanceMetrics.operationTimes.length > maxOperationTimes) {
      data.monitoring.performanceMetrics.operationTimes = 
        data.monitoring.performanceMetrics.operationTimes.slice(-maxOperationTimes);
    }

    // Cleanup old raw data (keep only last 5 entries)
    if (data.rawData && data.rawData.length > 5) {
      data.rawData = data.rawData.slice(-5);
    }

    // Remove resolved errors older than retention period
    const retentionMs = data.preferences.maxLogRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);
    
    data.monitoring.errorHistory = data.monitoring.errorHistory.filter(error => 
      !error.resolved || new Date(error.timestamp) > cutoffDate
    );
  }

  /**
   * Logs an operation to the monitoring system
   */
  private logOperation(
    operation: string, 
    success: boolean, 
    duration: number, 
    dataSize?: number, 
    metadata?: any
  ): void {
    try {
      const data = this.getEnhancedData();
      
      const logEntry: OperationLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        operation,
        operationType: this.getOperationType(operation),
        success,
        duration,
        dataSize,
        metadata
      };

      data.monitoring.operationLog.push(logEntry);
      
      // Update performance metrics
      data.monitoring.performanceMetrics.totalOperations++;
      if (success) {
        data.monitoring.performanceMetrics.successfulOperations++;
      } else {
        data.monitoring.performanceMetrics.failedOperations++;
      }
      
      data.monitoring.performanceMetrics.operationTimes.push(duration);
      data.monitoring.performanceMetrics.averageOperationTime = 
        data.monitoring.performanceMetrics.operationTimes.reduce((a, b) => a + b, 0) / 
        data.monitoring.performanceMetrics.operationTimes.length;
      
      data.monitoring.performanceMetrics.lastCalculatedAt = new Date().toISOString();
      
      // Don't save here to avoid infinite recursion
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error logging operation:', error);
    }
  }

  /**
   * Logs an error to the monitoring system
   */
  private logError(operation: string, error: any, context?: any): void {
    try {
      const data = this.getEnhancedData();
      
      const errorRecord: ErrorRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        error: error.message || String(error),
        stackTrace: error.stack,
        context: context || {},
        severity: this.determineSeverity(operation, error),
        resolved: false
      };

      data.monitoring.errorHistory.push(errorRecord);
      
      // Don't save here to avoid infinite recursion
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (logError) {
      console.error('Error logging error:', logError);
    }
  }

  /**
   * Determines operation type from operation name
   */
  private getOperationType(operation: string): OperationLog['operationType'] {
    if (operation.includes('scrape') || operation.includes('fetch')) return 'scraper_operation';
    if (operation.includes('merge') || operation.includes('process')) return 'data_processing';
    if (operation.includes('backup') || operation.includes('restore')) return 'backup_restore';
    if (operation.includes('migration')) return 'data_migration';
    return 'data_processing';
  }

  /**
   * Determines error severity
   */
  private determineSeverity(operation: string, error: any): ErrorRecord['severity'] {
    if (operation.includes('storage') || operation.includes('migration')) return 'critical';
    if (operation.includes('backup') || operation.includes('save')) return 'high';
    if (operation.includes('fetch') || operation.includes('scrape')) return 'medium';
    return 'low';
  }

  /**
   * Creates a backup of current data
   */
  createBackup(): boolean {
    try {
      const data = this.getEnhancedData();
      const backupData = {
        ...data,
        backupCreatedAt: new Date().toISOString()
      };
      
      data.backup.lastBackupTime = new Date().toISOString();
      data.backup.backupData = backupData;
      data.backup.backupSize = JSON.stringify(backupData).length;
      data.backup.backupIntegrity = true;
      data.backup.backupVersion = data.schemaVersion;
      
      data.backup.backupHistory.push({
        timestamp: new Date().toISOString(),
        size: data.backup.backupSize,
        success: true
      });
      
      this.saveEnhancedData(data);
      return true;
    } catch (error) {
      this.logError('backup_creation_error', error);
      return false;
    }
  }

  /**
   * Restores data from backup
   */
  restoreFromBackup(): boolean {
    try {
      const data = this.getEnhancedData();
      
      if (!data.backup.backupData) {
        throw new Error('No backup data available');
      }
      
      const restoredData = { ...data.backup.backupData };
      restoredData.backup.recoveryAttempts = (data.backup.recoveryAttempts || 0) + 1;
      
      this.saveEnhancedData(restoredData);
      this.logOperation('backup_restore', true, 0);
      return true;
    } catch (error) {
      this.logError('backup_restore_error', error);
      return false;
    }
  }
}