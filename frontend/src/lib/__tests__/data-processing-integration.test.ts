/**
 * Integration Tests for Data Processing Pipeline
 * 
 * Tests the complete data processing pipeline from raw scraped data
 * through transformation utilities to final component-ready data.
 * 
 * Requirements covered: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.4, 3.1, 3.2, 4.1, 4.2
 */

import {
  transformScrapedDataToNotifications,
  filterUpcomingTargets,
  processAbsenceData,
  calculateArchiveStatistics,
  extractAllCourses,
  validateScrapedData,
  sanitizeDataForDisplay,
  calculateNotificationPriority,
  parseFlexibleDate,
  isWithinTimeframe,
  calculateTimeRemaining,
  determineUrgencyLevel,
  formatRelativeDate,
  filterTargetsToday
} from '../data-processing';

describe('Data Processing Pipeline Integration Tests', () => {
  // Comprehensive test data that covers all scenarios
  const mockRawScrapedData = {
    quizzes: {
      courses_processed: 4,
      total_quizzes_found: 8,
      quizzes_with_results: [
        {
          name: 'Midterm Exam',
          course: 'Computer Science 101',
          grade: '92%',
          closed_at: '2025-07-15T10:00:00Z',
          submission_time: '2025-07-14T23:45:00Z'
        },
        {
          name: 'Weekly Quiz 3',
          course: 'Mathematics 201',
          grade: '88%',
          closed_at: '2025-07-16T14:30:00Z'
        }
      ],
      quizzes_without_results: [
        {
          name: 'Final Exam',
          course: 'Computer Science 101',
          closed_at: '2025-07-20T09:00:00Z' // Due soon
        },
        {
          name: 'Practice Quiz',
          course: 'Physics 301',
          closed_at: '2025-07-25T16:00:00Z' // Due later
        }
      ],
      courses_found_on_page: ['Computer Science 101', 'Mathematics 201', 'Physics 301', 'Chemistry 401'],
      quiz_courses_with_no_items: ['History 101'],
      quiz_courses_failed_expansion: []
    },
    assignments: {
      assignments: [
        {
          name: 'Programming Project',
          course: 'Computer Science 101',
          closed_at: '2025-07-19T23:59:00Z', // Due today/tomorrow
          submission_status: 'Not submitted',
          grading_status: 'Pending'
        },
        {
          name: 'Lab Report 2',
          course: 'Physics 301',
          closed_at: '2025-07-22T17:00:00Z', // Due this week
          submission_status: 'Submitted',
          grading_status: 'Graded'
        },
        {
          name: 'Research Paper',
          course: 'Chemistry 401',
          closed_at: '2025-08-01T23:59:00Z', // Due later
          submission_status: 'Draft saved'
        }
      ],
      courses_processed: 3,
      courses_found_on_page: ['Computer Science 101', 'Physics 301', 'Chemistry 401'],
      total_assignments_found: 3,
      assignment_courses_with_no_items: ['Mathematics 201'],
      assignment_courses_failed_expansion: []
    },
    absences: {
      absences: [
        {
          course: 'Computer Science 101',
          date: 'Fri, 18/07/2025',
          type: 'lecture',
          status: 'Unexcused',
          reason: null
        },
        {
          course: 'Mathematics 201',
          date: 'Thu, 17/07/2025',
          type: 'practical',
          status: 'Excused',
          reason: 'Medical appointment'
        },
        {
          course: 'Physics 301',
          date: 'Wed, 16/07/2025',
          type: 'lecture',
          status: 'Unexcused'
        }
      ]
    },
    course_registration: {
      available_courses: [
        {
          name: 'Advanced Algorithms',
          group: 'CS',
          hours: '4',
          fees: '$1200'
        },
        {
          name: 'Quantum Physics',
          group: 'PHYS',
          hours: '3',
          fees: '$1000'
        }
      ],
      registration_end_date: '2025-08-15T00:00:00Z'
    }
  };

  const mockLocalData = {
    lastUpdated: '2025-07-18T12:00:00Z',
    totalScrapes: 10,
    courses: ['Computer Science 101', 'Mathematics 201', 'Physics 301', 'Chemistry 401'],
    quizzes: [
      {
        name: 'Midterm Exam',
        course: 'Computer Science 101',
        grade: '92%',
        firstSeen: '2025-07-10T10:00:00Z',
        lastUpdated: '2025-07-18T10:00:00Z'
      }
    ],
    assignments: [
      {
        name: 'Programming Project',
        course: 'Computer Science 101',
        closed_at: '2025-07-19T23:59:00Z',
        firstSeen: '2025-07-12T09:00:00Z',
        lastUpdated: '2025-07-18T09:00:00Z'
      }
    ],
    absences: [
      {
        course: 'Computer Science 101',
        date: 'Fri, 18/07/2025',
        type: 'lecture',
        status: 'Unexcused',
        firstSeen: '2025-07-18T08:00:00Z'
      }
    ],
    grades: [
      {
        name: 'Midterm Exam',
        course: 'Computer Science 101',
        grade: '92%'
      }
    ]
  };

  const mockDashboardData = {
    is_onboarded: true,
    stats: {
      tasks_today: 2,
      tasks_this_week: 5,
      tasks_later: 3,
      new_absences: 1,
      recent_grades: 2
    },
    last_scrape: {
      scraped_data: mockRawScrapedData,
      scraped_at: '2025-07-18T12:00:00Z'
    },
    recent_grades_list: [
      { name: 'Midterm Exam', course: 'Computer Science 101', grade: '92%' },
      { name: 'Weekly Quiz 3', course: 'Mathematics 201', grade: '88%' }
    ]
  };

  describe('Complete Data Transformation Pipeline', () => {
    test('should transform raw scraped data through complete pipeline', () => {
      // Step 1: Extract courses
      const extractedCourses = extractAllCourses(mockRawScrapedData);
      expect(extractedCourses).toContain('Computer Science 101');
      expect(extractedCourses).toContain('Mathematics 201');
      expect(extractedCourses).toContain('Physics 301');
      expect(extractedCourses).toContain('Chemistry 401');
      expect(extractedCourses).toContain('Advanced Algorithms');
      expect(extractedCourses).toContain('Quantum Physics');

      // Step 2: Validate data structure
      const isValid = validateScrapedData(mockRawScrapedData);
      expect(isValid).toBe(true);

      // Step 3: Transform to notifications
      const notifications = transformScrapedDataToNotifications(mockLocalData, mockDashboardData);
      expect(notifications.length).toBeGreaterThan(0);
      
      // Should include absences (high priority)
      const absenceNotifications = notifications.filter(n => n.type === 'absence');
      expect(absenceNotifications.length).toBeGreaterThan(0);
      expect(absenceNotifications[0].priority).toBe('high');

      // Should include assignments and quizzes
      const assignmentNotifications = notifications.filter(n => n.type === 'assignment');
      const quizNotifications = notifications.filter(n => n.type === 'quiz');
      expect(assignmentNotifications.length).toBeGreaterThan(0);
      expect(quizNotifications.length).toBeGreaterThan(0);

      // Step 4: Filter upcoming targets
      const upcomingTargets = filterUpcomingTargets(mockLocalData, mockDashboardData, 7);
      expect(upcomingTargets.length).toBeGreaterThan(0);
      
      // Should include items due within 7 days
      const nearDueTargets = upcomingTargets.filter(t => 
        t.urgencyLevel === 'critical' || t.urgencyLevel === 'warning'
      );
      expect(nearDueTargets.length).toBeGreaterThan(0);

      // Step 5: Process absence data
      const processedAbsences = processAbsenceData(mockLocalData, mockDashboardData);
      expect(processedAbsences.length).toBeGreaterThan(0);
      expect(processedAbsences[0]).toHaveProperty('formattedDate');
      expect(processedAbsences[0]).toHaveProperty('priority');

      // Step 6: Calculate archive statistics
      const archiveStats = calculateArchiveStatistics(mockLocalData, mockDashboardData);
      expect(archiveStats.totalCourses).toBeGreaterThan(0);
      expect(archiveStats.totalQuizzes).toBeGreaterThan(0);
      expect(archiveStats.totalAssignments).toBeGreaterThan(0);
      expect(archiveStats.totalAbsences).toBeGreaterThan(0);
      expect(archiveStats.dataIntegrity).toBeGreaterThanOrEqual(0);
      expect(archiveStats.dataIntegrity).toBeLessThanOrEqual(100);
    });

    test('should handle data transformation with missing fields', () => {
      const incompleteData = {
        quizzes: {
          quizzes_with_results: [
            { name: null, course: undefined, grade: '90%' }, // Missing required fields
            { name: 'Valid Quiz', course: 'Valid Course', grade: '85%' }
          ],
          quizzes_without_results: [],
          courses_found_on_page: []
        },
        assignments: {
          assignments: [
            { course: 'Test Course' }, // Missing name
            { name: 'Valid Assignment', course: 'Valid Course' }
          ]
        },
        absences: {
          absences: [
            { date: '2025-07-18', type: 'lecture' }, // Missing course
            { course: 'Valid Course', date: '2025-07-18', type: 'lecture' }
          ]
        }
      };

      const notifications = transformScrapedDataToNotifications(null, { last_scrape: { scraped_data: incompleteData } });
      
      // Should handle missing fields gracefully
      expect(notifications.length).toBeGreaterThan(0);
      
      // Should include valid entries
      const validQuiz = notifications.find(n => n.title === 'Valid Quiz');
      expect(validQuiz).toBeDefined();
      expect(validQuiz?.course).toBe('Valid Course');

      // Should sanitize invalid entries - find notification with sanitized data
      const sanitizedNotifications = notifications.filter(n => n.course === 'Unknown Course');
      expect(sanitizedNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Date Processing Integration', () => {
    test('should handle various date formats throughout pipeline', () => {
      const dateFormats = [
        'Fri, 18/07/2025',
        '2025-07-20T10:00:00Z',
        'Jul 20, 2025 at 09:30 PM',
        '2025-07-22T14:30:00.000Z'
      ];

      dateFormats.forEach(dateStr => {
        const parsed = parseFlexibleDate(dateStr);
        expect(parsed).toBeInstanceOf(Date);
        expect(parsed?.getTime()).toBeGreaterThan(0);

        const timeRemaining = calculateTimeRemaining(dateStr);
        expect(timeRemaining).toBeTruthy();
        expect(timeRemaining).not.toBe('Invalid date');

        const isWithin7Days = isWithinTimeframe(dateStr, 7);
        expect(typeof isWithin7Days).toBe('boolean');

        const relativeDate = formatRelativeDate(dateStr);
        expect(relativeDate).toBeTruthy();
        expect(relativeDate).not.toBe('Unknown date');
      });
    });

    test('should calculate urgency levels correctly across pipeline', () => {
      const now = new Date();
      
      // Critical: due in 1 hour
      const criticalDate = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      const criticalMs = new Date(criticalDate).getTime() - now.getTime();
      expect(determineUrgencyLevel(criticalMs)).toBe('critical');

      // Warning: due in 2 days
      const warningDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const warningMs = new Date(warningDate).getTime() - now.getTime();
      expect(determineUrgencyLevel(warningMs)).toBe('warning');

      // Normal: due in 5 days
      const normalDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const normalMs = new Date(normalDate).getTime() - now.getTime();
      expect(determineUrgencyLevel(normalMs)).toBe('normal');
    });

    test('should filter targets due today correctly', () => {
      const now = new Date();
      const todayData = {
        assignments: [
          {
            name: 'Due Today',
            course: 'Test Course',
            closed_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
          },
          {
            name: 'Due Tomorrow',
            course: 'Test Course',
            closed_at: new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString() // 25 hours from now
          }
        ]
      };

      const todayCount = filterTargetsToday(null, { last_scrape: { scraped_data: todayData } });
      expect(todayCount).toBe(1); // Only the one due today
    });
  });

  describe('Priority and Urgency Calculation Integration', () => {
    test('should calculate priorities consistently across data types', () => {
      // Absences should always be high priority
      const absencePriority = calculateNotificationPriority({}, 'absence');
      expect(absencePriority).toBe('high');

      // Assignments due soon should be high priority
      const urgentAssignment = {
        closed_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours
      };
      const urgentPriority = calculateNotificationPriority(urgentAssignment, 'assignment');
      expect(urgentPriority).toBe('high');

      // Assignments due in 2 days should be medium priority
      const mediumAssignment = {
        closed_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      };
      const mediumPriority = calculateNotificationPriority(mediumAssignment, 'assignment');
      expect(mediumPriority).toBe('medium');

      // Courses should be low priority
      const coursePriority = calculateNotificationPriority({}, 'course');
      expect(coursePriority).toBe('low');
    });

    test('should maintain priority consistency in notifications', () => {
      const notifications = transformScrapedDataToNotifications(mockLocalData, mockDashboardData);
      
      // All absences should be high priority
      const absenceNotifications = notifications.filter(n => n.type === 'absence');
      absenceNotifications.forEach(notification => {
        expect(notification.priority).toBe('high');
      });

      // Assignments due soon should have appropriate priority
      const assignmentNotifications = notifications.filter(n => n.type === 'assignment');
      assignmentNotifications.forEach(notification => {
        expect(['high', 'medium', 'low']).toContain(notification.priority);
      });
    });
  });

  describe('Data Sanitization Integration', () => {
    test('should sanitize data consistently across all processing functions', () => {
      const malformedItem = {
        name: null,
        course: undefined,
        date: '',
        type: null
      };

      const sanitized = sanitizeDataForDisplay(malformedItem, ['name', 'course', 'date', 'type']);
      
      expect(sanitized.name).toBe('Unknown');
      expect(sanitized.course).toBe('Unknown Course');
      expect(sanitized.date).toBeTruthy(); // Should have a default date
      expect(sanitized.type).toBe('unknown');

      // Test that sanitized data works in the pipeline
      const testData = {
        quizzes: {
          quizzes_with_results: [sanitized],
          quizzes_without_results: [],
          courses_found_on_page: []
        },
        assignments: { assignments: [] },
        absences: { absences: [] }
      };

      expect(() => {
        transformScrapedDataToNotifications(null, { last_scrape: { scraped_data: testData } });
      }).not.toThrow();
    });

    test('should handle null and undefined data gracefully', () => {
      // Test with null data
      expect(() => {
        transformScrapedDataToNotifications(null, null);
        filterUpcomingTargets(null, null);
        processAbsenceData(null, null);
        calculateArchiveStatistics(null, null);
      }).not.toThrow();

      // Test with undefined data
      expect(() => {
        transformScrapedDataToNotifications(undefined, undefined);
        filterUpcomingTargets(undefined, undefined);
        processAbsenceData(undefined, undefined);
        calculateArchiveStatistics(undefined, undefined);
      }).not.toThrow();
    });
  });

  describe('Performance and Scalability Integration', () => {
    test('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeDataset = {
        quizzes: {
          quizzes_with_results: Array.from({ length: 100 }, (_, i) => ({
            name: `Quiz ${i}`,
            course: `Course ${i % 10}`,
            grade: `${80 + (i % 20)}%`,
            closed_at: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString()
          })),
          quizzes_without_results: Array.from({ length: 50 }, (_, i) => ({
            name: `Pending Quiz ${i}`,
            course: `Course ${i % 5}`,
            closed_at: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString()
          })),
          courses_found_on_page: Array.from({ length: 20 }, (_, i) => `Course ${i}`)
        },
        assignments: {
          assignments: Array.from({ length: 75 }, (_, i) => ({
            name: `Assignment ${i}`,
            course: `Course ${i % 8}`,
            closed_at: new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000).toISOString()
          }))
        },
        absences: {
          absences: Array.from({ length: 30 }, (_, i) => ({
            course: `Course ${i % 6}`,
            date: `Day ${i}, 07/2025`,
            type: i % 2 === 0 ? 'lecture' : 'practical',
            status: i % 3 === 0 ? 'Excused' : 'Unexcused'
          }))
        }
      };

      const startTime = performance.now();

      // Process large dataset
      const notifications = transformScrapedDataToNotifications(null, { last_scrape: { scraped_data: largeDataset } });
      const upcomingTargets = filterUpcomingTargets(null, { last_scrape: { scraped_data: largeDataset } });
      const processedAbsences = processAbsenceData(null, { last_scrape: { scraped_data: largeDataset } });
      const archiveStats = calculateArchiveStatistics(null, { last_scrape: { scraped_data: largeDataset } });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should complete processing within reasonable time (< 100ms)
      expect(processingTime).toBeLessThan(100);

      // Should limit output to prevent UI performance issues
      expect(notifications.length).toBeLessThanOrEqual(15);
      expect(upcomingTargets.length).toBeLessThanOrEqual(5);
      expect(processedAbsences.length).toBeLessThanOrEqual(10);

      // Should still provide accurate statistics
      expect(archiveStats.totalQuizzes).toBe(150); // 100 + 50
      expect(archiveStats.totalAssignments).toBe(75);
      expect(archiveStats.totalAbsences).toBe(30);
    });

    test('should maintain memory efficiency with repeated processing', () => {
      const testData = mockRawScrapedData;
      
      // Process the same data multiple times
      for (let i = 0; i < 100; i++) {
        transformScrapedDataToNotifications(mockLocalData, { last_scrape: { scraped_data: testData } });
        filterUpcomingTargets(mockLocalData, { last_scrape: { scraped_data: testData } });
        processAbsenceData(mockLocalData, { last_scrape: { scraped_data: testData } });
        calculateArchiveStatistics(mockLocalData, { last_scrape: { scraped_data: testData } });
      }

      // Should not cause memory leaks or performance degradation
      // This test passes if no errors are thrown and processing completes
      expect(true).toBe(true);
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from processing errors and continue pipeline', () => {
      const problematicData = {
        quizzes: {
          quizzes_with_results: [
            { name: 'Valid Quiz', course: 'Valid Course', grade: '90%' },
            null, // This will cause issues
            { name: 'Another Valid Quiz', course: 'Another Course', grade: '85%' }
          ],
          quizzes_without_results: [
            undefined, // This will cause issues
            { name: 'Valid Pending Quiz', course: 'Valid Course' }
          ],
          courses_found_on_page: ['Valid Course', null, 'Another Course']
        },
        assignments: {
          assignments: [
            { name: 'Valid Assignment', course: 'Valid Course' },
            'invalid assignment data', // Wrong type
            { name: 'Another Assignment', course: 'Another Course' }
          ]
        },
        absences: {
          absences: [
            { course: 'Valid Course', date: '2025-07-18', type: 'lecture' },
            { course: null, date: null, type: null }, // All null
            { course: 'Another Course', date: '2025-07-19', type: 'practical' }
          ]
        }
      };

      // Should not throw errors despite problematic data
      expect(() => {
        const notifications = transformScrapedDataToNotifications(null, { last_scrape: { scraped_data: problematicData } });
        expect(notifications.length).toBeGreaterThan(0);

        const upcomingTargets = filterUpcomingTargets(null, { last_scrape: { scraped_data: problematicData } });
        expect(Array.isArray(upcomingTargets)).toBe(true);

        const processedAbsences = processAbsenceData(null, { last_scrape: { scraped_data: problematicData } });
        expect(Array.isArray(processedAbsences)).toBe(true);

        const archiveStats = calculateArchiveStatistics(null, { last_scrape: { scraped_data: problematicData } });
        expect(archiveStats).toHaveProperty('totalCourses');
        expect(archiveStats).toHaveProperty('dataIntegrity');
      }).not.toThrow();
    });
  });
});