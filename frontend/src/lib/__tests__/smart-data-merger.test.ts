// /frontend/src/lib/__tests__/smart-data-merger.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SmartDataMerger, createSmartDataMerger, quickMergeData } from '../smart-data-merger';

describe('SmartDataMerger', () => {
  let merger: SmartDataMerger;

  beforeEach(() => {
    merger = new SmartDataMerger();
  });

  describe('Basic Functionality', () => {
    it('should handle empty data correctly', () => {
      const result = merger.mergeScrapedData(null, null);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('Both datasets are empty');
      expect(result.confidence).toBe(0);
    });

    it('should use new data when no existing data', () => {
      const newData = { quizzes: [], assignments: [], lastUpdated: '2025-01-01' };
      const result = merger.mergeScrapedData(null, newData);
      
      expect(result.skipped).toBe(false);
      expect(result.merged).toEqual(newData);
      expect(result.reason).toContain('No existing data');
      expect(result.confidence).toBe(1);
    });

    it('should preserve existing data when no new data', () => {
      const existingData = { quizzes: [], assignments: [], lastUpdated: '2025-01-01' };
      const result = merger.mergeScrapedData(existingData, null);
      
      expect(result.skipped).toBe(true);
      expect(result.merged).toEqual(existingData);
      expect(result.reason).toContain('No new data provided');
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect identical data as duplicates', () => {
      const data = {
        quizzes: [{ id: '1', name: 'Quiz 1', course: 'Math' }],
        assignments: [{ id: '1', name: 'Assignment 1', course: 'Math' }],
        lastUpdated: '2025-01-01T10:00:00Z'
      };

      const result = merger.mergeScrapedData(data, data);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('duplicate detected');
      expect(result.duplicatesFound).toBe(1);
    });

    it('should detect near-duplicates with high similarity', () => {
      const existingData = {
        quizzes: [{ id: '1', name: 'Quiz 1', course: 'Math' }],
        lastUpdated: '2025-01-01T10:00:00Z'
      };

      const newData = {
        quizzes: [{ id: '1', name: 'Quiz 1', course: 'Math' }],
        lastUpdated: '2025-01-01T10:00:15Z' // 15 seconds later
      };

      const result = merger.mergeScrapedData(existingData, newData);
      expect(result.skipped).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.85);
    });

    it('should not treat similar but different data as duplicates', () => {
      const existingData = {
        quizzes: [{ id: '1', name: 'Quiz 1', course: 'Math' }],
        lastUpdated: '2025-01-01T10:00:00Z'
      };

      const newData = {
        quizzes: [{ id: '2', name: 'Quiz 2', course: 'Science' }],
        lastUpdated: '2025-01-01T11:00:00Z'
      };

      const result = merger.mergeScrapedData(existingData, newData);
      expect(result.skipped).toBe(false);
      expect(result.merged.quizzes).toHaveLength(2);
    });
  });

  describe('Hash Generation', () => {
    it('should generate consistent hashes for identical data', () => {
      const data1 = { name: 'Test', value: 123 };
      const data2 = { name: 'Test', value: 123 };
      
      // Access private method through type assertion for testing
      const hash1 = (merger as any).generateDataHash(data1);
      const hash2 = (merger as any).generateDataHash(data2);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
    });

    it('should generate different hashes for different data', () => {
      const data1 = { name: 'Test1', value: 123 };
      const data2 = { name: 'Test2', value: 456 };
      
      const hash1 = (merger as any).generateDataHash(data1);
      const hash2 = (merger as any).generateDataHash(data2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should ignore timestamp fields in hash generation', () => {
      const data1 = { name: 'Test', timestamp: '2025-01-01T10:00:00Z' };
      const data2 = { name: 'Test', timestamp: '2025-01-01T11:00:00Z' };
      
      const hash1 = (merger as any).generateDataHash(data1);
      const hash2 = (merger as any).generateDataHash(data2);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('Timestamp Analysis', () => {
    it('should calculate timestamp differences correctly', () => {
      const existing = { lastUpdated: '2025-01-01T10:00:00Z' };
      const incoming = { lastUpdated: '2025-01-01T10:00:30Z' };
      
      const diff = (merger as any).calculateTimestampDifference(existing, incoming);
      expect(diff).toBe(30000); // 30 seconds in milliseconds
    });

    it('should extract timestamps from various fields', () => {
      const testCases = [
        { timestamp: '2025-01-01T10:00:00Z' },
        { lastUpdated: '2025-01-01T10:00:00Z' },
        { scraped_at: '2025-01-01T10:00:00Z' },
        { created_at: '2025-01-01T10:00:00Z' }
      ];

      for (const testCase of testCases) {
        const timestamp = (merger as any).extractTimestamp(testCase);
        expect(timestamp).toBeInstanceOf(Date);
        expect(timestamp.getTime()).toBe(new Date('2025-01-01T10:00:00Z').getTime());
      }
    });
  });

  describe('Content Similarity', () => {
    it('should calculate perfect similarity for identical objects', () => {
      const obj1 = { name: 'Test', value: 123, nested: { prop: 'value' } };
      const obj2 = { name: 'Test', value: 123, nested: { prop: 'value' } };
      
      const similarity = (merger as any).calculateContentSimilarity(obj1, obj2);
      expect(similarity).toBe(1);
    });

    it('should calculate partial similarity for partially matching objects', () => {
      const obj1 = { name: 'Test', value: 123, extra: 'field1' };
      const obj2 = { name: 'Test', value: 456, extra: 'field2' };
      
      const similarity = (merger as any).calculateContentSimilarity(obj1, obj2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle string similarity correctly', () => {
      const similarity1 = (merger as any).calculateStringSimilarity('hello', 'hello');
      expect(similarity1).toBe(1);

      const similarity2 = (merger as any).calculateStringSimilarity('hello', 'hallo');
      expect(similarity2).toBeGreaterThan(0.5);
      expect(similarity2).toBeLessThan(1);

      const similarity3 = (merger as any).calculateStringSimilarity('hello', 'world');
      expect(similarity3).toBeLessThan(0.5);
    });
  });

  describe('Array Merging', () => {
    it('should merge arrays without duplicates', () => {
      const existing = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];
      const incoming = [
        { id: '2', name: 'Item 2 Updated' },
        { id: '3', name: 'Item 3' }
      ];

      const merged = merger.mergeArrays(existing, incoming, 'id');
      expect(merged).toHaveLength(3);
      expect(merged.find(item => item.id === '2')?.name).toBe('Item 2 Updated');
      expect(merged.find(item => item.id === '3')).toBeTruthy();
    });

    it('should handle empty arrays', () => {
      const result1 = merger.mergeArrays([], [{ id: '1', name: 'Item 1' }], 'id');
      expect(result1).toHaveLength(1);

      const result2 = merger.mergeArrays([{ id: '1', name: 'Item 1' }], [], 'id');
      expect(result2).toHaveLength(1);

      const result3 = merger.mergeArrays([], [], 'id');
      expect(result3).toHaveLength(0);
    });

    it('should respect max array size limit', () => {
      const merger = new SmartDataMerger({ maxArrayMergeSize: 5 });
      const largeArray = Array.from({ length: 10 }, (_, i) => ({ id: i.toString(), name: `Item ${i}` }));
      
      const merged = merger.mergeArrays(largeArray, [], 'id');
      expect(merged).toHaveLength(5);
    });
  });

  describe('Merge Strategies', () => {
    it('should use timestamp-based merge for data with timestamps', () => {
      const existingData = {
        quizzes: [{ id: '1', name: 'Quiz 1' }],
        lastUpdated: '2025-01-01T10:00:00Z',
        totalScrapes: 5
      };

      const newData = {
        quizzes: [{ id: '2', name: 'Quiz 2' }],
        lastUpdated: '2025-01-01T11:00:00Z',
        totalScrapes: 1
      };

      const result = merger.mergeScrapedData(existingData, newData);
      expect(result.strategy).toBe('timestamp_based_merge');
      expect(result.merged.quizzes).toHaveLength(2);
      expect(result.merged.totalScrapes).toBe(6); // Combined
    });

    it('should use content-based merge for similar content', () => {
      const merger = new SmartDataMerger({ 
        enableTimestampBasedMerging: false,
        duplicateThreshold: 0.9 
      });

      const existingData = {
        quizzes: [{ id: '1', name: 'Quiz 1' }],
        course: 'Math'
      };

      const newData = {
        quizzes: [{ id: '1', name: 'Quiz 1' }],
        course: 'Math',
        extraField: 'new data'
      };

      const result = merger.mergeScrapedData(existingData, newData);
      expect(result.strategy).toBe('content_based_merge');
      expect(result.merged.extraField).toBe('new data');
    });

    it('should fall back to additive merge when no specific strategy applies', () => {
      const merger = new SmartDataMerger({ 
        enableTimestampBasedMerging: false,
        enableContentBasedMerging: false
      });

      const existingData = { quizzes: [{ id: '1', name: 'Quiz 1' }] };
      const newData = { assignments: [{ id: '1', name: 'Assignment 1' }] };

      const result = merger.mergeScrapedData(existingData, newData);
      expect(result.strategy).toBe('additive_merge');
      expect(result.merged.quizzes).toBeTruthy();
      expect(result.merged.assignments).toBeTruthy();
    });
  });

  describe('Data Quality Assessment', () => {
    it('should calculate data quality score correctly', () => {
      const highQualityData = {
        lastUpdated: new Date().toISOString(),
        totalScrapes: 10,
        quizzes: [{ id: '1', name: 'Quiz 1' }],
        assignments: [{ id: '1', name: 'Assignment 1' }],
        absences: [{ id: '1', date: '2025-01-01' }],
        courses: ['Math', 'Science']
      };

      const lowQualityData = {
        // Missing most fields
        quizzes: []
      };

      const highScore = (merger as any).calculateDataQuality(highQualityData);
      const lowScore = (merger as any).calculateDataQuality(lowQualityData);

      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore).toBeGreaterThan(0.8);
      expect(lowScore).toBeLessThan(0.5);
    });
  });

  describe('Statistics and History', () => {
    it('should track merge statistics', () => {
      const data1 = { quizzes: [{ id: '1', name: 'Quiz 1' }] };
      const data2 = { assignments: [{ id: '1', name: 'Assignment 1' }] };

      merger.mergeScrapedData(data1, data2);
      merger.mergeScrapedData(data1, data1); // Duplicate

      const stats = merger.getMergeStatistics();
      expect(stats.totalMerges).toBe(2);
      expect(stats.duplicatesSkipped).toBe(1);
      expect(stats.successfulMerges).toBe(1);
    });

    it('should clear merge history', () => {
      const data1 = { quizzes: [{ id: '1', name: 'Quiz 1' }] };
      const data2 = { assignments: [{ id: '1', name: 'Assignment 1' }] };

      merger.mergeScrapedData(data1, data2);
      
      let stats = merger.getMergeStatistics();
      expect(stats.totalMerges).toBe(1);

      merger.clearMergeHistory();
      
      stats = merger.getMergeStatistics();
      expect(stats.totalMerges).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should respect custom configuration', () => {
      const customMerger = new SmartDataMerger({
        duplicateThreshold: 0.5,
        timestampToleranceMs: 60000,
        enableStructuralAnalysis: false
      });

      // Test that configuration is applied
      expect((customMerger as any).config.duplicateThreshold).toBe(0.5);
      expect((customMerger as any).config.timestampToleranceMs).toBe(60000);
      expect((customMerger as any).config.enableStructuralAnalysis).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should create merger with default config', () => {
      const merger = createSmartDataMerger();
      expect(merger).toBeInstanceOf(SmartDataMerger);
    });

    it('should create merger with custom config', () => {
      const merger = createSmartDataMerger({ duplicateThreshold: 0.7 });
      expect((merger as any).config.duplicateThreshold).toBe(0.7);
    });

    it('should perform quick merge with default settings', () => {
      const data1 = { quizzes: [{ id: '1', name: 'Quiz 1' }] };
      const data2 = { assignments: [{ id: '1', name: 'Assignment 1' }] };

      const result = quickMergeData(data1, data2);
      expect(result.merged.quizzes).toBeTruthy();
      expect(result.merged.assignments).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', () => {
      const data1 = { field1: null, field2: undefined, field3: 'value' };
      const data2 = { field1: 'new value', field2: 'another value', field4: 'extra' };

      const result = merger.mergeScrapedData(data1, data2);
      expect(result.merged.field1).toBe('new value');
      expect(result.merged.field2).toBe('another value');
      expect(result.merged.field3).toBe('value');
      expect(result.merged.field4).toBe('extra');
    });

    it('should handle circular references gracefully', () => {
      const data1: any = { name: 'test' };
      data1.self = data1; // Circular reference

      const data2 = { name: 'test2', value: 123 };

      // Should not throw an error
      expect(() => {
        merger.mergeScrapedData(data1, data2);
      }).not.toThrow();
    });

    it('should handle very large datasets', () => {
      const largeData1 = {
        quizzes: Array.from({ length: 1000 }, (_, i) => ({ id: i.toString(), name: `Quiz ${i}` }))
      };
      const largeData2 = {
        assignments: Array.from({ length: 1000 }, (_, i) => ({ id: i.toString(), name: `Assignment ${i}` }))
      };

      const result = merger.mergeScrapedData(largeData1, largeData2);
      expect(result.merged.quizzes).toHaveLength(1000);
      expect(result.merged.assignments).toHaveLength(1000);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical DULMS scraper data structure', () => {
      const existingData = {
        lastUpdated: '2025-01-01T10:00:00Z',
        totalScrapes: 5,
        courses: ['Math 101', 'Science 201'],
        quizzes: [
          { id: 'q1', name: 'Math Quiz 1', course: 'Math 101', grade: '85%' },
          { id: 'q2', name: 'Science Quiz 1', course: 'Science 201' }
        ],
        assignments: [
          { id: 'a1', name: 'Math Assignment 1', course: 'Math 101', due_date: '2025-01-15' }
        ],
        absences: [
          { date: '2025-01-01', course: 'Math 101', type: 'Excused' }
        ]
      };

      const newData = {
        lastUpdated: '2025-01-01T11:00:00Z',
        totalScrapes: 1,
        courses: ['Math 101', 'Science 201', 'History 301'],
        quizzes: [
          { id: 'q2', name: 'Science Quiz 1', course: 'Science 201', grade: '92%' }, // Updated
          { id: 'q3', name: 'History Quiz 1', course: 'History 301' } // New
        ],
        assignments: [
          { id: 'a1', name: 'Math Assignment 1', course: 'Math 101', due_date: '2025-01-15', status: 'Submitted' }, // Updated
          { id: 'a2', name: 'Science Assignment 1', course: 'Science 201', due_date: '2025-01-20' } // New
        ],
        absences: [] // No new absences
      };

      const result = merger.mergeScrapedData(existingData, newData);
      
      expect(result.skipped).toBe(false);
      expect(result.merged.courses).toContain('History 301');
      expect(result.merged.quizzes).toHaveLength(3);
      expect(result.merged.assignments).toHaveLength(2);
      expect(result.merged.absences).toHaveLength(1);
      expect(result.merged.totalScrapes).toBe(6);
      
      // Check that updated data is preserved
      const updatedQuiz = result.merged.quizzes.find((q: any) => q.id === 'q2');
      expect(updatedQuiz.grade).toBe('92%');
      
      const updatedAssignment = result.merged.assignments.find((a: any) => a.id === 'a1');
      expect(updatedAssignment.status).toBe('Submitted');
    });
  });
});