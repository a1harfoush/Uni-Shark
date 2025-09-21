/**
 * Integration Tests for Data Flow Hooks
 * 
 * Tests the integration between useDashboardData and useLocalScrapeData hooks,
 * including data merging, localStorage persistence, and real-time updates.
 * 
 * Requirements covered: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 4.1
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useLocalScrapeData, mergeScrapeData } from '../useLocalScrapeData';
import { useDashboardData } from '../useDashboardData';
import React from 'react';

// Mock external dependencies
jest.mock('@clerk/nextjs');
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn()
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Test data fixtures
const mockScrapedData = {
  quizzes: {
    courses_processed: 2,
    total_quizzes_found: 3,
    quizzes_with_results: [
      {
        name: 'Quiz 1',
        course: 'Math 101',
        grade: '90%',
        closed_at: '2025-07-20T10:00:00Z'
      }
    ],
    quizzes_without_results: [
      {
        name: 'Quiz 2',
        course: 'Physics 201',
        closed_at: '2025-07-22T14:00:00Z'
      }
    ],
    courses_found_on_page: ['Math 101', 'Physics 201']
  },
  assignments: {
    assignments: [
      {
        name: 'Assignment 1',
        course: 'Math 101',
        closed_at: '2025-07-25T23:59:00Z',
        submission_status: 'Submitted'
      }
    ],
    courses_processed: 1,
    total_assignments_found: 1
  },
  absences: {
    absences: [
      {
        course: 'Math 101',
        date: 'Mon, 21/07/2025',
        type: 'lecture',
        status: 'Unexcused'
      }
    ]
  }
};

const mockDashboardResponse = {
  is_onboarded: true,
  stats: {
    tasks_today: 1,
    tasks_this_week: 3,
    tasks_later: 2,
    new_absences: 1,
    recent_grades: 1
  },
  last_scrape: {
    scraped_data: mockScrapedData,
    scraped_at: '2025-07-18T12:00:00Z'
  },
  recent_grades_list: []
};

// Helper to create test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('Data Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Setup default auth mock
    mockUseAuth.mockReturnValue({
      userId: 'test-user-123',
      isSignedIn: true,
      isLoaded: true,
      getToken: jest.fn().mockResolvedValue('mock-token')
    } as any);

    // Mock fetch for dashboard API
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Data Merging Integration', () => {
    test('should merge new scraped data with existing local data', () => {
      const existingData = {
        lastUpdated: '2025-07-17T10:00:00Z',
        totalScrapes: 2,
        courses: ['Math 101'],
        quizzes: [
          {
            name: 'Old Quiz',
            course: 'Math 101',
            firstSeen: '2025-07-15T10:00:00Z'
          }
        ],
        assignments: [],
        absences: [],
        grades: []
      };

      const newData = {
        quizzes: {
          quizzes_with_results: [
            {
              name: 'New Quiz',
              course: 'Physics 201',
              grade: '85%'
            }
          ],
          quizzes_without_results: [],
          courses_found_on_page: ['Physics 201']
        },
        assignments: { assignments: [] },
        absences: { absences: [] }
      };

      const merged = mergeScrapeData(existingData, newData);

      expect(merged.totalScrapes).toBe(3);
      expect(merged.courses).toContain('Math 101');
      expect(merged.courses).toContain('Physics 201');
      expect(merged.quizzes).toHaveLength(2);
      expect(merged.quizzes.find(q => q.name === 'Old Quiz')).toBeDefined();
      expect(merged.quizzes.find(q => q.name === 'New Quiz')).toBeDefined();
    });

    test('should prevent duplicate processing of same scrape data', () => {
      const wrapper = createWrapper();
      
      const { result, rerender } = renderHook(
        () => useLocalScrapeData(mockDashboardResponse),
        { wrapper }
      );

      act(() => {
        // First render should process the data
        rerender();
      });

      const firstResult = result.current;

      act(() => {
        // Second render with same data should not reprocess
        rerender();
      });

      expect(result.current).toBe(firstResult);
    });

    test('should handle incremental data updates', () => {
      const initialData = {
        quizzes: {
          quizzes_with_results: [
            { name: 'Quiz 1', course: 'Math 101', grade: '90%' }
          ],
          quizzes_without_results: [],
          courses_found_on_page: ['Math 101']
        },
        assignments: { assignments: [] },
        absences: { absences: [] }
      };

      const incrementalData = {
        quizzes: {
          quizzes_with_results: [
            { name: 'Quiz 1', course: 'Math 101', grade: '95%' }, // Updated grade
            { name: 'Quiz 2', course: 'Physics 201', grade: '88%' } // New quiz
          ],
          quizzes_without_results: [],
          courses_found_on_page: ['Math 101', 'Physics 201']
        },
        assignments: { assignments: [] },
        absences: { absences: [] }
      };

      const firstMerge = mergeScrapeData({}, initialData);
      const secondMerge = mergeScrapeData(firstMerge, incrementalData);

      expect(secondMerge.quizzes).toHaveLength(2);
      expect(secondMerge.courses).toContain('Math 101');
      expect(secondMerge.courses).toContain('Physics 201');
      
      // Should update existing quiz grade
      const updatedQuiz = secondMerge.quizzes.find(q => q.name === 'Quiz 1');
      expect(updatedQuiz.grade).toBe('95%');
    });
  });

  describe('Local Storage Persistence Integration', () => {
    test('should persist merged data to localStorage', () => {
      const wrapper = createWrapper();
      
      renderHook(
        () => useLocalScrapeData(mockDashboardResponse),
        { wrapper }
      );

      // Check that data was stored in localStorage
      const storedData = localStorage.getItem('userScrapeData_test-user-123');
      expect(storedData).toBeTruthy();
      
      const parsedData = JSON.parse(storedData!);
      expect(parsedData.totalScrapes).toBe(1);
      expect(parsedData.courses).toContain('Math 101');
      expect(parsedData.courses).toContain('Physics 201');
    });

    test('should load existing data from localStorage on initialization', () => {
      const existingData = {
        lastUpdated: '2025-07-17T10:00:00Z',
        totalScrapes: 5,
        courses: ['Existing Course'],
        quizzes: [],
        assignments: [],
        absences: [],
        grades: []
      };

      localStorage.setItem('userScrapeData_test-user-123', JSON.stringify(existingData));

      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useLocalScrapeData(null), // No new data
        { wrapper }
      );

      expect(result.current).toEqual(existingData);
    });

    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('localStorage full');
      });

      const wrapper = createWrapper();
      
      expect(() => {
        renderHook(
          () => useLocalScrapeData(mockDashboardResponse),
          { wrapper }
        );
      }).not.toThrow();

      // Restore original localStorage
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Real-time Updates Integration', () => {
    test('should update local data when new remote data arrives', async () => {
      const wrapper = createWrapper();
      
      const { result, rerender } = renderHook(
        ({ remoteData }) => useLocalScrapeData(remoteData),
        { 
          wrapper,
          initialProps: { remoteData: null }
        }
      );

      // Initially no data
      expect(result.current).toBeNull();

      // Update with new remote data
      act(() => {
        rerender({ remoteData: mockDashboardResponse });
      });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
        expect(result.current.totalScrapes).toBe(1);
        expect(result.current.courses).toContain('Math 101');
      });
    });

    test('should handle rapid successive updates', async () => {
      const wrapper = createWrapper();
      
      const { result, rerender } = renderHook(
        ({ remoteData }) => useLocalScrapeData(remoteData),
        { 
          wrapper,
          initialProps: { remoteData: null }
        }
      );

      // First update
      const firstUpdate = {
        ...mockDashboardResponse,
        last_scrape: {
          scraped_data: {
            ...mockScrapedData,
            quizzes: {
              ...mockScrapedData.quizzes,
              quizzes_with_results: [
                { name: 'Quiz A', course: 'Course A', grade: '90%' }
              ]
            }
          }
        }
      };

      act(() => {
        rerender({ remoteData: firstUpdate });
      });

      // Second update
      const secondUpdate = {
        ...mockDashboardResponse,
        last_scrape: {
          scraped_data: {
            ...mockScrapedData,
            quizzes: {
              ...mockScrapedData.quizzes,
              quizzes_with_results: [
                { name: 'Quiz A', course: 'Course A', grade: '90%' },
                { name: 'Quiz B', course: 'Course B', grade: '85%' }
              ]
            }
          }
        }
      };

      act(() => {
        rerender({ remoteData: secondUpdate });
      });

      await waitFor(() => {
        expect(result.current.quizzes).toHaveLength(2);
        expect(result.current.totalScrapes).toBe(2);
      });
    });
  });

  describe('Cross-Hook Data Consistency', () => {
    test('should maintain consistency between dashboard and local data hooks', async () => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardResponse
      });

      const wrapper = createWrapper();
      
      const { result: dashboardResult } = renderHook(
        () => useDashboardData(),
        { wrapper }
      );

      const { result: localResult } = renderHook(
        () => useLocalScrapeData(mockDashboardResponse),
        { wrapper }
      );

      await waitFor(() => {
        expect(dashboardResult.current.dashboardData).toBeTruthy();
      });

      // Local data should be consistent with dashboard data
      expect(localResult.current.courses).toContain('Math 101');
      expect(localResult.current.courses).toContain('Physics 201');
      
      // Both should reference the same underlying scraped data
      const dashboardCourses = dashboardResult.current.dashboardData?.last_scrape?.scraped_data?.quizzes?.courses_found_on_page || [];
      expect(localResult.current.courses).toEqual(expect.arrayContaining(dashboardCourses));
    });

    test('should handle authentication state changes', async () => {
      const wrapper = createWrapper();
      
      const { result, rerender } = renderHook(
        () => useLocalScrapeData(mockDashboardResponse),
        { wrapper }
      );

      // Initially authenticated
      expect(result.current).toBeTruthy();

      // Change auth state to unauthenticated
      mockUseAuth.mockReturnValue({
        userId: null,
        isSignedIn: false,
        isLoaded: true,
        getToken: jest.fn()
      } as any);

      act(() => {
        rerender();
      });

      // Should clear local data when user is not authenticated
      expect(result.current).toBeNull();
    });
  });

  describe('Data Processing Pipeline Integration', () => {
    test('should process complex nested data structures', () => {
      const complexData = {
        quizzes: {
          quizzes_with_results: [
            {
              name: 'Complex Quiz',
              course: 'Advanced Math',
              grade: '92%',
              details: {
                attempts: 2,
                time_spent: '45 minutes'
              }
            }
          ],
          quizzes_without_results: [],
          courses_found_on_page: ['Advanced Math'],
          quiz_courses_with_no_items: [],
          quiz_courses_failed_expansion: []
        },
        assignments: {
          assignments: [
            {
              name: 'Complex Assignment',
              course: 'Advanced Math',
              closed_at: '2025-07-30T23:59:00Z',
              submission_status: 'Submitted',
              metadata: {
                file_count: 3,
                submission_time: '2025-07-29T20:30:00Z'
              }
            }
          ],
          courses_processed: 1,
          total_assignments_found: 1,
          assignment_courses_with_no_items: [],
          assignment_courses_failed_expansion: []
        },
        absences: {
          absences: [
            {
              course: 'Advanced Math',
              date: 'Wed, 23/07/2025',
              type: 'lecture',
              status: 'Excused',
              reason: 'Medical appointment'
            }
          ]
        },
        course_registration: {
          available_courses: [
            {
              name: 'Advanced Math',
              group: 'MATH',
              hours: '4',
              fees: '$800'
            }
          ],
          registration_end_date: '2025-08-15T00:00:00Z'
        }
      };

      const merged = mergeScrapeData({}, complexData);

      expect(merged.courses).toContain('Advanced Math');
      expect(merged.quizzes).toHaveLength(1);
      expect(merged.assignments).toHaveLength(1);
      expect(merged.absences).toHaveLength(1);
      expect(merged.course_registration).toEqual(complexData.course_registration);
    });

    test('should maintain data integrity during multiple merge operations', () => {
      let currentData = {};

      // Simulate multiple scrape operations
      const scrapeOperations = [
        {
          quizzes: {
            quizzes_with_results: [
              { name: 'Quiz 1', course: 'Math', grade: '85%' }
            ],
            quizzes_without_results: [],
            courses_found_on_page: ['Math']
          },
          assignments: { assignments: [] },
          absences: { absences: [] }
        },
        {
          quizzes: {
            quizzes_with_results: [
              { name: 'Quiz 2', course: 'Physics', grade: '90%' }
            ],
            quizzes_without_results: [],
            courses_found_on_page: ['Physics']
          },
          assignments: {
            assignments: [
              { name: 'Assignment 1', course: 'Physics', closed_at: '2025-07-25T23:59:00Z' }
            ]
          },
          absences: { absences: [] }
        },
        {
          quizzes: {
            quizzes_with_results: [],
            quizzes_without_results: [],
            courses_found_on_page: []
          },
          assignments: { assignments: [] },
          absences: {
            absences: [
              { course: 'Math', date: '2025-07-20', type: 'lecture', status: 'Unexcused' }
            ]
          }
        }
      ];

      scrapeOperations.forEach(operation => {
        currentData = mergeScrapeData(currentData, operation);
      });

      // Verify data integrity
      expect(currentData.totalScrapes).toBe(3);
      expect(currentData.courses).toContain('Math');
      expect(currentData.courses).toContain('Physics');
      expect(currentData.quizzes).toHaveLength(2);
      expect(currentData.assignments).toHaveLength(1);
      expect(currentData.absences).toHaveLength(1);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from corrupted localStorage data', () => {
      // Store corrupted data in localStorage
      localStorage.setItem('userScrapeData_test-user-123', 'invalid json');

      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useLocalScrapeData(mockDashboardResponse),
        { wrapper }
      );

      // Should handle corrupted data and process new data
      expect(result.current).toBeTruthy();
      expect(result.current.totalScrapes).toBe(1);
    });

    test('should handle network failures gracefully', async () => {
      // Mock network failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useDashboardData(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeTruthy();
      });

      // Should not crash the application
      expect(result.current.dashboardData).toBeUndefined();
    });

    test('should handle malformed API responses', async () => {
      // Mock malformed response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      });

      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useDashboardData(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.dashboardData).toEqual({ invalid: 'response' });
      });

      // Local data hook should handle malformed data gracefully
      const { result: localResult } = renderHook(
        () => useLocalScrapeData({ invalid: 'response' }),
        { wrapper }
      );

      expect(() => localResult.current).not.toThrow();
    });
  });
});