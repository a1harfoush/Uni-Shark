// Enhanced Local Storage Hook
// Provides React hook interface for enhanced local storage with reliability features

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  EnhancedLocalStorageManager, 
  EnhancedLocalData, 
  OperationLog,
  FailedOperation,
  ReliabilityMetrics 
} from '../enhanced-local-storage';
import { DataMigrationManager, isMigrationNeeded } from '../data-migration';
import { mergeScrapeData } from './useLocalScrapeData';

export interface UseEnhancedLocalStorageReturn {
  // Data
  data: EnhancedLocalData | null;
  isLoading: boolean;
  error: string | null;
  
  // Reliability metrics
  reliability: ReliabilityMetrics | null;
  dataIntegrity: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  
  // Operations
  updateData: (newData: any) => Promise<boolean>;
  createBackup: () => Promise<boolean>;
  restoreFromBackup: () => Promise<boolean>;
  clearData: () => Promise<boolean>;
  
  // Monitoring
  getOperationLogs: (limit?: number) => OperationLog[];
  getFailedOperations: () => FailedOperation[];
  getPerformanceMetrics: () => any;
  
  // Migration
  migrationStatus: {
    needsMigration: boolean;
    currentVersion: string;
    targetVersion: string;
  };
  performMigration: () => Promise<boolean>;
  
  // Utilities
  refreshData: () => void;
  exportData: () => string;
  importData: (jsonData: string) => Promise<boolean>;
}

/**
 * Enhanced Local Storage Hook
 * Provides comprehensive local storage management with reliability features
 */
export function useEnhancedLocalStorage(remoteData?: any): UseEnhancedLocalStorageReturn {
  const { userId } = useAuth();
  const [data, setData] = useState<EnhancedLocalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState({
    needsMigration: false,
    currentVersion: '1.0.0',
    targetVersion: '1.0.0'
  });
  
  const storageManagerRef = useRef<EnhancedLocalStorageManager | null>(null);
  const migrationManagerRef = useRef<DataMigrationManager | null>(null);
  const lastProcessedDataRef = useRef<string>('');

  // Initialize managers when userId changes
  useEffect(() => {
    if (!userId) {
      storageManagerRef.current = null;
      migrationManagerRef.current = null;
      setData(null);
      setIsLoading(false);
      return;
    }

    storageManagerRef.current = new EnhancedLocalStorageManager(userId);
    migrationManagerRef.current = new DataMigrationManager(userId);
    
    // Check migration status
    const needsMigration = isMigrationNeeded(userId);
    setMigrationStatus(prev => ({
      ...prev,
      needsMigration
    }));
    
    // Load initial data
    loadData();
  }, [userId]);

  // Handle remote data updates
  useEffect(() => {
    if (!remoteData || !userId || !storageManagerRef.current) return;
    
    // Prevent duplicate processing
    const dataHash = JSON.stringify(remoteData).slice(0, 50);
    if (lastProcessedDataRef.current === dataHash) {
      return;
    }
    lastProcessedDataRef.current = dataHash;
    
    handleRemoteDataUpdate(remoteData);
  }, [remoteData, userId]);

  /**
   * Loads data from enhanced local storage
   */
  const loadData = useCallback(async () => {
    if (!storageManagerRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const enhancedData = storageManagerRef.current.getEnhancedData();
      setData(enhancedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading enhanced local storage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handles remote data updates by merging with local data
   */
  const handleRemoteDataUpdate = useCallback(async (newRemoteData: any) => {
    if (!storageManagerRef.current) return;
    
    const startTime = Date.now();
    
    try {
      const currentData = storageManagerRef.current.getEnhancedData();
      
      // Extract scraped data from wrapper if it exists
      const scrapedData = newRemoteData.scraped_data || newRemoteData;
      
      // Use existing merge logic but enhance with reliability tracking
      const legacyData = {
        lastUpdated: currentData.lastUpdated,
        totalScrapes: currentData.totalScrapes,
        courses: currentData.courses,
        quizzes: currentData.quizzes,
        assignments: currentData.assignments,
        absences: currentData.absences,
        grades: currentData.grades,
        course_registration: currentData.course_registration,
        rawData: currentData.rawData,
        lastProcessedScrapeId: currentData.lastProcessedScrapeId
      };
      
      const mergedLegacyData = mergeScrapeData(legacyData, scrapedData);
      
      // Update enhanced data structure
      const updatedData: EnhancedLocalData = {
        ...currentData,
        ...mergedLegacyData,
        lastUpdated: new Date().toISOString()
      };
      
      // Update reliability metrics
      updatedData.reliability.lastSuccessfulScrape = new Date().toISOString();
      updatedData.reliability.consecutiveFailures = 0;
      updatedData.reliability.dataIntegrity = calculateDataIntegrity(updatedData);
      updatedData.reliability.systemHealth = determineSystemHealth(updatedData.reliability.dataIntegrity);
      updatedData.reliability.lastHealthCheck = new Date().toISOString();
      
      // Save updated data
      const saved = storageManagerRef.current.saveEnhancedData(updatedData);
      
      if (saved) {
        setData(updatedData);
        
        // Log successful operation
        logOperation('data_merge', true, Date.now() - startTime, {
          itemsProcessed: getTotalItems(updatedData),
          newItemsAdded: mergedLegacyData.newQuizzesCount + mergedLegacyData.newAssignmentsCount + mergedLegacyData.newAbsencesCount,
          dataIntegrity: updatedData.reliability.dataIntegrity
        });
      } else {
        throw new Error('Failed to save merged data');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to merge remote data';
      setError(errorMessage);
      
      // Log failed operation
      logOperation('data_merge', false, Date.now() - startTime);
      
      // Update failure tracking
      if (data) {
        const updatedData = { ...data };
        updatedData.reliability.consecutiveFailures++;
        updatedData.reliability.systemHealth = determineSystemHealth(updatedData.reliability.dataIntegrity, updatedData.reliability.consecutiveFailures);
        
        // Add to failed operations
        const failedOp: FailedOperation = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'data_merge',
          timestamp: new Date().toISOString(),
          error: errorMessage,
          retryCount: 0,
          maxRetries: 3,
          context: { remoteDataKeys: Object.keys(newRemoteData) }
        };
        
        updatedData.reliability.failedOperations.push(failedOp);
        
        storageManagerRef.current?.saveEnhancedData(updatedData);
        setData(updatedData);
      }
      
      console.error('Error handling remote data update:', err);
    }
  }, [data]);

  /**
   * Updates data manually
   */
  const updateData = useCallback(async (newData: any): Promise<boolean> => {
    if (!storageManagerRef.current) return false;
    
    const startTime = Date.now();
    
    try {
      const currentData = storageManagerRef.current.getEnhancedData();
      const updatedData = { ...currentData, ...newData, lastUpdated: new Date().toISOString() };
      
      const saved = storageManagerRef.current.saveEnhancedData(updatedData);
      
      if (saved) {
        setData(updatedData);
        logOperation('manual_update', true, Date.now() - startTime);
        return true;
      }
      
      return false;
    } catch (err) {
      logOperation('manual_update', false, Date.now() - startTime);
      setError(err instanceof Error ? err.message : 'Failed to update data');
      return false;
    }
  }, []);

  /**
   * Creates a backup of current data
   */
  const createBackup = useCallback(async (): Promise<boolean> => {
    if (!storageManagerRef.current) return false;
    
    try {
      const success = storageManagerRef.current.createBackup();
      if (success) {
        // Refresh data to show updated backup info
        await loadData();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
      return false;
    }
  }, [loadData]);

  /**
   * Restores data from backup
   */
  const restoreFromBackup = useCallback(async (): Promise<boolean> => {
    if (!storageManagerRef.current) return false;
    
    try {
      const success = storageManagerRef.current.restoreFromBackup();
      if (success) {
        await loadData();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore from backup');
      return false;
    }
  }, [loadData]);

  /**
   * Clears all data
   */
  const clearData = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      const storageKey = `userScrapeData_${userId}`;
      localStorage.removeItem(storageKey);
      setData(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
      return false;
    }
  }, [userId]);

  /**
   * Gets operation logs
   */
  const getOperationLogs = useCallback((limit: number = 100): OperationLog[] => {
    if (!data) return [];
    
    return data.monitoring.operationLog
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [data]);

  /**
   * Gets failed operations
   */
  const getFailedOperations = useCallback((): FailedOperation[] => {
    if (!data) return [];
    return data.reliability.failedOperations;
  }, [data]);

  /**
   * Gets performance metrics
   */
  const getPerformanceMetrics = useCallback(() => {
    if (!data) return null;
    return data.monitoring.performanceMetrics;
  }, [data]);

  /**
   * Performs data migration
   */
  const performMigration = useCallback(async (): Promise<boolean> => {
    if (!migrationManagerRef.current) return false;
    
    try {
      setIsLoading(true);
      
      // Create backup before migration
      await migrationManagerRef.current.createPreMigrationBackup();
      
      // Perform migration
      const results = await migrationManagerRef.current.checkAndMigrate();
      
      const success = results.every(result => result.success);
      
      if (success) {
        setMigrationStatus(prev => ({ ...prev, needsMigration: false }));
        await loadData();
      } else {
        const errors = results.filter(r => !r.success).map(r => r.error).join(', ');
        setError(`Migration failed: ${errors}`);
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  /**
   * Refreshes data from storage
   */
  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  /**
   * Exports data as JSON string
   */
  const exportData = useCallback((): string => {
    if (!data) return '{}';
    return JSON.stringify(data, null, 2);
  }, [data]);

  /**
   * Imports data from JSON string
   */
  const importData = useCallback(async (jsonData: string): Promise<boolean> => {
    if (!storageManagerRef.current) return false;
    
    try {
      const importedData = JSON.parse(jsonData) as EnhancedLocalData;
      
      // Validate imported data structure
      if (!importedData.schemaVersion || !importedData.reliability) {
        throw new Error('Invalid data format');
      }
      
      const saved = storageManagerRef.current.saveEnhancedData(importedData);
      
      if (saved) {
        setData(importedData);
        return true;
      }
      
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
      return false;
    }
  }, []);

  /**
   * Logs an operation (helper function)
   */
  const logOperation = useCallback((operation: string, success: boolean, duration: number, metadata?: any) => {
    // This would be handled by the storage manager internally
    console.log(`Operation ${operation}: ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`, metadata);
  }, []);

  // Derived values
  const reliability = data?.reliability || null;
  const dataIntegrity = reliability?.dataIntegrity || 0;
  const systemHealth = reliability?.systemHealth || 'healthy';

  return {
    // Data
    data,
    isLoading,
    error,
    
    // Reliability metrics
    reliability,
    dataIntegrity,
    systemHealth,
    
    // Operations
    updateData,
    createBackup,
    restoreFromBackup,
    clearData,
    
    // Monitoring
    getOperationLogs,
    getFailedOperations,
    getPerformanceMetrics,
    
    // Migration
    migrationStatus,
    performMigration,
    
    // Utilities
    refreshData,
    exportData,
    importData
  };
}

/**
 * Helper function to calculate data integrity
 */
function calculateDataIntegrity(data: EnhancedLocalData): number {
  const totalScrapes = data.totalScrapes || 0;
  if (totalScrapes === 0) return 100;
  
  // Calculate based on data completeness and freshness
  let score = 0;
  let maxScore = 0;
  
  // Data completeness (40% of score)
  const dataTypes: (keyof EnhancedLocalData)[] = ['courses', 'quizzes', 'assignments', 'absences', 'grades'];
  dataTypes.forEach(type => {
    maxScore += 8; // 40% / 5 types = 8% each
    if (data[type] && Array.isArray(data[type]) && data[type].length > 0) {
      score += 8;
    }
  });
  
  // Data freshness (30% of score)
  maxScore += 30;
  if (data.lastUpdated) {
    const lastUpdate = new Date(data.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate < 1) score += 30;
    else if (hoursSinceUpdate < 6) score += 25;
    else if (hoursSinceUpdate < 24) score += 20;
    else if (hoursSinceUpdate < 72) score += 10;
    // else 0 points for freshness
  }
  
  // System health (30% of score)
  maxScore += 30;
  const consecutiveFailures = data.reliability.consecutiveFailures || 0;
  if (consecutiveFailures === 0) score += 30;
  else if (consecutiveFailures < 3) score += 20;
  else if (consecutiveFailures < 5) score += 10;
  // else 0 points for system health
  
  return Math.min(100, Math.round((score / maxScore) * 100));
}

/**
 * Helper function to determine system health
 */
function determineSystemHealth(dataIntegrity: number, consecutiveFailures: number = 0): 'healthy' | 'degraded' | 'critical' {
  if (consecutiveFailures >= 5 || dataIntegrity < 50) return 'critical';
  if (consecutiveFailures >= 3 || dataIntegrity < 80) return 'degraded';
  return 'healthy';
}

/**
 * Helper function to get total items count
 */
function getTotalItems(data: EnhancedLocalData): number {
  return (data.courses?.length || 0) +
         (data.quizzes?.length || 0) +
         (data.assignments?.length || 0) +
         (data.absences?.length || 0) +
         (data.grades?.length || 0);
}