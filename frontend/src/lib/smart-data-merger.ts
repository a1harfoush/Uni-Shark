// /frontend/src/lib/smart-data-merger.ts

/**
 * Smart Data Merger for DULMS Watcher
 * Handles intelligent duplicate detection and merging of scraped data
 * with sophisticated timestamp-based and content-based analysis
 */

// Browser-compatible hash implementation (crypto import removed for browser compatibility)

export interface MergeResult {
  merged: any;
  skipped: boolean;
  reason: string;
  strategy?: string;
  confidence: number; // 0-1 score indicating merge confidence
  duplicatesFound: number;
  dataQualityScore: number; // 0-1 score indicating data quality
  similarity?: number; // 0-1 score indicating similarity (for duplicate detection)
  timestamp?: string; // Optional timestamp for history tracking
}

export interface DuplicateAnalysis {
  isDuplicate: boolean;
  similarity: number; // 0-1 score
  reasons: string[];
  timestampDiff: number; // milliseconds
  contentHash: string;
  structuralSimilarity: number; // 0-1 score
}

export interface MergeStrategy {
  name: string;
  priority: number;
  canHandle: (existing: any, incoming: any) => boolean;
  execute: (existing: any, incoming: any, analysis: DuplicateAnalysis) => MergeResult;
}

export interface SmartDataMergerConfig {
  duplicateThreshold: number; // 0-1, similarity threshold for duplicates
  timestampToleranceMs: number; // milliseconds tolerance for timestamp comparison
  contentHashAlgorithm: 'md5' | 'sha256';
  enableStructuralAnalysis: boolean;
  enableTimestampBasedMerging: boolean;
  enableContentBasedMerging: boolean;
  maxArrayMergeSize: number;
  preserveDataHistory: boolean;
}

/**
 * Main Smart Data Merger class
 */
export class SmartDataMerger {
  private config: SmartDataMergerConfig;
  private mergeStrategies: MergeStrategy[] = [];
  private mergeHistory: Map<string, MergeResult[]> = new Map();

  constructor(config?: Partial<SmartDataMergerConfig>) {
    this.config = {
      duplicateThreshold: 0.85,
      timestampToleranceMs: 30000, // 30 seconds
      contentHashAlgorithm: 'sha256',
      enableStructuralAnalysis: true,
      enableTimestampBasedMerging: true,
      enableContentBasedMerging: true,
      maxArrayMergeSize: 1000,
      preserveDataHistory: true,
      ...config
    };

    this.initializeMergeStrategies();
  }

  /**
   * Main entry point for merging scraped data
   */
  mergeScrapedData(existingData: any, newData: any, context?: Record<string, any>): MergeResult {
    if (!existingData && !newData) {
      return {
        merged: {},
        skipped: true,
        reason: 'Both datasets are empty',
        confidence: 0,
        duplicatesFound: 0,
        dataQualityScore: 0
      };
    }

    if (!existingData) {
      return {
        merged: newData,
        skipped: false,
        reason: 'No existing data, using new data',
        confidence: 1,
        duplicatesFound: 0,
        dataQualityScore: this.calculateDataQuality(newData)
      };
    }

    if (!newData) {
      return {
        merged: existingData,
        skipped: true,
        reason: 'No new data provided',
        confidence: 1,
        duplicatesFound: 0,
        dataQualityScore: this.calculateDataQuality(existingData)
      };
    }

    // Perform duplicate analysis
    const analysis = this.performDuplicateAnalysis(existingData, newData);

    // Check if data is truly duplicate
    if (analysis.isDuplicate && analysis.similarity > this.config.duplicateThreshold) {
      const result: MergeResult = {
        merged: existingData,
        skipped: true,
        reason: `Actual duplicate detected (similarity: ${(analysis.similarity * 100).toFixed(1)}%)`,
        confidence: analysis.similarity,
        duplicatesFound: 1,
        dataQualityScore: this.calculateDataQuality(existingData),
        similarity: analysis.similarity
      };

      this.recordMergeHistory('duplicate_skip', result);
      return result;
    }

    // Find appropriate merge strategy
    const strategy = this.findBestMergeStrategy(existingData, newData);
    
    if (!strategy) {
      const fallbackResult = this.performFallbackMerge(existingData, newData, analysis);
      this.recordMergeHistory('fallback', fallbackResult);
      return fallbackResult;
    }

    // Execute merge strategy
    const result = strategy.execute(existingData, newData, analysis);
    result.strategy = strategy.name;
    
    this.recordMergeHistory(strategy.name, result);
    return result;
  }

  /**
   * Performs comprehensive duplicate analysis
   */
  private performDuplicateAnalysis(existing: any, incoming: any): DuplicateAnalysis {
    const existingHash = this.generateDataHash(existing);
    const incomingHash = this.generateDataHash(incoming);
    
    // Timestamp analysis
    const timestampDiff = this.calculateTimestampDifference(existing, incoming);
    const isTimestampDuplicate = timestampDiff < this.config.timestampToleranceMs;

    // Content analysis
    const contentSimilarity = this.calculateContentSimilarity(existing, incoming);
    const isContentSimilar = contentSimilarity > this.config.duplicateThreshold;

    // Structural analysis
    const structuralSimilarity = this.config.enableStructuralAnalysis 
      ? this.calculateStructuralSimilarity(existing, incoming)
      : 0;

    // Overall similarity calculation
    const overallSimilarity = this.calculateOverallSimilarity(
      contentSimilarity,
      structuralSimilarity,
      isTimestampDuplicate ? 1 : 0
    );

    const reasons: string[] = [];
    if (existingHash === incomingHash) reasons.push('Identical content hash');
    if (isTimestampDuplicate) reasons.push(`Timestamps within ${this.config.timestampToleranceMs}ms`);
    if (isContentSimilar) reasons.push(`Content similarity: ${(contentSimilarity * 100).toFixed(1)}%`);
    if (structuralSimilarity > 0.8) reasons.push(`Structural similarity: ${(structuralSimilarity * 100).toFixed(1)}%`);

    return {
      isDuplicate: overallSimilarity > this.config.duplicateThreshold,
      similarity: overallSimilarity,
      reasons,
      timestampDiff,
      contentHash: existingHash === incomingHash ? existingHash : `${existingHash}|${incomingHash}`,
      structuralSimilarity
    };
  }

  /**
   * Generates a hash for data content
   */
  private generateDataHash(data: any): string {
    if (!data) return '';

    try {
      // Create a normalized version of the data for hashing
      const normalized = this.normalizeDataForHashing(data);
      const jsonString = this.safeStringify(normalized);
      
      // Use browser-compatible simple hash
      return this.simpleHash(jsonString);
    } catch (error) {
      console.warn('Hash generation failed:', error);
      return this.simpleHash(this.safeStringify(data));
    }
  }

  /**
   * Normalizes data for consistent hashing
   */
  private normalizeDataForHashing(data: any): any {
    if (data === null || data === undefined) return null;
    
    if (Array.isArray(data)) {
      return data
        .map(item => this.normalizeDataForHashing(item))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    
    if (typeof data === 'object') {
      const normalized: any = {};
      const keys = Object.keys(data).sort();
      
      for (const key of keys) {
        // Skip timestamp fields for hash consistency
        if (key.toLowerCase().includes('timestamp') || 
            key.toLowerCase().includes('updated') ||
            key.toLowerCase().includes('scraped')) {
          continue;
        }
        normalized[key] = this.normalizeDataForHashing(data[key]);
      }
      
      return normalized;
    }
    
    return data;
  }

  /**
   * Safe JSON stringify that handles circular references
   */
  private safeStringify(obj: any): string {
    const seen = new WeakSet();
    
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  }

  /**
   * Simple hash function for browser compatibility
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Calculates timestamp difference between datasets
   */
  private calculateTimestampDifference(existing: any, incoming: any): number {
    const existingTime = this.extractTimestamp(existing);
    const incomingTime = this.extractTimestamp(incoming);
    
    if (!existingTime || !incomingTime) return Infinity;
    
    return Math.abs(existingTime.getTime() - incomingTime.getTime());
  }

  /**
   * Extracts timestamp from data object
   */
  private extractTimestamp(data: any): Date | null {
    if (!data || typeof data !== 'object') return null;

    const timestampFields = [
      'timestamp', 'lastUpdated', 'scraped_at', 'created_at', 
      'updated_at', 'date', 'time', 'when'
    ];

    for (const field of timestampFields) {
      if (data[field]) {
        const date = new Date(data[field]);
        if (!isNaN(date.getTime())) return date;
      }
    }

    return null;
  }

  /**
   * Calculates content similarity between two objects
   */
  private calculateContentSimilarity(obj1: any, obj2: any): number {
    if (obj1 === obj2) return 1;
    if (!obj1 || !obj2) return 0;

    const keys1 = new Set(Object.keys(obj1));
    const keys2 = new Set(Object.keys(obj2));
    const allKeys = new Set([...keys1, ...keys2]);
    
    if (allKeys.size === 0) return 1;

    let matchingFields = 0;
    let totalFields = allKeys.size;

    for (const key of allKeys) {
      const val1 = obj1[key];
      const val2 = obj2[key];

      if (val1 === val2) {
        matchingFields++;
      } else if (typeof val1 === 'string' && typeof val2 === 'string') {
        // String similarity for text fields
        const stringSimilarity = this.calculateStringSimilarity(val1, val2);
        matchingFields += stringSimilarity;
      } else if (Array.isArray(val1) && Array.isArray(val2)) {
        // Array similarity
        const arraySimilarity = this.calculateArraySimilarity(val1, val2);
        matchingFields += arraySimilarity;
      } else if (typeof val1 === 'object' && typeof val2 === 'object' && val1 && val2) {
        // Recursive object similarity
        const objectSimilarity = this.calculateContentSimilarity(val1, val2);
        matchingFields += objectSimilarity;
      }
    }

    return matchingFields / totalFields;
  }

  /**
   * Calculates string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculates array similarity
   */
  private calculateArraySimilarity(arr1: any[], arr2: any[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const maxLength = Math.max(arr1.length, arr2.length);
    let matchingElements = 0;

    // Simple approach: count exact matches
    const set1 = new Set(arr1.map(item => JSON.stringify(item)));
    const set2 = new Set(arr2.map(item => JSON.stringify(item)));
    
    for (const item of set1) {
      if (set2.has(item)) matchingElements++;
    }

    return matchingElements / maxLength;
  }

  /**
   * Calculates structural similarity between objects
   */
  private calculateStructuralSimilarity(obj1: any, obj2: any): number {
    if (!obj1 || !obj2) return 0;

    const structure1 = this.extractStructure(obj1);
    const structure2 = this.extractStructure(obj2);

    return this.calculateContentSimilarity(structure1, structure2);
  }

  /**
   * Extracts the structure of an object (keys and types)
   */
  private extractStructure(obj: any, seen = new WeakSet()): any {
    if (obj === null || obj === undefined) return null;
    
    if (Array.isArray(obj)) {
      return {
        type: 'array',
        length: obj.length,
        elementTypes: obj.map(item => typeof item).slice(0, 5) // Sample first 5 elements
      };
    }
    
    if (typeof obj === 'object') {
      // Handle circular references
      if (seen.has(obj)) {
        return { type: 'object', circular: true };
      }
      seen.add(obj);
      
      const structure: any = { type: 'object', keys: {} };
      
      for (const key of Object.keys(obj)) {
        structure.keys[key] = this.extractStructure(obj[key], seen);
      }
      
      return structure;
    }
    
    return { type: typeof obj };
  }

  /**
   * Calculates overall similarity score
   */
  private calculateOverallSimilarity(
    contentSimilarity: number,
    structuralSimilarity: number,
    timestampSimilarity: number
  ): number {
    // Weighted average with content being most important
    const weights = {
      content: 0.6,
      structural: 0.3,
      timestamp: 0.1
    };

    return (
      contentSimilarity * weights.content +
      structuralSimilarity * weights.structural +
      timestampSimilarity * weights.timestamp
    );
  }

  /**
   * Finds the best merge strategy for the given data
   */
  private findBestMergeStrategy(existing: any, incoming: any): MergeStrategy | null {
    const applicableStrategies = this.mergeStrategies
      .filter(strategy => strategy.canHandle(existing, incoming))
      .sort((a, b) => b.priority - a.priority);

    return applicableStrategies[0] || null;
  }

  /**
   * Performs fallback merge when no specific strategy applies
   */
  private performFallbackMerge(existing: any, incoming: any, analysis: DuplicateAnalysis): MergeResult {
    // Simple merge strategy: use newer data for time-sensitive fields
    const merged = { ...existing };
    const incomingTimestamp = this.extractTimestamp(incoming);
    const existingTimestamp = this.extractTimestamp(existing);

    // If incoming data is newer, update timestamp-sensitive fields
    if (incomingTimestamp && existingTimestamp && incomingTimestamp > existingTimestamp) {
      merged.lastUpdated = incoming.lastUpdated || incomingTimestamp.toISOString();
      merged.totalScrapes = (existing.totalScrapes || 0) + 1;
    }

    // Merge arrays intelligently
    if (existing.quizzes && incoming.quizzes) {
      merged.quizzes = this.mergeArrays(existing.quizzes, incoming.quizzes, 'id');
    }
    if (existing.assignments && incoming.assignments) {
      merged.assignments = this.mergeArrays(existing.assignments, incoming.assignments, 'id');
    }
    if (existing.absences && incoming.absences) {
      merged.absences = this.mergeArrays(existing.absences, incoming.absences, 'date');
    }

    return {
      merged,
      skipped: false,
      reason: 'Fallback merge strategy applied',
      strategy: 'fallback',
      confidence: 0.7,
      duplicatesFound: 0,
      dataQualityScore: this.calculateDataQuality(merged)
    };
  }

  /**
   * Intelligently merges arrays based on a key field
   */
  mergeArrays(existingArray: any[], incomingArray: any[], keyField: string): any[] {
    if (!Array.isArray(existingArray)) existingArray = [];
    if (!Array.isArray(incomingArray)) incomingArray = [];

    const merged = [...existingArray];
    const existingKeys = new Set(existingArray.map(item => item[keyField]).filter(Boolean));

    for (const incomingItem of incomingArray) {
      const key = incomingItem[keyField];
      
      if (!key || !existingKeys.has(key)) {
        // New item, add it
        merged.push(incomingItem);
      } else {
        // Existing item, merge intelligently
        const existingIndex = merged.findIndex(item => item[keyField] === key);
        if (existingIndex !== -1) {
          merged[existingIndex] = this.mergeObjects(merged[existingIndex], incomingItem);
        }
      }
    }

    // Limit array size to prevent memory issues
    return merged.slice(0, this.config.maxArrayMergeSize);
  }

  /**
   * Merges two objects intelligently
   */
  private mergeObjects(existing: any, incoming: any): any {
    const merged = { ...existing };

    for (const key of Object.keys(incoming)) {
      if (incoming[key] !== null && incoming[key] !== undefined) {
        // Prefer newer timestamps
        if (key.toLowerCase().includes('timestamp') || key.toLowerCase().includes('updated')) {
          const existingTime = existing[key] ? new Date(existing[key]) : null;
          const incomingTime = new Date(incoming[key]);
          
          if (!existingTime || incomingTime > existingTime) {
            merged[key] = incoming[key];
          }
        } else {
          // For other fields, prefer non-empty values
          if (!existing[key] || (typeof incoming[key] === 'string' && incoming[key].length > 0)) {
            merged[key] = incoming[key];
          }
        }
      }
    }

    return merged;
  }

  /**
   * Calculates data quality score
   */
  private calculateDataQuality(data: any): number {
    if (!data || typeof data !== 'object') return 0;

    let score = 0;
    let factors = 0;

    // Check for required fields
    const requiredFields = ['lastUpdated', 'totalScrapes'];
    for (const field of requiredFields) {
      factors++;
      if (data[field]) score++;
    }

    // Check data completeness
    const dataArrays = ['quizzes', 'assignments', 'absences', 'courses'];
    for (const arrayField of dataArrays) {
      factors++;
      if (Array.isArray(data[arrayField]) && data[arrayField].length > 0) {
        score++;
      }
    }

    // Check for data freshness (within last 24 hours)
    if (data.lastUpdated) {
      factors++;
      const lastUpdate = new Date(data.lastUpdated);
      const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 24) score++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Records merge history for analysis
   */
  private recordMergeHistory(strategy: string, result: MergeResult): void {
    if (!this.config.preserveDataHistory) return;

    const history = this.mergeHistory.get(strategy) || [];
    history.push({
      ...result,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 entries per strategy
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.mergeHistory.set(strategy, history);
  }

  /**
   * Gets merge statistics
   */
  getMergeStatistics(): {
    totalMerges: number;
    successfulMerges: number;
    duplicatesSkipped: number;
    averageConfidence: number;
    averageDataQuality: number;
    strategiesUsed: Record<string, number>;
  } {
    let totalMerges = 0;
    let successfulMerges = 0;
    let duplicatesSkipped = 0;
    let totalConfidence = 0;
    let totalDataQuality = 0;
    const strategiesUsed: Record<string, number> = {};

    for (const [strategy, results] of this.mergeHistory.entries()) {
      strategiesUsed[strategy] = results.length;
      
      for (const result of results) {
        totalMerges++;
        if (!result.skipped) successfulMerges++;
        if (result.duplicatesFound > 0) duplicatesSkipped++;
        totalConfidence += result.confidence;
        totalDataQuality += result.dataQualityScore;
      }
    }

    return {
      totalMerges,
      successfulMerges,
      duplicatesSkipped,
      averageConfidence: totalMerges > 0 ? totalConfidence / totalMerges : 0,
      averageDataQuality: totalMerges > 0 ? totalDataQuality / totalMerges : 0,
      strategiesUsed
    };
  }

  /**
   * Clears merge history
   */
  clearMergeHistory(): void {
    this.mergeHistory.clear();
  }

  /**
   * Initializes merge strategies
   */
  private initializeMergeStrategies(): void {
    this.mergeStrategies = [
      {
        name: 'timestamp_based_merge',
        priority: 3,
        canHandle: (existing: any, incoming: any) => {
          return this.config.enableTimestampBasedMerging &&
                 this.extractTimestamp(existing) !== null &&
                 this.extractTimestamp(incoming) !== null;
        },
        execute: (existing: any, incoming: any, analysis: DuplicateAnalysis) => {
          const existingTime = this.extractTimestamp(existing);
          const incomingTime = this.extractTimestamp(incoming);
          
          // Use newer data as base, merge older data selectively
          const [newer, older] = incomingTime! > existingTime! ? [incoming, existing] : [existing, incoming];
          const merged = { ...newer };
          
          // Preserve historical data from older dataset
          if (older.totalScrapes) {
            merged.totalScrapes = (newer.totalScrapes || 0) + (older.totalScrapes || 0);
          }
          
          // Merge arrays
          merged.quizzes = this.mergeArrays(older.quizzes || [], newer.quizzes || [], 'id');
          merged.assignments = this.mergeArrays(older.assignments || [], newer.assignments || [], 'id');
          merged.absences = this.mergeArrays(older.absences || [], newer.absences || [], 'date');

          return {
            merged,
            skipped: false,
            reason: `Merged based on timestamps (${Math.abs(analysis.timestampDiff)}ms difference)`,
            confidence: 0.9,
            duplicatesFound: 0,
            dataQualityScore: this.calculateDataQuality(merged)
          };
        }
      },
      {
        name: 'content_based_merge',
        priority: 2,
        canHandle: (existing: any, incoming: any) => {
          return this.config.enableContentBasedMerging &&
                 this.calculateContentSimilarity(existing, incoming) > 0.5 &&
                 this.calculateContentSimilarity(existing, incoming) < this.config.duplicateThreshold;
        },
        execute: (existing: any, incoming: any, analysis: DuplicateAnalysis) => {
          // Intelligent content-based merge
          const merged = { ...existing };
          
          // Update with non-empty values from incoming data
          for (const key of Object.keys(incoming)) {
            if (incoming[key] && (!existing[key] || 
                (typeof incoming[key] === 'string' && incoming[key].length > (existing[key]?.length || 0)))) {
              merged[key] = incoming[key];
            }
          }
          
          // Merge arrays intelligently
          merged.quizzes = this.mergeArrays(existing.quizzes || [], incoming.quizzes || [], 'id');
          merged.assignments = this.mergeArrays(existing.assignments || [], incoming.assignments || [], 'id');
          merged.absences = this.mergeArrays(existing.absences || [], incoming.absences || [], 'date');
          
          // Update metadata
          merged.lastUpdated = new Date().toISOString();
          merged.totalScrapes = (existing.totalScrapes || 0) + 1;

          return {
            merged,
            skipped: false,
            reason: `Content-based merge (${(analysis.similarity * 100).toFixed(1)}% similarity)`,
            confidence: analysis.similarity,
            duplicatesFound: 0,
            dataQualityScore: this.calculateDataQuality(merged)
          };
        }
      },
      {
        name: 'additive_merge',
        priority: 1,
        canHandle: () => true, // Fallback strategy
        execute: (existing: any, incoming: any, analysis: DuplicateAnalysis) => {
          // Simple additive merge - combine all data
          const merged = { ...existing, ...incoming };
          
          // Merge arrays additively
          merged.quizzes = this.mergeArrays(existing.quizzes || [], incoming.quizzes || [], 'id');
          merged.assignments = this.mergeArrays(existing.assignments || [], incoming.assignments || [], 'id');
          merged.absences = this.mergeArrays(existing.absences || [], incoming.absences || [], 'date');
          
          // Update metadata
          merged.lastUpdated = new Date().toISOString();
          merged.totalScrapes = (existing.totalScrapes || 0) + 1;

          return {
            merged,
            skipped: false,
            reason: 'Additive merge strategy',
            confidence: 0.6,
            duplicatesFound: 0,
            dataQualityScore: this.calculateDataQuality(merged)
          };
        }
      }
    ];
  }
}

/**
 * Utility function to create a SmartDataMerger instance with default config
 */
export function createSmartDataMerger(config?: Partial<SmartDataMergerConfig>): SmartDataMerger {
  return new SmartDataMerger(config);
}

/**
 * Utility function for quick data merging with default settings
 */
export function quickMergeData(existingData: any, newData: any): MergeResult {
  const merger = new SmartDataMerger();
  return merger.mergeScrapedData(existingData, newData);
}