// Enhanced Local Storage Usage Example
// Demonstrates how to use the enhanced local storage system

import { EnhancedLocalStorageManager, EnhancedLocalData } from './enhanced-local-storage';
import { DataMigrationManager } from './data-migration';

/**
 * Example usage of Enhanced Local Storage Manager
 */
export class EnhancedLocalStorageExample {
  private manager: EnhancedLocalStorageManager;
  private migrationManager: DataMigrationManager;

  constructor(userId: string) {
    this.manager = new EnhancedLocalStorageManager(userId);
    this.migrationManager = new DataMigrationManager(userId);
  }

  /**
   * Initialize the enhanced local storage system
   */
  async initialize(): Promise<void> {
    console.log('Initializing Enhanced Local Storage System...');

    // Check if migration is needed
    const migrationResults = await this.migrationManager.checkAndMigrate();
    
    if (migrationResults.length > 0) {
      console.log('Migration completed:', migrationResults);
    }

    // Load current data
    const data = this.manager.getEnhancedData();
    console.log('Current data loaded:', {
      schemaVersion: data.schemaVersion,
      totalScrapes: data.totalScrapes,
      dataIntegrity: data.reliability.dataIntegrity,
      systemHealth: data.reliability.systemHealth,
      coursesCount: data.courses.length,
      quizzesCount: data.quizzes.length,
      assignmentsCount: data.assignments.length
    });
  }

  /**
   * Process new scraped data
   */
  processScrapedData(scrapedData: any): boolean {
    console.log('Processing new scraped data...');

    try {
      const currentData = this.manager.getEnhancedData();
      
      // Simulate data merging (in real usage, this would use the existing merge logic)
      const updatedData: EnhancedLocalData = {
        ...currentData,
        lastUpdated: new Date().toISOString(),
        totalScrapes: currentData.totalScrapes + 1
      };

      // Update reliability metrics
      updatedData.reliability.lastSuccessfulScrape = new Date().toISOString();
      updatedData.reliability.consecutiveFailures = 0;
      updatedData.reliability.dataIntegrity = this.calculateDataIntegrity(updatedData);
      updatedData.reliability.systemHealth = this.determineSystemHealth(updatedData.reliability.dataIntegrity);

      // Save updated data
      const saved = this.manager.saveEnhancedData(updatedData);
      
      if (saved) {
        console.log('Data processed successfully:', {
          dataIntegrity: updatedData.reliability.dataIntegrity,
          systemHealth: updatedData.reliability.systemHealth,
          totalScrapes: updatedData.totalScrapes
        });
        return true;
      } else {
        console.error('Failed to save processed data');
        return false;
      }
    } catch (error) {
      console.error('Error processing scraped data:', error);
      this.handleProcessingError(error);
      return false;
    }
  }

  /**
   * Create a backup of current data
   */
  createBackup(): boolean {
    console.log('Creating data backup...');
    
    const success = this.manager.createBackup();
    
    if (success) {
      console.log('Backup created successfully');
    } else {
      console.error('Failed to create backup');
    }
    
    return success;
  }

  /**
   * Restore data from backup
   */
  restoreFromBackup(): boolean {
    console.log('Restoring data from backup...');
    
    const success = this.manager.restoreFromBackup();
    
    if (success) {
      console.log('Data restored successfully from backup');
    } else {
      console.error('Failed to restore data from backup');
    }
    
    return success;
  }

  /**
   * Get system health summary
   */
  getHealthSummary(): {
    dataIntegrity: number;
    systemHealth: string;
    lastSuccessfulScrape: string;
    failedOperationsCount: number;
    errorCount: number;
    backupStatus: string;
  } {
    const data = this.manager.getEnhancedData();
    
    return {
      dataIntegrity: data.reliability.dataIntegrity,
      systemHealth: data.reliability.systemHealth,
      lastSuccessfulScrape: data.reliability.lastSuccessfulScrape,
      failedOperationsCount: data.reliability.failedOperations.length,
      errorCount: data.monitoring.errorHistory.length,
      backupStatus: data.backup.backupIntegrity ? 'Valid' : 'Invalid'
    };
  }

  /**
   * Get recent operation logs
   */
  getRecentOperations(limit: number = 10): any[] {
    const data = this.manager.getEnhancedData();
    
    return data.monitoring.operationLog
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map(log => ({
        timestamp: log.timestamp,
        operation: log.operation,
        success: log.success,
        duration: log.duration,
        error: log.error
      }));
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageOperationTime: number;
    successRate: number;
  } {
    const data = this.manager.getEnhancedData();
    const metrics = data.monitoring.performanceMetrics;
    
    return {
      totalOperations: metrics.totalOperations,
      successfulOperations: metrics.successfulOperations,
      failedOperations: metrics.failedOperations,
      averageOperationTime: metrics.averageOperationTime,
      successRate: metrics.totalOperations > 0 
        ? Math.round((metrics.successfulOperations / metrics.totalOperations) * 100)
        : 100
    };
  }

  /**
   * Export data for debugging or backup purposes
   */
  exportData(): string {
    const data = this.manager.getEnhancedData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON string
   */
  importData(jsonData: string): boolean {
    try {
      const importedData = JSON.parse(jsonData) as EnhancedLocalData;
      
      // Validate imported data
      if (!importedData.schemaVersion || !importedData.reliability) {
        throw new Error('Invalid data format');
      }
      
      const saved = this.manager.saveEnhancedData(importedData);
      
      if (saved) {
        console.log('Data imported successfully');
        return true;
      } else {
        console.error('Failed to save imported data');
        return false;
      }
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  /**
   * Clear all data (use with caution)
   */
  clearAllData(): boolean {
    console.log('Clearing all data...');
    
    try {
      const storageKey = `userScrapeData_${this.manager['userId']}`;
      localStorage.removeItem(storageKey);
      console.log('All data cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * Private helper to calculate data integrity
   */
  private calculateDataIntegrity(data: EnhancedLocalData): number {
    const totalScrapes = data.totalScrapes || 0;
    if (totalScrapes === 0) return 100;
    
    // Calculate based on data completeness and freshness
    let score = 0;
    let maxScore = 0;
    
    // Data completeness (60% of score)
    const dataTypes: (keyof EnhancedLocalData)[] = ['courses', 'quizzes', 'assignments', 'absences', 'grades'];
    dataTypes.forEach(type => {
      maxScore += 12; // 60% / 5 types = 12% each
      if (data[type] && Array.isArray(data[type]) && data[type].length > 0) {
        score += 12;
      }
    });
    
    // Data freshness (40% of score)
    maxScore += 40;
    if (data.lastUpdated) {
      const lastUpdate = new Date(data.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 1) score += 40;
      else if (hoursSinceUpdate < 6) score += 30;
      else if (hoursSinceUpdate < 24) score += 20;
      else if (hoursSinceUpdate < 72) score += 10;
      // else 0 points for freshness
    }
    
    return Math.min(100, Math.round((score / maxScore) * 100));
  }

  /**
   * Private helper to determine system health
   */
  private determineSystemHealth(dataIntegrity: number): 'healthy' | 'degraded' | 'critical' {
    if (dataIntegrity >= 90) return 'healthy';
    if (dataIntegrity >= 70) return 'degraded';
    return 'critical';
  }

  /**
   * Private helper to handle processing errors
   */
  private handleProcessingError(error: any): void {
    const data = this.manager.getEnhancedData();
    
    // Update failure tracking
    data.reliability.consecutiveFailures++;
    // Simple system health determination based on data integrity and failures
    data.reliability.systemHealth = data.reliability.dataIntegrity > 80 && data.reliability.consecutiveFailures < 3 ? 'healthy' : 'degraded';
    
    // Add to failed operations
    data.reliability.failedOperations.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'data_processing',
      timestamp: new Date().toISOString(),
      error: error.message || String(error),
      retryCount: 0,
      maxRetries: 3,
      context: { errorType: error.constructor.name }
    });
    
    // Save updated data
    this.manager.saveEnhancedData(data);
  }
}

/**
 * Example usage function
 */
export async function demonstrateEnhancedLocalStorage(userId: string): Promise<void> {
  console.log('=== Enhanced Local Storage Demonstration ===');
  
  const example = new EnhancedLocalStorageExample(userId);
  
  // Initialize the system
  await example.initialize();
  
  // Create a backup
  example.createBackup();
  
  // Process some mock scraped data
  const mockScrapedData = {
    quizzes: {
      quizzes_with_results: [
        { id: 1, name: 'Quiz 1', course: 'CS101', grade: 85 }
      ]
    },
    assignments: {
      assignments: [
        { id: 1, name: 'Assignment 1', course: 'CS101', dueDate: '2024-01-15' }
      ]
    }
  };
  
  example.processScrapedData(mockScrapedData);
  
  // Get health summary
  const health = example.getHealthSummary();
  console.log('System Health:', health);
  
  // Get performance metrics
  const performance = example.getPerformanceMetrics();
  console.log('Performance Metrics:', performance);
  
  // Get recent operations
  const recentOps = example.getRecentOperations(5);
  console.log('Recent Operations:', recentOps);
  
  console.log('=== Demonstration Complete ===');
}

// Export for use in other parts of the application
export default EnhancedLocalStorageExample;