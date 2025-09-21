// /frontend/src/lib/smart-data-merger-example.ts

/**
 * Example usage of SmartDataMerger in DULMS Watcher context
 * This file demonstrates how to integrate the SmartDataMerger with existing data processing
 */

import { SmartDataMerger, createSmartDataMerger, quickMergeData } from './smart-data-merger';

/**
 * Example: Integrating SmartDataMerger with existing scraper data processing
 */
export function integrateWithScraperData() {
  // Create a merger with custom configuration for DULMS data
  const merger = createSmartDataMerger({
    duplicateThreshold: 0.9, // High threshold for DULMS data accuracy
    timestampToleranceMs: 60000, // 1 minute tolerance for scraper timing
    enableTimestampBasedMerging: true,
    enableContentBasedMerging: true,
    maxArrayMergeSize: 500 // Reasonable limit for course data
  });

  // Example existing data from localStorage
  const existingData = {
    lastUpdated: '2025-01-18T10:00:00Z',
    totalScrapes: 15,
    courses: ['Math 101', 'Science 201'],
    quizzes: [
      { id: 'q1', name: 'Math Quiz 1', course: 'Math 101', grade: '85%' },
      { id: 'q2', name: 'Science Quiz 1', course: 'Science 201' }
    ],
    assignments: [
      { id: 'a1', name: 'Math Assignment 1', course: 'Math 101', due_date: '2025-01-20' }
    ],
    absences: [
      { date: '2025-01-15', course: 'Math 101', type: 'Excused' }
    ]
  };

  // Example new data from scraper
  const newScrapedData = {
    lastUpdated: '2025-01-18T11:00:00Z',
    totalScrapes: 1,
    courses: ['Math 101', 'Science 201', 'History 301'],
    quizzes: [
      { id: 'q2', name: 'Science Quiz 1', course: 'Science 201', grade: '92%' }, // Updated grade
      { id: 'q3', name: 'History Quiz 1', course: 'History 301' } // New quiz
    ],
    assignments: [
      { id: 'a1', name: 'Math Assignment 1', course: 'Math 101', due_date: '2025-01-20', status: 'Submitted' }, // Updated
      { id: 'a2', name: 'Science Assignment 1', course: 'Science 201', due_date: '2025-01-25' } // New
    ],
    absences: [] // No new absences
  };

  // Perform intelligent merge
  const mergeResult = merger.mergeScrapedData(existingData, newScrapedData);

  console.log('Merge Result:', {
    strategy: mergeResult.strategy,
    skipped: mergeResult.skipped,
    reason: mergeResult.reason,
    confidence: mergeResult.confidence,
    dataQuality: mergeResult.dataQualityScore,
    totalCourses: mergeResult.merged.courses?.length,
    totalQuizzes: mergeResult.merged.quizzes?.length,
    totalAssignments: mergeResult.merged.assignments?.length
  });

  return mergeResult.merged;
}

/**
 * Example: Handling duplicate detection scenarios
 */
export function demonstrateDuplicateDetection() {
  const merger = new SmartDataMerger();

  // Scenario 1: Identical data (should be skipped)
  const identicalData = {
    quizzes: [{ id: '1', name: 'Quiz 1', course: 'Math' }],
    lastUpdated: '2025-01-18T10:00:00Z'
  };

  const result1 = merger.mergeScrapedData(identicalData, identicalData);
  console.log('Identical data result:', result1.reason, result1.skipped);

  // Scenario 2: Near-duplicate with minor timestamp difference
  const nearDuplicate = {
    quizzes: [{ id: '1', name: 'Quiz 1', course: 'Math' }],
    lastUpdated: '2025-01-18T10:00:15Z' // 15 seconds later
  };

  const result2 = merger.mergeScrapedData(identicalData, nearDuplicate);
  console.log('Near-duplicate result:', result2.reason, result2.skipped);

  // Scenario 3: Similar but different data (should merge)
  const differentData = {
    quizzes: [{ id: '2', name: 'Quiz 2', course: 'Science' }],
    lastUpdated: '2025-01-18T11:00:00Z'
  };

  const result3 = merger.mergeScrapedData(identicalData, differentData);
  console.log('Different data result:', result3.reason, result3.skipped);
  console.log('Merged quizzes count:', result3.merged.quizzes?.length);

  return { result1, result2, result3 };
}

/**
 * Example: Integration with existing data processing pipeline
 */
export function enhanceDataProcessingPipeline(rawScrapedData: any, existingLocalData: any) {
  // Quick merge for simple cases
  if (!existingLocalData || !rawScrapedData) {
    return quickMergeData(existingLocalData, rawScrapedData);
  }

  // Advanced merge for complex scenarios
  const merger = createSmartDataMerger({
    duplicateThreshold: 0.85,
    enableStructuralAnalysis: true,
    preserveDataHistory: true
  });

  const result = merger.mergeScrapedData(existingLocalData, rawScrapedData);

  // Log merge statistics for monitoring
  const stats = merger.getMergeStatistics();
  console.log('Data merge statistics:', {
    totalMerges: stats.totalMerges,
    successRate: stats.successfulMerges / stats.totalMerges,
    averageConfidence: stats.averageConfidence,
    averageDataQuality: stats.averageDataQuality
  });

  // Return enhanced data with merge metadata
  return {
    ...result.merged,
    _mergeMetadata: {
      strategy: result.strategy,
      confidence: result.confidence,
      dataQuality: result.dataQualityScore,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Example: Error handling and fallback scenarios
 */
export function handleMergeErrors(existingData: any, newData: any) {
  try {
    const merger = new SmartDataMerger();
    const result = merger.mergeScrapedData(existingData, newData);

    if (result.confidence < 0.7) {
      console.warn('Low confidence merge detected:', result.reason);
      // Could trigger additional validation or user notification
    }

    if (result.dataQualityScore < 0.5) {
      console.warn('Low data quality detected, consider data validation');
      // Could trigger data cleanup or re-scraping
    }

    return result;
  } catch (error) {
    console.error('Merge operation failed:', error);
    
    // Fallback to simple merge or preserve existing data
    return {
      merged: existingData || newData || {},
      skipped: false,
      reason: 'Fallback merge due to error',
      confidence: 0.5,
      duplicatesFound: 0,
      dataQualityScore: 0.3,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Example: Performance monitoring and optimization
 */
export function monitorMergePerformance() {
  const merger = new SmartDataMerger();
  
  // Simulate multiple merge operations
  const testData = [
    { quizzes: [{ id: '1', name: 'Quiz 1' }] },
    { assignments: [{ id: '1', name: 'Assignment 1' }] },
    { absences: [{ date: '2025-01-18', course: 'Math' }] }
  ];

  const startTime = performance.now();
  
  let mergedData = {};
  for (const data of testData) {
    const result = merger.mergeScrapedData(mergedData, data);
    mergedData = result.merged;
  }

  const endTime = performance.now();
  const stats = merger.getMergeStatistics();

  console.log('Performance metrics:', {
    totalTime: `${(endTime - startTime).toFixed(2)}ms`,
    averageTimePerMerge: `${((endTime - startTime) / testData.length).toFixed(2)}ms`,
    totalMerges: stats.totalMerges,
    successRate: `${((stats.successfulMerges / stats.totalMerges) * 100).toFixed(1)}%`
  });

  return { mergedData, stats, performanceTime: endTime - startTime };
}

// Export all example functions for easy testing and demonstration
export const examples = {
  integrateWithScraperData,
  demonstrateDuplicateDetection,
  enhanceDataProcessingPipeline,
  handleMergeErrors,
  monitorMergePerformance
};