// Edge case tests for data processing functions
import {
  parseFlexibleDate,
  isWithinTimeframe,
  calculateTimeRemaining,
  transformScrapedDataToNotifications,
  filterUpcomingTargets,
  sanitizeDataForDisplay
} from '../data-processing';

describe('Data Processing Edge Cases', () => {
  
  describe('parseFlexibleDate edge cases', () => {
    it('should handle various date formats with "at" separator', () => {
      const testCases = [
        'Jul 20, 2025 at 09:30 PM',
        'Dec 31, 2024 at 11:59 PM',
        'Jan 1, 2026 at 12:00 AM',
        'Feb 29, 2024 at 06:30 AM', // Leap year
      ];

      testCases.forEach(dateStr => {
        const result = parseFlexibleDate(dateStr);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getTime()).not.toBeNaN();
      });
    });

    it('should handle day-of-week prefix with DD/MM/YYYY format', () => {
      const testCases = [
        'Mon, 01/01/2025',
        'Tue, 15/06/2025',
        'Wed, 31/12/2025',
        'Thu, 29/02/2024', // Leap year
        'Fri, 18/07/2025',
        'Sat, 19/07/2025',
        'Sun, 20/07/2025'
      ];

      testCases.forEach(dateStr => {
        const result = parseFlexibleDate(dateStr);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getTime()).not.toBeNaN();
      });
    });

    it('should handle malformed date strings gracefully', () => {
      const malformedDates = [
        'Invalid, 32/13/2025',
        'Jul 32, 2025 at 25:00 PM', // Invalid day and time
        'Random text with numbers 123',
        '2025-13-45T25:70:80.000Z', // Invalid ISO format
      ];

      malformedDates.forEach(dateStr => {
        const result = parseFlexibleDate(dateStr);
        expect(result).toBeNull();
      });
    });

    it('should handle timezone-aware dates', () => {
      const timezoneDates = [
        '2025-07-20T21:30:00.000Z',
        '2025-07-20T21:30:00+00:00',
        '2025-07-20T17:30:00-04:00',
      ];

      timezoneDates.forEach(dateStr => {
        const result = parseFlexibleDate(dateStr);
        expect(result).toBeInstanceOf(Date);
      });
    });
  });

  describe('calculateTimeRemaining edge cases', () => {
    it('should handle dates very close to current time', () => {
      const now = new Date();
      const oneSecondLater = new Date(now.getTime() + 1000);
      const result = calculateTimeRemaining(oneSecondLater.toISOString());
      expect(result).toBe('0m');
    });

    it('should handle dates exactly at current time', () => {
      const now = new Date();
      const result = calculateTimeRemaining(now.toISOString());
      expect(result).toBe('Overdue');
    });

    it('should handle very far future dates', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 10);
      const result = calculateTimeRemaining(farFuture.toISOString());
      expect(result).toMatch(/\d+d \d+h/);
    });

    it('should handle leap year dates', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00.000Z');
      const result = calculateTimeRemaining(leapYearDate.toISOString());
      expect(result).toBe('Overdue'); // This date is in the past
    });
  });

  describe('isWithinTimeframe edge cases', () => {
    it('should handle exact boundary conditions', () => {
      const now = new Date();
      
      // Exactly 7 days from now
      const exactlySevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(isWithinTimeframe(exactlySevenDays.toISOString(), 7)).toBe(true);
      
      // One millisecond over 7 days
      const justOverSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 1);
      expect(isWithinTimeframe(justOverSevenDays.toISOString(), 7)).toBe(false);
    });

    it('should handle zero timeframe', () => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      expect(isWithinTimeframe(oneHourLater.toISOString(), 0)).toBe(false);
    });

    it('should handle negative timeframe gracefully', () => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      expect(isWithinTimeframe(oneHourLater.toISOString(), -1)).toBe(false);
    });
  });

  describe('transformScrapedDataToNotifications edge cases', () => {
    it('should handle mixed valid and invalid data', () => {
      const mixedData = {
        absences: [
          { course: 'Valid Course', date: '2025-07-18', type: 'lecture' },
          { course: '', date: '', type: '' }, // Invalid
          { course: 'Another Valid', date: '2025-07-19', type: 'practical' },
          null, // Invalid
          undefined, // Invalid
        ],
        assignments: [
          { name: 'Valid Assignment', course: 'Math 101' },
          {}, // Invalid
          { name: '', course: '' }, // Invalid but will be sanitized
        ]
      };

      const result = transformScrapedDataToNotifications(mixedData, null);
      expect(result.length).toBeGreaterThan(0);
      
      // Should have sanitized the invalid entries
      result.forEach(notification => {
        expect(notification.title).toBeTruthy();
        expect(notification.type).toBeTruthy();
      });
    });

    it('should handle circular references in data', () => {
      const circularData: any = {
        absences: [{ course: 'Test Course', date: '2025-07-18', type: 'lecture' }]
      };
      circularData.self = circularData; // Create circular reference

      // Should not throw an error
      expect(() => {
        transformScrapedDataToNotifications(circularData, null);
      }).not.toThrow();
    });

    it('should handle very large datasets', () => {
      const largeData = {
        absences: Array.from({ length: 1000 }, (_, i) => ({
          course: `Course ${i}`,
          date: `2025-07-${String((i % 30) + 1).padStart(2, '0')}`,
          type: 'lecture'
        }))
      };

      const result = transformScrapedDataToNotifications(largeData, null);
      expect(result).toHaveLength(15); // Should be limited to 15
    });
  });

  describe('filterUpcomingTargets edge cases', () => {
    it('should handle assignments with both closed_at and due_date', () => {
      const now = new Date();
      const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const localData = {
        assignments: [{
          name: 'Assignment with both dates',
          course: 'Math 101',
          closed_at: twoDaysLater.toISOString(),
          due_date: threeDaysLater.toISOString() // Should use closed_at
        }]
      };

      const result = filterUpcomingTargets(localData, null, 7);
      expect(result).toHaveLength(1);
      expect(result[0].dueDate).toBe(twoDaysLater.toISOString());
    });

    it('should handle quizzes with grades (should be filtered out)', () => {
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const localData = {
        quizzes: [
          {
            name: 'Graded Quiz',
            course: 'Math 101',
            closed_at: threeDaysLater.toISOString(),
            grade: '85%' // Should be filtered out
          },
          {
            name: 'Ungraded Quiz',
            course: 'Physics 201',
            closed_at: threeDaysLater.toISOString()
            // No grade, should be included
          }
        ]
      };

      const result = filterUpcomingTargets(localData, null, 7);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Ungraded Quiz');
    });

    it('should handle mixed data sources (local and dashboard)', () => {
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const localData = {
        assignments: [{
          name: 'Local Assignment',
          course: 'Math 101',
          closed_at: threeDaysLater.toISOString()
        }]
      };

      const dashboardData = {
        last_scrape: {
          scraped_data: {
            assignments: {
              assignments: [{
                name: 'Dashboard Assignment',
                course: 'Physics 201',
                closed_at: threeDaysLater.toISOString()
              }]
            }
          }
        }
      };

      const result = filterUpcomingTargets(localData, dashboardData, 7);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toContain('Local Assignment');
      expect(result.map(r => r.name)).toContain('Dashboard Assignment');
    });
  });

  describe('sanitizeDataForDisplay edge cases', () => {
    it('should handle deeply nested objects', () => {
      const nestedData = {
        name: 'Test',
        nested: {
          deep: {
            value: 'should be preserved'
          }
        }
      };

      const result = sanitizeDataForDisplay(nestedData, ['name']);
      expect(result.name).toBe('Test');
      expect(result.nested.deep.value).toBe('should be preserved');
    });

    it('should handle arrays in data', () => {
      const dataWithArrays = {
        name: 'Test',
        tags: ['tag1', 'tag2', 'tag3'],
        scores: [85, 90, 78]
      };

      const result = sanitizeDataForDisplay(dataWithArrays, ['name']);
      expect(result.name).toBe('Test');
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(result.scores).toEqual([85, 90, 78]);
    });

    it('should handle special characters in field names', () => {
      const specialData = {
        'field-with-dashes': 'value1',
        'field_with_underscores': 'value2',
        'field with spaces': 'value3',
        'field.with.dots': 'value4'
      };

      const result = sanitizeDataForDisplay(specialData);
      expect(result['field-with-dashes']).toBe('value1');
      expect(result['field_with_underscores']).toBe('value2');
      expect(result['field with spaces']).toBe('value3');
      expect(result['field.with.dots']).toBe('value4');
    });

    it('should handle boolean and numeric values', () => {
      const mixedData = {
        isActive: true,
        count: 42,
        percentage: 85.5,
        isCompleted: false,
        nullValue: null,
        undefinedValue: undefined
      };

      const result = sanitizeDataForDisplay(mixedData);
      expect(result.isActive).toBe(true);
      expect(result.count).toBe(42);
      expect(result.percentage).toBe(85.5);
      expect(result.isCompleted).toBe(false);
      expect(result.nullValue).toBeNull();
      expect(result.undefinedValue).toBeUndefined();
    });
  });
});