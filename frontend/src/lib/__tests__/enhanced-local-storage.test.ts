// Enhanced Local Storage Tests
// Tests for the enhanced local storage schema and manager functionality

import {
  EnhancedLocalStorageManager,
  EnhancedLocalData,
  FailedOperation,
  OperationLog,
  ErrorRecord,
  DEFAULT_ENHANCED_DATA
} from '../enhanced-local-storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('EnhancedLocalStorageManager', () => {
  let manager: EnhancedLocalStorageManager;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    manager = new EnhancedLocalStorageManager(testUserId);
    localStorage.clear();
  });

  describe('Basic Operations', () => {
    test('should create manager with correct storage key', () => {
      expect(manager).toBeInstanceOf(EnhancedLocalStorageManager);
    });

    test('should return default data when no data exists', () => {
      const data = manager.getEnhancedData();
      expect(data).not.toBeNull();
      expect(data.schemaVersion).toBe('1.0.0');
      expect(data.reliability).toBeDefined();
      expect(data.backup).toBeDefined();
      expect(data.monitoring).toBeDefined();
    });

    test('should save and retrieve enhanced data', () => {
      const testData: EnhancedLocalData = {
        ...DEFAULT_ENHANCED_DATA,
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 5,
        courses: ['CS101', 'MATH201'],
        quizzes: [],
        assignments: [],
        absences: [],
        grades: []
      } as EnhancedLocalData;

      const saved = manager.saveEnhancedData(testData);
      expect(saved).toBe(true);

      const retrieved = manager.getEnhancedData();
      expect(retrieved).not.toBeNull();
      expect(retrieved!.courses).toEqual(['CS101', 'MATH201']);
      expect(retrieved!.totalScrapes).toBe(5);
      expect(retrieved!.schemaVersion).toBe('1.0.0');
    });
  });

  describe('Data Migration', () => {
    test('should migrate legacy data to enhanced schema', () => {
      // Create legacy data without enhanced fields
      const legacyData = {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 3,
        courses: ['CS101'],
        quizzes: [{ id: 1, title: 'Quiz 1' }],
        assignments: [],
        absences: [],
        grades: []
      };

      localStorage.setItem(`userScrapeData_${testUserId}`, JSON.stringify(legacyData));

      const data = manager.getEnhancedData();
      expect(data).not.toBeNull();
      expect(data!.schemaVersion).toBe('1.0.0');
      expect(data!.reliability).toBeDefined();
      expect(data!.backup).toBeDefined();
      expect(data!.monitoring).toBeDefined();
      expect(data!.courses).toEqual(['CS101']);
      expect(data!.totalScrapes).toBe(3);
    });

    test('should preserve existing data during migration', () => {
      const legacyData = {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 10,
        courses: ['CS101', 'MATH201', 'PHYS301'],
        quizzes: [
          { id: 1, title: 'Quiz 1', score: 85 },
          { id: 2, title: 'Quiz 2', score: 92 }
        ],
        assignments: [{ id: 1, title: 'Assignment 1', dueDate: '2024-01-15' }],
        absences: [{ date: '2024-01-10', reason: 'Sick' }],
        grades: [{ course: 'CS101', grade: 'A' }],
        course_registration: { semester: 'Fall 2024' }
      };

      localStorage.setItem(`userScrapeData_${testUserId}`, JSON.stringify(legacyData));

      const data = manager.getEnhancedData();
      expect(data).not.toBeNull();
      expect(data!.courses).toEqual(['CS101', 'MATH201', 'PHYS301']);
      expect(data!.quizzes).toHaveLength(2);
      expect(data!.assignments).toHaveLength(1);
      expect(data!.absences).toHaveLength(1);
      expect(data!.grades).toHaveLength(1);
      expect(data!.course_registration).toEqual({ semester: 'Fall 2024' });
      expect(data!.totalScrapes).toBe(10);
    });
  });

  describe('Backup and Recovery', () => {
    test('should create backup successfully', () => {
      const testData: EnhancedLocalData = {
        ...DEFAULT_ENHANCED_DATA,
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 5,
        courses: ['CS101'],
        quizzes: [{ id: 1, title: 'Quiz 1' }],
        assignments: [],
        absences: [],
        grades: []
      } as EnhancedLocalData;

      manager.saveEnhancedData(testData);
      const backupCreated = manager.createBackup();
      
      expect(backupCreated).toBe(true);

      const updatedData = manager.getEnhancedData();
      expect(updatedData!.backup.backupIntegrity).toBe(true);
      expect(updatedData!.backup.backupData).toBeDefined();
      expect(updatedData!.backup.backupData.courses).toEqual(['CS101']);
    });

    test('should restore from backup successfully', () => {
      // First create and save some data
      const initialData: EnhancedLocalData = {
        ...DEFAULT_ENHANCED_DATA,
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 5,
        courses: ['CS101', 'MATH201'],
        quizzes: [{ id: 1, title: 'Quiz 1' }],
        assignments: [],
        absences: [],
        grades: []
      } as EnhancedLocalData;

      manager.saveEnhancedData(initialData);
      
      // Create backup
      manager.createBackup();
      
      // Modify data
      const modifiedData = { ...initialData, courses: ['PHYS301'] };
      manager.saveEnhancedData(modifiedData);
      
      // Restore from backup
      const restored = manager.restoreFromBackup();
      
      expect(restored).toBe(true);
      
      const restoredData = manager.getEnhancedData();
      expect(restoredData!.backup.recoveryAttempts).toBe(1);
    });

    test('should handle backup failure gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = manager.createBackup();
      expect(result).toBe(false);

      // Restore original method
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Data Integrity and Health', () => {
    test('should calculate data integrity correctly', () => {
      const testData: EnhancedLocalData = {
        ...DEFAULT_ENHANCED_DATA,
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 10,
        courses: ['CS101', 'MATH201'],
        quizzes: [{ id: 1, title: 'Quiz 1' }],
        assignments: [{ id: 1, title: 'Assignment 1' }],
        absences: [],
        grades: []
      } as EnhancedLocalData;

      manager.saveEnhancedData(testData);
      const data = manager.getEnhancedData();
      
      // Should have good integrity with recent data and multiple data types
      expect(data.reliability.dataIntegrity).toBeGreaterThan(0);
    });

    test('should update system health based on consecutive failures', () => {
      const data = manager.getEnhancedData();
      
      // Initially should be healthy
      expect(data.reliability.systemHealth).toBe('healthy');
      expect(data.reliability.consecutiveFailures).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage read errors gracefully', () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });

      const data = manager.getEnhancedData();
      
      // Should return default data instead of throwing
      expect(data).not.toBeNull();
      expect(data.schemaVersion).toBe('1.0.0');

      // Restore original method
      localStorage.getItem = originalGetItem;
    });

    test('should handle localStorage write errors gracefully', () => {
      const testData: EnhancedLocalData = {
        ...DEFAULT_ENHANCED_DATA,
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 5,
        courses: ['CS101'],
        quizzes: [],
        assignments: [],
        absences: [],
        grades: []
      } as EnhancedLocalData;

      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const saved = manager.saveEnhancedData(testData);
      expect(saved).toBe(false);

      // Restore original method
      localStorage.setItem = originalSetItem;
    });

    test('should handle corrupted JSON data gracefully', () => {
      // Set corrupted JSON data
      localStorage.setItem(`userScrapeData_${testUserId}`, '{ invalid json }');

      const data = manager.getEnhancedData();
      
      // Should return default data instead of throwing
      expect(data).not.toBeNull();
      expect(data.schemaVersion).toBe('1.0.0');
    });
  });

  describe('Data Cleanup', () => {
    test('should cleanup old data to prevent storage bloat', () => {
      const testData: EnhancedLocalData = {
        ...DEFAULT_ENHANCED_DATA,
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 5,
        courses: ['CS101'],
        quizzes: [],
        assignments: [],
        absences: [],
        grades: []
      } as EnhancedLocalData;

      // Add many operation logs
      for (let i = 0; i < 1500; i++) {
        testData.monitoring.operationLog.push({
          id: `op-${i}`,
          timestamp: new Date().toISOString(),
          operation: 'test',
          operationType: 'data_processing',
          success: true,
          duration: 100
        });
      }

      // Add many error records
      for (let i = 0; i < 800; i++) {
        testData.monitoring.errorHistory.push({
          id: `error-${i}`,
          timestamp: new Date().toISOString(),
          error: `Error ${i}`,
          context: {},
          severity: 'low',
          resolved: false
        });
      }

      manager.saveEnhancedData(testData);
      const cleanedData = manager.getEnhancedData();

      // Should be cleaned up to reasonable limits
      expect(cleanedData.monitoring.operationLog.length).toBeLessThanOrEqual(1000);
      expect(cleanedData.monitoring.errorHistory.length).toBeLessThanOrEqual(500);
    });

    test('should maintain performance metrics operation times limit', () => {
      const testData: EnhancedLocalData = {
        ...DEFAULT_ENHANCED_DATA,
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 5,
        courses: ['CS101'],
        quizzes: [],
        assignments: [],
        absences: [],
        grades: []
      } as EnhancedLocalData;

      // Add many operation times
      for (let i = 0; i < 200; i++) {
        testData.monitoring.performanceMetrics.operationTimes.push(100 + i);
      }

      manager.saveEnhancedData(testData);
      const cleanedData = manager.getEnhancedData();

      // Should be cleaned up to 100 entries
      expect(cleanedData.monitoring.performanceMetrics.operationTimes.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Schema Validation', () => {
    test('should ensure all required properties exist after migration', () => {
      const legacyData = {
        lastUpdated: '2024-01-01T00:00:00.000Z',
        totalScrapes: 3,
        courses: ['CS101']
      };

      localStorage.setItem(`userScrapeData_${testUserId}`, JSON.stringify(legacyData));

      const data = manager.getEnhancedData();
      
      // Check all required properties exist
      expect(data.schemaVersion).toBeDefined();
      expect(data.reliability).toBeDefined();
      expect(data.backup).toBeDefined();
      expect(data.monitoring).toBeDefined();
      expect(data.migration).toBeDefined();
      expect(data.preferences).toBeDefined();
      
      // Check nested objects have required properties
      expect(data.reliability.dataIntegrity).toBeDefined();
      expect(data.reliability.systemHealth).toBeDefined();
      expect(data.reliability.failedOperations).toBeInstanceOf(Array);
      expect(data.reliability.retryQueue).toBeInstanceOf(Array);
      
      expect(data.backup.backupHistory).toBeInstanceOf(Array);
      expect(data.monitoring.operationLog).toBeInstanceOf(Array);
      expect(data.monitoring.errorHistory).toBeInstanceOf(Array);
      expect(data.monitoring.performanceMetrics).toBeDefined();
    });
  });
});