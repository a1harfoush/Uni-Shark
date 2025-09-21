// Data Migration Utilities
// Handles schema migrations and data transformations for enhanced local storage

import { EnhancedLocalData, EnhancedLocalStorageManager, DEFAULT_ENHANCED_DATA } from './enhanced-local-storage';

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  error?: string;
  itemsMigrated: number;
  duration: number;
}

export interface MigrationStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  migrate: (data: any) => any;
  validate?: (data: any) => boolean;
}

/**
 * Schema version history and migration paths
 */
export const SCHEMA_VERSIONS = {
  LEGACY: 'legacy',
  V1_0_0: '1.0.0',
  V1_1_0: '1.1.0', // Future version for additional features
  CURRENT: '1.0.0'
};

/**
 * Migration steps registry
 */
export const MIGRATION_STEPS: MigrationStep[] = [
  {
    fromVersion: SCHEMA_VERSIONS.LEGACY,
    toVersion: SCHEMA_VERSIONS.V1_0_0,
    description: 'Migrate legacy data to enhanced schema with reliability metrics',
    migrate: migrateLegacyToV1,
    validate: validateV1Schema
  }
  // Future migrations can be added here
];

/**
 * Data Migration Manager
 * Handles all data migration operations
 */
export class DataMigrationManager {
  private storageManager: EnhancedLocalStorageManager;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.storageManager = new EnhancedLocalStorageManager(userId);
  }

  /**
   * Checks if migration is needed and performs it
   */
  async checkAndMigrate(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    
    try {
      const currentData = this.getCurrentData();
      const currentVersion = this.detectCurrentVersion(currentData);
      
      if (currentVersion === SCHEMA_VERSIONS.CURRENT) {
        // No migration needed
        return results;
      }

      // Find migration path
      const migrationPath = this.findMigrationPath(currentVersion, SCHEMA_VERSIONS.CURRENT);
      
      if (migrationPath.length === 0) {
        throw new Error(`No migration path found from ${currentVersion} to ${SCHEMA_VERSIONS.CURRENT}`);
      }

      // Execute migrations in sequence
      let workingData = currentData;
      
      for (const step of migrationPath) {
        const result = await this.executeMigrationStep(step, workingData);
        results.push(result);
        
        if (!result.success) {
          throw new Error(`Migration failed at step ${step.fromVersion} -> ${step.toVersion}: ${result.error}`);
        }
        
        workingData = result.success ? this.getCurrentData() : workingData;
      }

      return results;
    } catch (error) {
      console.error('Migration process failed:', error);
      results.push({
        success: false,
        fromVersion: 'unknown',
        toVersion: SCHEMA_VERSIONS.CURRENT,
        error: error instanceof Error ? error.message : String(error),
        itemsMigrated: 0,
        duration: 0
      });
      return results;
    }
  }

  /**
   * Gets current data from storage
   */
  private getCurrentData(): any {
    try {
      const storageKey = `userScrapeData_${this.userId}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading current data:', error);
      return null;
    }
  }

  /**
   * Detects the current schema version
   */
  private detectCurrentVersion(data: any): string {
    if (!data) return SCHEMA_VERSIONS.LEGACY;
    if (data.schemaVersion) return data.schemaVersion;
    
    // Check for legacy data patterns
    if (data.totalScrapes !== undefined || data.courses !== undefined) {
      return SCHEMA_VERSIONS.LEGACY;
    }
    
    return SCHEMA_VERSIONS.LEGACY;
  }

  /**
   * Finds the migration path between two versions
   */
  private findMigrationPath(fromVersion: string, toVersion: string): MigrationStep[] {
    const path: MigrationStep[] = [];
    let currentVersion = fromVersion;
    
    while (currentVersion !== toVersion) {
      const nextStep = MIGRATION_STEPS.find(step => step.fromVersion === currentVersion);
      
      if (!nextStep) {
        console.error(`No migration step found from version ${currentVersion}`);
        break;
      }
      
      path.push(nextStep);
      currentVersion = nextStep.toVersion;
      
      // Prevent infinite loops
      if (path.length > 10) {
        console.error('Migration path too long, possible circular dependency');
        break;
      }
    }
    
    return path;
  }

  /**
   * Executes a single migration step
   */
  private async executeMigrationStep(step: MigrationStep, data: any): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Executing migration: ${step.description}`);
      
      // Perform the migration
      const migratedData = step.migrate(data);
      
      // Validate the result if validator is provided
      if (step.validate && !step.validate(migratedData)) {
        throw new Error('Migration validation failed');
      }
      
      // Save the migrated data
      const enhanced = migratedData as EnhancedLocalData;
      const saved = this.storageManager.saveEnhancedData(enhanced);
      
      if (!saved) {
        throw new Error('Failed to save migrated data');
      }
      
      // Record migration in the data
      enhanced.migration.migrationHistory.push({
        fromVersion: step.fromVersion,
        toVersion: step.toVersion,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      enhanced.migration.currentVersion = step.toVersion;
      enhanced.migration.lastMigrationAt = new Date().toISOString();
      
      this.storageManager.saveEnhancedData(enhanced);
      
      const duration = Date.now() - startTime;
      const itemsMigrated = this.countDataItems(migratedData);
      
      console.log(`Migration completed: ${step.fromVersion} -> ${step.toVersion} (${duration}ms, ${itemsMigrated} items)`);
      
      return {
        success: true,
        fromVersion: step.fromVersion,
        toVersion: step.toVersion,
        itemsMigrated,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`Migration failed: ${step.fromVersion} -> ${step.toVersion}:`, error);
      
      return {
        success: false,
        fromVersion: step.fromVersion,
        toVersion: step.toVersion,
        error: errorMessage,
        itemsMigrated: 0,
        duration
      };
    }
  }

  /**
   * Counts data items for migration reporting
   */
  private countDataItems(data: any): number {
    let count = 0;
    
    if (data.courses) count += data.courses.length;
    if (data.quizzes) count += data.quizzes.length;
    if (data.assignments) count += data.assignments.length;
    if (data.absences) count += data.absences.length;
    if (data.grades) count += data.grades.length;
    
    return count;
  }

  /**
   * Creates a backup before migration
   */
  async createPreMigrationBackup(): Promise<boolean> {
    try {
      const data = this.storageManager.getEnhancedData();
      return this.storageManager.createBackup();
    } catch (error) {
      console.error('Failed to create pre-migration backup:', error);
      return false;
    }
  }

  /**
   * Validates data integrity after migration
   */
  validateMigrationIntegrity(data: EnhancedLocalData): boolean {
    try {
      // Check required properties exist
      const requiredProps: (keyof EnhancedLocalData)[] = ['schemaVersion', 'reliability', 'backup', 'monitoring', 'migration', 'preferences'];
      for (const prop of requiredProps) {
        if (!data[prop]) {
          console.error(`Missing required property: ${prop}`);
          return false;
        }
      }

      // Check data arrays are valid
      const arrayProps: (keyof EnhancedLocalData)[] = ['courses', 'quizzes', 'assignments', 'absences', 'grades'];
      for (const prop of arrayProps) {
        if (data[prop] && !Array.isArray(data[prop])) {
          console.error(`Property ${prop} should be an array`);
          return false;
        }
      }

      // Check reliability metrics
      if (typeof data.reliability.dataIntegrity !== 'number' || 
          data.reliability.dataIntegrity < 0 || 
          data.reliability.dataIntegrity > 100) {
        console.error('Invalid data integrity value');
        return false;
      }

      // Check monitoring data
      if (!Array.isArray(data.monitoring.operationLog) ||
          !Array.isArray(data.monitoring.errorHistory)) {
        console.error('Invalid monitoring data structure');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Migration integrity validation failed:', error);
      return false;
    }
  }
}

/**
 * Migrates legacy data to version 1.0.0
 */
function migrateLegacyToV1(legacyData: any): EnhancedLocalData {
  const enhanced: EnhancedLocalData = {
    ...DEFAULT_ENHANCED_DATA,
    schemaVersion: SCHEMA_VERSIONS.V1_0_0,
    
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

  // Calculate initial reliability metrics
  enhanced.reliability.dataIntegrity = calculateLegacyDataIntegrity(legacyData);
  enhanced.reliability.lastSuccessfulScrape = legacyData.lastUpdated || '';
  enhanced.reliability.systemHealth = enhanced.reliability.dataIntegrity >= 80 ? 'healthy' : 'degraded';
  
  // Initialize monitoring with legacy operation if available
  if (legacyData.totalScrapes > 0) {
    enhanced.monitoring.performanceMetrics.totalOperations = legacyData.totalScrapes;
    enhanced.monitoring.performanceMetrics.successfulOperations = legacyData.totalScrapes;
  }

  // Set migration info
  enhanced.migration.currentVersion = SCHEMA_VERSIONS.V1_0_0;
  enhanced.migration.lastMigrationAt = new Date().toISOString();

  return enhanced;
}

/**
 * Validates version 1.0.0 schema
 */
function validateV1Schema(data: any): boolean {
  return data.schemaVersion === SCHEMA_VERSIONS.V1_0_0 &&
         data.reliability &&
         data.backup &&
         data.monitoring &&
         data.migration &&
         data.preferences;
}

/**
 * Calculates data integrity from legacy data
 */
function calculateLegacyDataIntegrity(legacyData: any): number {
  const totalScrapes = legacyData.totalScrapes || 0;
  if (totalScrapes === 0) return 100;
  
  // Calculate based on data completeness
  let completenessScore = 0;
  let totalChecks = 0;
  
  // Check for presence of different data types
  const dataTypes = ['courses', 'quizzes', 'assignments', 'absences', 'grades'];
  
  dataTypes.forEach(type => {
    totalChecks++;
    if (legacyData[type] && Array.isArray(legacyData[type]) && legacyData[type].length > 0) {
      completenessScore++;
    }
  });
  
  // Check for recent updates
  if (legacyData.lastUpdated) {
    const lastUpdate = new Date(legacyData.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate < 24) {
      completenessScore += 0.5; // Bonus for recent data
    }
  }
  
  return Math.min(100, Math.round((completenessScore / totalChecks) * 100));
}

/**
 * Utility function to check if migration is needed
 */
export function isMigrationNeeded(userId: string): boolean {
  try {
    const storageKey = `userScrapeData_${userId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return false;
    
    const data = JSON.parse(stored);
    return !data.schemaVersion || data.schemaVersion !== SCHEMA_VERSIONS.CURRENT;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Utility function to get migration status
 */
export function getMigrationStatus(userId: string): {
  needsMigration: boolean;
  currentVersion: string;
  targetVersion: string;
  migrationHistory: any[];
} {
  try {
    const manager = new EnhancedLocalStorageManager(userId);
    const data = manager.getEnhancedData();
    
    return {
      needsMigration: data.schemaVersion !== SCHEMA_VERSIONS.CURRENT,
      currentVersion: data.schemaVersion,
      targetVersion: SCHEMA_VERSIONS.CURRENT,
      migrationHistory: data.migration.migrationHistory
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    return {
      needsMigration: true,
      currentVersion: SCHEMA_VERSIONS.LEGACY,
      targetVersion: SCHEMA_VERSIONS.CURRENT,
      migrationHistory: []
    };
  }
}